// src/hooks/useMonsterEngine.ts
// 몬스터/보스 관련 상태 및 로직을 담당하는 훅

import { useState } from "react";
import type {
  PlayerStats,
  CharacterStats,
  BossStats,
  LogMessage,
} from "../game/types";
import { skills as allSkills, dungeons, bossDungeons, createBoss } from "../game/constants";
import { bossRewardPool, normalDropPool } from "../game/engineConstants";
import { getRandom } from "../game/utils";
import { checkLevelUp, getEffectivePlayerStats } from "../game/playerLogic";
import { makeMonster } from "../game/monsterLogic";
import { calculateAttack } from "../game/battleLogic";
import { tickSkills } from "../game/skillLogic";
import { applyPetStartOfTurn } from "../game/petLogic";

// useMonsterEngine이 외부(useGameEngine)로 노출할 인터페이스
export interface MonsterEngineActions {
  monster: CharacterStats | null;
  boss: BossStats | null;
  isScarecrowBattle: boolean;
  scarecrowConfig: { maxHp: number; atk: number; def: number; luk: number } | null;
  dungeonSessionKills: number;
  setMonster: React.Dispatch<React.SetStateAction<CharacterStats | null>>;
  setBoss: React.Dispatch<React.SetStateAction<BossStats | null>>;
  setIsScarecrowBattle: React.Dispatch<React.SetStateAction<boolean>>;
  setScarecrowConfig: React.Dispatch<
    React.SetStateAction<{ maxHp: number; atk: number; def: number; luk: number } | null>
  >;
  setDungeonSessionKills: React.Dispatch<React.SetStateAction<number>>;
  runMonsterTurn: (currentPlayer: PlayerStats, currentMonster: CharacterStats) => void;
  runBossTurn: (currentPlayer: PlayerStats, currentBoss: BossStats) => void;
  handleBattleEnd: (
    type: "victory" | "defeat" | "escape",
    updatedPlayer: PlayerStats,
    targetMonster?: CharacterStats
  ) => void;
  handleBossBattleEnd: (
    type: "victory" | "defeat" | "escape",
    updatedPlayer: PlayerStats,
    targetBoss?: BossStats
  ) => void;
  handleNextDungeon: (selectedDungeon?: (typeof dungeons)[number]) => void;
  handleSelectBossDungeon: (bossDungeonId: string) => void;
}

export const useMonsterEngine = (deps: {
  player: PlayerStats | null;
  isProcessing: boolean;
  currentDungeonId: string | null;
  currentBossDungeonId: string | null;
  bossCooldowns: Record<string, number>;
  dungeonKillCounts: Record<string, number>;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerStats | null>>;
  setGameState: (state: any) => void;
  setIsPlayerTurn: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  setConsecutiveMisses: (v: number) => void;
  setRecoveryCharges: (v: number) => void;
  setShowBattleChoice: (v: boolean) => void;
  setCurrentDungeonId: (v: string | null) => void;
  setCurrentBossDungeonId: (v: string | null) => void;
  setBossCooldowns: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setDungeonKillCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setBossReward: (v: any) => void;
  addLog: (msg: string, type?: any) => void;
  addLogs: (logs: Omit<LogMessage, "id">[]) => void;
}): MonsterEngineActions => {
  const {
    player, isProcessing, currentDungeonId, currentBossDungeonId,
    bossCooldowns, dungeonKillCounts,
    setPlayer, setGameState, setIsPlayerTurn, setIsProcessing,
    setConsecutiveMisses, setRecoveryCharges, setShowBattleChoice,
    setCurrentDungeonId, setCurrentBossDungeonId,
    setBossCooldowns, setDungeonKillCounts, setBossReward,
    addLog, addLogs,
  } = deps;

  const [monster, setMonster] = useState<CharacterStats | null>(null);
  const [boss, setBoss] = useState<BossStats | null>(null);
  const [isScarecrowBattle, setIsScarecrowBattle] = useState(false);
  const [scarecrowConfig, setScarecrowConfig] = useState<{
    maxHp: number; atk: number; def: number; luk: number;
  } | null>(null);
  const [dungeonSessionKills, setDungeonSessionKills] = useState(0);

  // =========================================================================
  // ⚠️  선언 순서 중요: const 함수는 호이스팅이 안 됩니다.
  //     호출되는 함수는 반드시 호출하는 함수보다 먼저 선언되어야 합니다.
  //
  //  1. handleNextDungeon   (handleBattleEnd 안 setTimeout에서 호출)
  //  2. handleBattleEnd     (_transitionHelper 안에서 호출)
  //  3. handleBossBattleEnd (runBossTurn 안에서 호출)
  //  4. _transitionHelper   (runMonsterTurn 안에서 호출)
  //  5. runMonsterTurn
  //  6. runBossTurn
  //  7. handleSelectBossDungeon
  // =========================================================================

  // 1. handleNextDungeon
  const handleNextDungeon = (selectedDungeon?: (typeof dungeons)[number]) => {
    if (isProcessing || !player) return;

    const dungeon = selectedDungeon || dungeons.find((d) => d.id === currentDungeonId);
    if (!dungeon) {
      addLog("🚫 입장할 던전을 찾을 수 없습니다.", "fail");
      setGameState("dungeonSelect");
      return;
    }

    addLog("🧭 던전 안을 향해 들어가본다...");
    setIsProcessing(true);
    setGameState("battle");
    setShowBattleChoice(false);

    const killCount = dungeonKillCounts[dungeon.id] || 0;
    const shouldSpawnNamedMonster = killCount > 0 && killCount % 5 === 0;

    setTimeout(() => {
      let newMonster: CharacterStats;
      if (shouldSpawnNamedMonster) {
        const base = makeMonster(dungeon.monsterLevelOffset);
        newMonster = {
          ...base,
          name: `[네임드] ${base.name}`,
          hp: Math.floor(base.hp * 1.5),
          maxHp: Math.floor(base.hp * 1.5),
          atk: Math.floor(base.atk * 1.2),
          def: Math.floor(base.def * 1.2),
        };
        addLog(`✨ [${newMonster.name}] (이)가 나타났다!`, "appear");
      } else {
        newMonster = makeMonster(dungeon.monsterLevelOffset);
        addLog(`👻 ${newMonster.name} (이)가 나타났다!`, "appear");
      }
      setMonster(newMonster);
      setBoss(null);

      if (getRandom(1, 100) <= 50) {
        addLog(`😁 선빵필승! 먼저 공격합니다.`, "normal");
        setIsPlayerTurn(true);
        setIsProcessing(false);
      } else {
        addLog(`😰 칫! 기습인가? 몬스터가 먼저 공격합니다.`, "fail");
        setIsPlayerTurn(false);
        // setTimeout 콜백 실행 시점엔 runMonsterTurn이 이미 선언된 상태
        runMonsterTurn(player, newMonster);
      }
    }, 1000);
  };

  // 2. handleBattleEnd
  const handleBattleEnd = (
    type: "victory" | "defeat" | "escape",
    updatedPlayer: PlayerStats,
    targetMonster?: CharacterStats
  ) => {
    // 허수아비 전투 특별 처리
    if (isScarecrowBattle && targetMonster) {
      if (type === "victory") {
        addLog(`🎯 허수아비를 물리쳤습니다!`, "vic");
        const restored: CharacterStats = {
          ...targetMonster,
          hp: scarecrowConfig?.maxHp || targetMonster.maxHp,
        };
        setMonster(restored);
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(updatedPlayer);
        const { player: p, monster: m, logs } = applyPetStartOfTurn(ticked, restored, getEffectivePlayerStats);
        addLogs(logs);
        setPlayer(p);
        setMonster(m);
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      } else if (type === "defeat") {
        addLog(`😊 허수아비에게 패배했습니다. 체력이 회복됩니다.`, "normal");
        setPlayer({ ...updatedPlayer, hp: updatedPlayer.maxHp });
        const restored: CharacterStats = {
          ...targetMonster,
          hp: scarecrowConfig?.maxHp || targetMonster.maxHp,
        };
        setMonster(restored);
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }
    }

    setConsecutiveMisses(0);
    setRecoveryCharges(5);
    let p = { ...updatedPlayer };
    const logs: Omit<LogMessage, "id">[] = [];
    let didDropItem = false;

    if (type === "victory" && targetMonster) {
      logs.push({ msg: `🎉 전투에서 승리했다! ${targetMonster.name}을(를) 물리쳤다.`, type: "vic" });
      p.vicCount += 1;
      setDungeonSessionKills((prev) => prev + 1);

      if (getRandom(1, 100) <= 5 && normalDropPool.length > 0) {
        didDropItem = true;
        const item = normalDropPool[getRandom(0, normalDropPool.length - 1)];
        const owned = item.type === "weapon" ? p.ownedWeaponIds || [] : p.ownedArmorIds || [];
        const isDuplicate = owned.includes(item.id);
        const isUsable =
          (!item.allowedJobs || item.allowedJobs.includes(p.job)) &&
          (!item.requiredLevel || p.level >= item.requiredLevel);
        setBossReward({ item, isDuplicate, isUsable, sellPrice: Math.floor(item.price * 0.5) });
        setGameState("normalDrop");
        setShowBattleChoice(false);
        logs.push({ msg: `🎁 몬스터가 [${item.name}]을(를) 떨어뜨렸습니다!`, type: "lvup" });
      }

      if (currentDungeonId) {
        const newCount = (dungeonKillCounts[currentDungeonId] || 0) + 1;
        setDungeonKillCounts((prev) => ({ ...prev, [currentDungeonId!]: newCount }));
        localStorage.setItem(
          "dungeonKillCounts",
          JSON.stringify({ ...dungeonKillCounts, [currentDungeonId]: newCount })
        );
      }

      const gainedExp = getRandom(5, 30) + targetMonster.level * 60;
      const gainedGold = getRandom(10, 50) + targetMonster.level * 30;
      p.exp += gainedExp;
      p.money += gainedGold;
      logs.push({ msg: `👑 ${gainedExp} Exp를 획득했다.`, type: "gainExp" });
      logs.push({ msg: `💰 ${gainedGold} Gold를 획득했다.`, type: "gainMoney" });

      const lvResult = checkLevelUp(p);
      p = lvResult.newPlayer;
      logs.push(...lvResult.logs);
    } else if (type === "defeat") {
      logs.push({ msg: `☠️ 전투에서 패배했다...`, type: "def" });
      p.defCount += 1;
      p.exp = Math.floor(p.exp * 0.7);
      p.hp = p.maxHp;
      p.activeBuffs = [];
      p.skillCooldowns = {};
      p.isDefending = false;
      logs.push({ msg: `😥 잠시 쉬고 일어나 체력을 모두 회복했다.`, type: "normal" });
    } else if (type === "escape") {
      logs.push({ msg: `💨 전투에서 도망쳤다...`, type: "fail" });
    }

    addLogs(logs);
    setPlayer(p);
    setMonster(null);
    setBoss(null);
    setIsProcessing(false);
    setIsPlayerTurn(true);

    if (type === "victory") {
      if (!didDropItem) {
        if ((dungeonSessionKills + 1) % 10 === 0) {
          setShowBattleChoice(true);
          addLog(`🛑 10회 사냥 달성! 정비를 위해 잠시 멈춥니다.`, "normal");
        } else {
          addLog(`⏩ 계속 나아가는 중... (${dungeonSessionKills + 1}/10)`, "normal");
          setTimeout(() => { handleNextDungeon(); }, 800);
        }
      }
    } else {
      setGameState("dungeon");
      setCurrentDungeonId(null);
    }
  };

  // 3. handleBossBattleEnd
  const handleBossBattleEnd = (
    type: "victory" | "defeat" | "escape",
    updatedPlayer: PlayerStats,
    targetBoss?: BossStats
  ) => {
    setConsecutiveMisses(0);
    setRecoveryCharges(5);
    let p = { ...updatedPlayer };
    const logs: Omit<LogMessage, "id">[] = [];
    let didDropItem = false;

    if (type === "victory" && targetBoss && currentBossDungeonId) {
      logs.push({ msg: `🎉 보스 전투에서 승리했다! ${targetBoss.name}을(를) 물리쳤다.`, type: "vic" });
      p.vicCount += 1;

      const gainedExp = getRandom(100, 300) + targetBoss.level * 200;
      const gainedGold = getRandom(200, 500) + targetBoss.level * 100;
      p.exp += gainedExp;
      p.money += gainedGold;
      logs.push({ msg: `👑 ${gainedExp} Exp를 획득했다.`, type: "gainExp" });
      logs.push({ msg: `💰 ${gainedGold} Gold를 획득했다.`, type: "gainMoney" });

      const lvResult = checkLevelUp(p);
      p = lvResult.newPlayer;
      logs.push(...lvResult.logs);

      if (getRandom(1, 100) <= 30 && bossRewardPool.length > 0) {
        didDropItem = true;
        const item = bossRewardPool[getRandom(0, bossRewardPool.length - 1)];
        const owned = item.type === "weapon" ? p.ownedWeaponIds || [] : p.ownedArmorIds || [];
        const isDuplicate = owned.includes(item.id);
        const isUsable =
          (!item.allowedJobs || item.allowedJobs.includes(p.job)) &&
          (!item.requiredLevel || p.level >= item.requiredLevel);
        setBossReward({ item, isDuplicate, isUsable, sellPrice: Math.floor(item.price * 0.5) });
        setGameState("bossReward");
        setShowBattleChoice(false);
        logs.push({ msg: `🎁 [보스 드롭] ${item.name} 획득!`, type: "lvup" });
      } else {
        logs.push({ msg: `💨 아쉽지만, 특별한 아이템은 나오지 않았습니다...`, type: "fail" });
      }

      const newCooldowns = { ...bossCooldowns, [currentBossDungeonId]: Date.now() + 60 * 60 * 1000 };
      setBossCooldowns(newCooldowns);
      localStorage.setItem("bossCooldowns", JSON.stringify(newCooldowns));
    } else if (type === "defeat") {
      logs.push({ msg: `☠️ 보스 전투에서 패배했다...`, type: "def" });
      p.defCount += 1;
      p.exp = Math.floor(p.exp * 0.7);
      p.hp = p.maxHp;
      p.activeBuffs = [];
      p.skillCooldowns = {};
      p.isDefending = false;
      logs.push({ msg: `😥 잠시 쉬고 일어나 체력을 모두 회복했다.`, type: "normal" });
    } else if (type === "escape") {
      logs.push({ msg: `💨 보스 전투에서 도망쳤다...`, type: "fail" });
    }

    addLogs(logs);
    setPlayer(p);
    setBoss(null);
    setMonster(null);
    setIsProcessing(false);
    setIsPlayerTurn(true);

    if (type === "victory" && !didDropItem) {
      setShowBattleChoice(false);
      setGameState("dungeon");
      setCurrentBossDungeonId(null);
      setPlayer({ ...p, activeBuffs: [], skillCooldowns: {}, isDefending: false });
    } else if (type !== "victory") {
      setShowBattleChoice(false);
      setGameState("dungeon");
      setCurrentBossDungeonId(null);
    }
    // (승리 && 아이템 드롭 시: GameState는 'bossReward', handleBossRewardAction에서 처리)
  };

  // 4. 내부 헬퍼 (handleBattleEnd가 위에 선언된 후)
  // applyPetStartOfTurn의 monster 반환값이 CharacterStats | null 이므로 null 허용
  const _transitionToPlayerTurnAfterMonsterEnd = (
    currentPlayer: PlayerStats,
    currentMonster: CharacterStats | null
  ): boolean => {
    if (!currentMonster) return false;
    if (isScarecrowBattle && currentMonster.hp <= 0) {
      addLog(`🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`, "vic");
      const restored: CharacterStats = {
        ...currentMonster,
        hp: scarecrowConfig?.maxHp || currentMonster.maxHp,
      };
      setMonster(restored);
      setIsPlayerTurn(true);
      setIsProcessing(false);
      return true;
    }
    if (currentMonster.hp <= 0) {
      handleBattleEnd("victory", currentPlayer, currentMonster);
      setIsProcessing(false);
      return true;
    }
    return false;
  };

  // 5. runMonsterTurn
  const runMonsterTurn = (currentPlayer: PlayerStats, currentMonster: CharacterStats) => {
    setIsProcessing(true);

    setTimeout(() => {
      if (!player) { setIsProcessing(false); return; }

      addLog(`--- 몬스터의 턴 ---`, "normal");

      // 기절 체크
      if ((currentPlayer.monsterStunnedTurns || 0) > 0) {
        addLog(`💫 적이 기절하여 행동할 수 없다!`, "fail");
        const next = { ...currentPlayer, monsterStunnedTurns: (currentPlayer.monsterStunnedTurns || 0) - 1 };
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(next);
        const { player: p, monster: m, logs } = applyPetStartOfTurn(ticked, currentMonster, getEffectivePlayerStats);
        addLogs(logs); setPlayer(p); setMonster(m);
        if (_transitionToPlayerTurnAfterMonsterEnd(p, m)) return;
        setIsPlayerTurn(true); setIsProcessing(false); return;
      }

      // 배리어 체크
      const barrierIdx = (currentPlayer.activeBuffs || []).findIndex((b) => b.barrier);
      if (barrierIdx >= 0) {
        const skillName = currentPlayer.activeBuffs![barrierIdx].key;
        addLog(`🛡️ [${skillName}] 스킬이 몬스터의 공격을 무효화했다!`, "vic");
        const nextBuffs = [...(currentPlayer.activeBuffs || [])];
        nextBuffs.splice(barrierIdx, 1);
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills({ ...currentPlayer, activeBuffs: nextBuffs });
        const { player: p, monster: m, logs } = applyPetStartOfTurn(ticked, currentMonster, getEffectivePlayerStats);
        addLogs(logs); setPlayer(p); setMonster(m);
        if (_transitionToPlayerTurnAfterMonsterEnd(p, m)) return;
        setIsPlayerTurn(true); setIsProcessing(false); return;
      }

      // 회피 체크
      if ((currentPlayer.activeBuffs || []).some((b) => b.evadeAll)) {
        addLog(`🍃 스킬 효과로 몬스터의 공격을 회피했다!`, "vic");
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(currentPlayer);
        const { player: p, monster: m, logs } = applyPetStartOfTurn(ticked, currentMonster, getEffectivePlayerStats);
        addLogs(logs); setPlayer(p); setMonster(m);
        if (_transitionToPlayerTurnAfterMonsterEnd(p, m)) return;
        setIsPlayerTurn(true); setIsProcessing(false); return;
      }

      // 약화 적용
      const weaken = (currentPlayer.activeBuffs || []).find((b) => (b.weakenPercent || 0) > 0)?.weakenPercent || 0;
      const attacker = weaken > 0
        ? { ...currentMonster, atk: Math.max(1, Math.floor(currentMonster.atk * (1 - weaken))) }
        : currentMonster;

      const result = calculateAttack(attacker, getEffectivePlayerStats(currentPlayer));
      addLogs(result.logs);

      let updatedPlayer = { ...currentPlayer, hp: result.defender.hp, isDefending: false };
      let updatedMonster = { ...currentMonster };

      // 반사
      const reflect = (currentPlayer.activeBuffs || []).find((b) => (b.reflectPercent || 0) > 0)?.reflectPercent || 0;
      const lastLog = result.logs[result.logs.length - 1];
      const dmgMatch = lastLog?.msg.match(/(\d+)의 데미지를/);
      const dealt = dmgMatch ? parseInt(dmgMatch[1], 10) : 0;
      if (reflect > 0 && dealt > 0) {
        const reflectDmg = Math.floor(dealt * reflect);
        updatedMonster.hp = Math.max(0, updatedMonster.hp - reflectDmg);
        addLog(`🔄 스킬 효과로 ${reflectDmg}의 피해를 반사! (적 HP: ${updatedMonster.hp})`, "vic");
        setMonster(updatedMonster);
      }

      if (result.isBattleOver) {
        handleBattleEnd("defeat", updatedPlayer, currentMonster);
      } else {
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(updatedPlayer);
        const { player: p, monster: m, logs } = applyPetStartOfTurn(ticked, updatedMonster, getEffectivePlayerStats);
        addLogs(logs); setPlayer(p); setMonster(m);
        if (_transitionToPlayerTurnAfterMonsterEnd(p, m)) return;
        setIsPlayerTurn(true); setIsProcessing(false);
      }
    }, 1500);
  };

  // 6. runBossTurn
  const runBossTurn = (currentPlayer: PlayerStats, currentBoss: BossStats) => {
    setIsProcessing(true);

    setTimeout(() => {
      if (!currentPlayer) { setIsProcessing(false); return; }

      addLog(`--- 몬스터의 턴 ---`, "normal");
      let updatedBoss = tickSkills(currentBoss) as BossStats;

      // 보스 턴 → 플레이어 턴 전환 헬퍼 (내부 클로저 — handleBossBattleEnd가 위에 선언됨)
      const toBossPlayerTurn = (p: PlayerStats, b: BossStats) => {
        const { player: pAfter, monster: bAfter, logs } = applyPetStartOfTurn(p, b, getEffectivePlayerStats);
        addLogs(logs);
        setPlayer(pAfter);
        setBoss(bAfter as BossStats);
        if (bAfter && bAfter.hp <= 0) {
          handleBossBattleEnd("victory", pAfter, bAfter as BossStats);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
      };

      // 기절 체크
      if ((currentPlayer.monsterStunnedTurns || 0) > 0) {
        addLog(`💫 적이 기절하여 행동할 수 없다!`, "fail");
        const next = { ...currentPlayer, monsterStunnedTurns: (currentPlayer.monsterStunnedTurns || 0) - 1 };
        addLog(`--- 플레이어의 턴 ---`, "normal");
        toBossPlayerTurn(tickSkills(next) as PlayerStats, updatedBoss);
        return;
      }

      // 배리어 체크
      const barrierIdx = (currentPlayer.activeBuffs || []).findIndex((b) => b.barrier);
      if (barrierIdx >= 0) {
        const skillName = currentPlayer.activeBuffs![barrierIdx].key;
        addLog(`🛡️ [${skillName}] 스킬이 보스의 공격을 무효화했다!`, "vic");
        const nextBuffs = [...(currentPlayer.activeBuffs || [])];
        nextBuffs.splice(barrierIdx, 1);
        addLog(`--- 플레이어의 턴 ---`, "normal");
        toBossPlayerTurn(tickSkills({ ...currentPlayer, activeBuffs: nextBuffs }) as PlayerStats, updatedBoss);
        return;
      }

      // 회피 체크
      if ((currentPlayer.activeBuffs || []).some((b) => b.evadeAll)) {
        addLog(`🍃 스킬 효과로 보스의 공격을 회피했다!`, "vic");
        addLog(`--- 플레이어의 턴 ---`, "normal");
        toBossPlayerTurn(tickSkills(currentPlayer) as PlayerStats, updatedBoss);
        return;
      }

      // 보스 스킬 사용 결정
      const skillKeySet = new Set(allSkills.map((s) => s.key));
      const validSkills = (updatedBoss.skills || []).filter((k) => skillKeySet.has(k as any));
      const readySkills = validSkills.filter((k) => ((updatedBoss.skillCooldowns || {})[k] || 0) <= 0);
      let usedSkillKey: string | false = false;

      if (readySkills.length > 0 && getRandom(1, 100) <= 50) {
        const skillKey = readySkills[getRandom(0, readySkills.length - 1)];
        const skill = allSkills.find((s) => s.key === skillKey);

        if (!skill) {
          addLog(`⚡ 보스가 치트를 쓰려다가 천벌을 받았습니다!`, "cri");
          const penalty = Math.floor(updatedBoss.hp / 2);
          updatedBoss.hp = Math.max(1, updatedBoss.hp - penalty);
          addLog(`⚡ 천벌로 인해 보스의 체력이 절반 줄어듭니다! (-${penalty})`, "vic");
          setBoss(updatedBoss);
          addLog(`--- 플레이어의 턴 ---`, "normal");
          toBossPlayerTurn(tickSkills(currentPlayer) as PlayerStats, updatedBoss);
          return;
        }

        usedSkillKey = skillKey;
        addLog(`👹 ${currentBoss.name}의 스킬! [${skill.name}]!`, "cri");
        updatedBoss.skillCooldowns = { ...(updatedBoss.skillCooldowns || {}), [skillKey]: skill.cooldown };

        if (skill.kind === "attack") {
          const damage = Math.floor(updatedBoss.atk * (skill.damageMultiplier || 1.0) * (getRandom(90, 110) / 100));
          const defense = getEffectivePlayerStats(currentPlayer).def;
          let finalDamage = Math.max(Math.floor(damage * 0.1), damage - defense);
          if (currentPlayer.isDefending) {
            finalDamage = Math.floor(finalDamage * 0.5);
            addLog(`🛡️ 방어 태세로 데미지를 줄였습니다!`, "normal");
          }
          const newHp = currentPlayer.hp - finalDamage;
          addLog(`💥 ${skill.name}! 플레이어에게 ${finalDamage}의 피해!`, "fail");
          setPlayer({ ...currentPlayer, hp: newHp, isDefending: false });
          if (newHp <= 0) {
            handleBossBattleEnd("defeat", { ...currentPlayer, hp: 0 }, updatedBoss);
            setIsProcessing(false);
            return;
          }
        } else if (skill.kind === "heal") {
          const heal = Math.floor(updatedBoss.atk * (skill.damageMultiplier || 1.0));
          updatedBoss.hp = Math.min(updatedBoss.maxHp, updatedBoss.hp + heal);
          addLog(`💚 보스가 체력을 ${heal} 회복했습니다.`, "normal");
        } else if (skill.kind === "buff") {
          updatedBoss.activeBuffs = [
            ...(updatedBoss.activeBuffs || []),
            {
              key: skill.key,
              remainingTurns: skill.duration || 3,
              bonuses: {},
              evadeAll: skill.effect?.type === "evade",
              reflectPercent: skill.effect?.type === "reflect" ? skill.effect.value : 0,
              barrier: skill.effect?.type === "barrier",
              chargeAttackMultiplier: skill.effect?.type === "charge" ? skill.effect.value : 0,
            },
          ];
          addLog(`🔥 보스가 버프를 시전했습니다.`, "normal");
        }

        setBoss(updatedBoss);
        setIsProcessing(false);
        setIsPlayerTurn(true);
        return;
      }

      // 일반 공격
      const weaken = (currentPlayer.activeBuffs || []).find((b) => (b.weakenPercent || 0) > 0)?.weakenPercent || 0;
      const charge = (updatedBoss.activeBuffs || []).find((b) => (b.chargeAttackMultiplier || 0) > 0)?.chargeAttackMultiplier || 0;
      const trueStrike = (updatedBoss.activeBuffs || []).some((b) => b.trueStrikeNext);

      let attacker = { ...updatedBoss, atk: Math.max(1, Math.floor(updatedBoss.atk * (1 - weaken))) };
      if (charge > 0) {
        attacker.atk = Math.floor(attacker.atk * (1 + charge));
        addLog(`👹 [${usedSkillKey}] 효과! 보스의 공격력 증폭!`, "cri");
      }

      let effectivePlayer = getEffectivePlayerStats(currentPlayer);
      if (trueStrike) {
        effectivePlayer.def = 0;
        addLog(`🎯 [${usedSkillKey}] 효과! 보스의 공격이 방어를 무시합니다!`, "cri");
      }

      const result = calculateAttack(attacker, effectivePlayer);
      addLogs(result.logs);

      let updatedPlayer = { ...currentPlayer, hp: result.defender.hp, isDefending: false };

      if (charge > 0) {
        const idx = (updatedBoss.activeBuffs || []).findIndex((b) => b.chargeAttackMultiplier);
        if (idx >= 0) updatedBoss.activeBuffs!.splice(idx, 1);
      }
      if (trueStrike) {
        const idx = (updatedBoss.activeBuffs || []).findIndex((b) => b.trueStrikeNext);
        if (idx >= 0) updatedBoss.activeBuffs!.splice(idx, 1);
      }

      setPlayer(updatedPlayer);

      const reflect = (currentPlayer.activeBuffs || []).find((b) => (b.reflectPercent || 0) > 0)?.reflectPercent || 0;
      const lastLog = result.logs[result.logs.length - 1];
      const dmgMatch = lastLog?.msg.match(/(\d+)의 데미지를/);
      const dealt = dmgMatch ? parseInt(dmgMatch[1], 10) : 0;
      if (reflect > 0 && dealt > 0) {
        const reflectDmg = Math.floor(dealt * reflect);
        updatedBoss.hp = Math.max(0, updatedBoss.hp - reflectDmg);
        addLog(`🔄 스킬 효과로 ${reflectDmg}의 피해를 반사! (적 HP: ${updatedBoss.hp})`, "vic");
      }
      setBoss(updatedBoss);

      if (result.isBattleOver) {
        handleBossBattleEnd("defeat", updatedPlayer, currentBoss);
      } else {
        addLog(`--- 플레이어의 턴 ---`, "normal");
        toBossPlayerTurn(tickSkills(updatedPlayer) as PlayerStats, updatedBoss);
      }
    }, 1500);
  };

  // 7. handleSelectBossDungeon
  const handleSelectBossDungeon = (bossDungeonId: string) => {
    const bossDungeon = bossDungeons.find((b) => b.id === bossDungeonId);
    if (!player || !bossDungeon) return;

    const cooldown = bossCooldowns[bossDungeonId] || 0;
    if (cooldown > Date.now()) {
      addLog(`🚫 쿨타임이 남아 입장할 수 없습니다.`, "fail");
      return;
    }
    if (player.level < bossDungeon.requiredLevel) {
      addLog(`🚫 레벨이 부족하여 입장할 수 없습니다. (필요 레벨: ${bossDungeon.requiredLevel})`, "fail");
      return;
    }
    setCurrentBossDungeonId(bossDungeonId);
    setGameState("battle");
    addLog(`--- ${bossDungeon.icon} 보스 [${bossDungeon.name}] ---`, "appear");

    const newBoss = createBoss(bossDungeon.bossLevel);
    setBoss(newBoss);
    setMonster(null);
    setIsPlayerTurn(false);
    addLog(`보스의 기운에 압도당했습니다. 보스가 먼저 행동합니다.`, "fail");
    runBossTurn(player, newBoss);
  };

  return {
    monster, boss, isScarecrowBattle, scarecrowConfig, dungeonSessionKills,
    setMonster, setBoss, setIsScarecrowBattle, setScarecrowConfig, setDungeonSessionKills,
    runMonsterTurn, runBossTurn,
    handleBattleEnd, handleBossBattleEnd,
    handleNextDungeon, handleSelectBossDungeon,
  };
};