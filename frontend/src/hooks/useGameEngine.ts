// src/hooks/useGameEngine.ts

import { useState } from "react";
import type {
  PlayerStats,
  CharacterStats,
  Job,
  GameState,
  LogMessage,
  LogType,
  EquipmentItem,
  BossStats,
  SkillKey,
  BossReward,
} from "../game/types";
// 상수 임포트
import {
  skills as allSkills,
  dungeons,
  petShopList,
  bossDungeons,
} from "../game/constants";
import { weaponShopList, armorShopList } from "../game/shopItems";
import { STARTER_CLUB } from "../game/engineConstants";
// getRandom은 useMonsterEngine 내부로 이동했지만, handleAttack 등에서 아직 사용
// 유틸리티 임포트
import { getRandom } from "../game/utils";
// 분리된 로직 임포트
import {
  createNewPlayer,
  getEffectivePlayerStats,
} from "../game/playerLogic";
import { calculateAttack } from "../game/battleLogic";
import { tickSkills, canLearnSkill } from "../game/skillLogic";
import { applyPetStartOfTurn } from "../game/petLogic";
// 몬스터 엔진 임포트
import { useMonsterEngine } from "./useMonsterEngine";

// --- 메인 커스텀 훅 ---

export const useGameEngine = () => {
  const [player, setPlayer] = useState<PlayerStats | null>(null);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [gameState, setGameState] = useState<GameState>("setup");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // 몬스터 턴 등 처리 중 플래그
  const [consecutiveMisses, setConsecutiveMisses] = useState(0); // 연속 빗나감 횟수
  const [recoveryCharges, setRecoveryCharges] = useState(5); // 회복 횟수 추가
  const [isSkillsOpen, setIsSkillsOpen] = useState(false); // 스킬 창 모달
	const [isBattleSkillOpen, setIsBattleSkillOpen] = useState(false); // 전투 중 스킬 메뉴 상태
  const [currentDungeonId, setCurrentDungeonId] = useState<string | null>(null); // 현재 던전 ID
  const [currentBossDungeonId, setCurrentBossDungeonId] = useState<
    string | null
  >(null); // 현재 보스 던전 ID
  const [showBattleChoice, setShowBattleChoice] = useState(false); // 전투 후 선택 화면 표시 여부
  const [bossCooldowns, setBossCooldowns] = useState<Record<string, number>>(
    () => {
      const stored = localStorage.getItem("bossCooldowns");
      return stored ? JSON.parse(stored) : {};
    }
  );
  const [dungeonKillCounts, setDungeonKillCounts] = useState<
    Record<string, number>
  >(() => {
    const stored = localStorage.getItem("dungeonKillCounts");
    return stored ? JSON.parse(stored) : {};
  });
  const [bossReward, setBossReward] = useState<BossReward | null>(null);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

  // Electron API 타입 정의
  type ElectronAPI = {
    saveGameState: (
      slot: number,
      gameState: any
    ) => Promise<{ success: boolean; path?: string; error?: string }>;
    loadGameState: (
      slot: number
    ) => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteGameSlot: (
      slot: number
    ) => Promise<{ success: boolean; error?: string }>;
    getSaveSlotInfo: (
      slot: number
    ) => Promise<{ success: boolean; info?: any; error?: string }>;
  };

  const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;
  const isElectron = !!electronAPI;

  // ─── 로그 추가 유틸리티 ──────────────────────────────────────────────────────
  const addLog = (msg: string, type: LogType = "normal") => {
    const id = Date.now() + getRandom(1, 1000);
    setLogMessages((prev) => [...prev, { id, msg, type }]);
  };

  const addLogs = (logs: Omit<LogMessage, "id">[]) => {
    const newLogs = logs.map((log, i) => ({
      ...log,
      id: Date.now() + i + getRandom(1, 1000),
    }));
    setLogMessages((prev) => [...prev, ...newLogs]);
  };

  // ─── 몬스터 엔진 ────────────────────────────────────────────────────────────
  const {
    monster,
    boss,
    isScarecrowBattle,
    scarecrowConfig,
    dungeonSessionKills,
    setMonster,
    setBoss,
    setIsScarecrowBattle,
    setScarecrowConfig,
    setDungeonSessionKills,
    runMonsterTurn,
    runBossTurn,
    handleBattleEnd,
    handleBossBattleEnd,
    handleNextDungeon,
    handleSelectBossDungeon,
  } = useMonsterEngine({
    player,
    isProcessing,
    currentDungeonId,
    currentBossDungeonId,
    bossCooldowns,
    dungeonKillCounts,
    setPlayer,
    setGameState,
    setIsPlayerTurn,
    setIsProcessing,
    setConsecutiveMisses,
    setRecoveryCharges,
    setShowBattleChoice,
    setCurrentDungeonId,
    setCurrentBossDungeonId,
    setBossCooldowns,
    setDungeonKillCounts,
    setBossReward,
    addLog,
    addLogs,
  });

  /**
   * 개발자 모드 활성화
   */
  const enableDeveloperMode = () => {
    setIsDeveloperMode(true);
    addLog("🔧 개발자 모드가 활성화되었습니다.", "normal");
  };

  /**
   * 게임 상태 저장 (슬롯 번호 지정) - 프로젝트 saves 폴더에 저장
   */
  const saveGameState = async (slot: number = 1) => {
    if (!player) {
      addLog("🚫 저장할 게임 상태가 없습니다.", "fail");
      return;
    }

    const gameStateToSave = {
      player,
      bossCooldowns,
      dungeonKillCounts,
      logMessages: logMessages.slice(-50), // 최근 50개 로그만 저
      timestamp: Date.now(),
      slot,
    };

    if (isElectron && electronAPI) {
      // Electron 환경: 파일 시스템에 직접 저장
      try {
        const result = await electronAPI.saveGameState(slot, gameStateToSave);
        if (result.success) {
          addLog(
            `💾 슬롯 ${slot}에 게임 상태가 저장되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 저장 실패: ${result.error}`, "fail");
        }
      } catch (error) {
        addLog(`🚫 저장 중 오류가 발생했습니다.`, "fail");
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 저장
      try {
        const response = await fetch("/api/save-game-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot, gameState: gameStateToSave }),
        });
        const result = await response.json();
        if (result.success) {
          addLog(
            `💾 슬롯 ${slot}에 게임 상태가 저장되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 저장 실패: ${result.error}`, "fail");
        }
      } catch (error) {
        addLog(`🚫 저장 중 오류가 발생했습니다.`, "fail");
      }
    }
  };

  /**
   * 게임 상태 로드 (슬롯 번호 지정) - 프로젝트 saves 폴더에서 로드
   */
  const loadGameState = async (slot: number = 1) => {
    if (isElectron && electronAPI) {
      // Electron 환경: 파일 시스템에서 직접 로드
      try {
        const result = await electronAPI.loadGameState(slot);
        if (result.success && result.data) {
          const gameState = result.data;
          setPlayer(gameState.player);
          setBossCooldowns(gameState.bossCooldowns || {});
          setDungeonKillCounts(gameState.dungeonKillCounts || {});
          if (gameState.logMessages) {
            setLogMessages(gameState.logMessages);
          }
          setGameState("dungeon");
          setMonster(null);
          setBoss(null);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          addLog(
            `📂 슬롯 ${slot}에서 게임 상태가 로드되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 게임 상태가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 게임 상태 로드에 실패했습니다.", "fail");
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 로드
      try {
        const response = await fetch(`/api/load-game-state?slot=${slot}`);
        const result = await response.json();
        if (result.success && result.data) {
          const gameState = result.data;
          setPlayer(gameState.player);
          setBossCooldowns(gameState.bossCooldowns || {});
          setDungeonKillCounts(gameState.dungeonKillCounts || {});
          if (gameState.logMessages) {
            setLogMessages(gameState.logMessages);
          }
          setGameState("dungeon");
          setMonster(null);
          setBoss(null);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          addLog(
            `📂 슬롯 ${slot}에서 게임 상태가 로드되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 게임 상태가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 게임 상태 로드에 실패했습니다.", "fail");
      }
    }
  };

  /**
   * 파일에서 게임 상태 로드 - 프로젝트 saves 폴더에 저장
   */
  const loadGameStateFromFile = (file: File, slot: number) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const gameState = JSON.parse(e.target?.result as string);
        if (isElectron && electronAPI) {
          // Electron 환경: 파일 시스템에 저장
          const result = await electronAPI.saveGameState(slot, gameState);
          if (result.success) {
            addLog(
              `📂 슬롯 ${slot}에 파일이 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
              "vic"
            );
          } else {
            addLog(`🚫 파일 저장 실패: ${result.error}`, "fail");
          }
        } else {
          // 브라우저 환경: 개발 서버 API를 통해 저장
          try {
            const response = await fetch("/api/save-game-state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slot, gameState }),
            });
            const result = await response.json();
            if (result.success) {
              addLog(
                `📂 슬롯 ${slot}에 파일이 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
                "vic"
              );
            } else {
              addLog(`🚫 파일 저장 실패: ${result.error}`, "fail");
            }
          } catch (error) {
            addLog("🚫 파일 저장 중 오류가 발생했습니다.", "fail");
          }
        }
      } catch (error) {
        addLog("🚫 파일 형식이 올바르지 않습니다.", "fail");
      }
    };
    reader.readAsText(file);
  };

  /**
   * 텍스트에서 게임 상태 로드 - 프로젝트 saves 폴더에 저장
   */
  const loadGameStateFromText = async (text: string, slot: number) => {
    try {
      const gameState = JSON.parse(text);
      if (isElectron && electronAPI) {
        // Electron 환경: 파일 시스템에 저장
        const result = await electronAPI.saveGameState(slot, gameState);
        if (result.success) {
          addLog(
            `📂 슬롯 ${slot}에 텍스트가 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
            "vic"
          );
        } else {
          addLog(`🚫 텍스트 저장 실패: ${result.error}`, "fail");
        }
      } else {
        // 브라우저 환경: 개발 서버 API를 통해 저장
        try {
          const response = await fetch("/api/save-game-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slot, gameState }),
          });
          const result = await response.json();
          if (result.success) {
            addLog(
              `📂 슬롯 ${slot}에 텍스트가 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
              "vic"
            );
          } else {
            addLog(`🚫 텍스트 저장 실패: ${result.error}`, "fail");
          }
        } catch (error) {
          addLog("🚫 텍스트 저장 중 오류가 발생했습니다.", "fail");
        }
      }
    } catch (error) {
      addLog("🚫 텍스트 형식이 올바르지 않습니다.", "fail");
    }
  };

  /**
   * 특정 슬롯의 저장 상태 확인 - 프로젝트 saves 폴더에서 확인
   */
  const getSaveSlotInfo = async (slot: number) => {
    if (isElectron && electronAPI) {
      try {
        const result = await electronAPI.getSaveSlotInfo(slot);
        if (result.success) {
          return result.info;
        }
        return null;
      } catch (error) {
        return null;
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 확인
      try {
        const response = await fetch(`/api/get-save-slot-info?slot=${slot}`);
        const result = await response.json();
        if (result.success) {
          return result.info;
        }
        return null;
      } catch (error) {
        return null;
      }
    }
  };

  /**
   * 특정 슬롯의 저장 데이터 삭제 - 프로젝트 saves 폴더에서 삭제
   */
  const deleteGameSlot = async (slot: number) => {
    if (isElectron && electronAPI) {
      try {
        const result = await electronAPI.deleteGameSlot(slot);
        if (result.success) {
          addLog(`🗑️ 슬롯 ${slot}의 저장 데이터가 삭제되었습니다.`, "normal");
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 데이터가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 삭제 중 오류가 발생했습니다.", "fail");
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 삭제
      try {
        const response = await fetch(`/api/delete-game-slot?slot=${slot}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.success) {
          addLog(`🗑️ 슬롯 ${slot}의 저장 데이터가 삭제되었습니다.`, "normal");
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 데이터가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 삭제 중 오류가 발생했습니다.", "fail");
      }
    }
  };

  /**
   * 모든 보스 타이머 초기화
   */
  const resetAllBossCooldowns = () => {
    setBossCooldowns({});
    localStorage.setItem("bossCooldowns", JSON.stringify({}));
    addLog("⏰ 모든 보스 타이머가 초기화되었습니다.", "normal");
  };

  /**
   * 스킬 배우기 (State 변경)
   */
  const learnSkill = (key: SkillKey) => {
    if (!player) return;

		const skill = allSkills.find((s) => s.key === key)!;

		// 현재 스킬 레벨 및 마스터 레벨 확인
		const currentLevel = (player.skillUpgradeLevels || {})[key] || 0;
		const masterLevel = skill.maxLevel || 5; // 설정 없으면 기본 5

		// 마스터 레벨 도달 시 즉시 중단
    if (currentLevel >= masterLevel) {
      addLog(`🚫 "${skill.name}" 스킬 레벨을 더이상 올릴 수 없습니다! (Max Lv.${masterLevel})`, "fail");
      return;
    }

		// 비용 계산 (레벨업 할 때마다 1씩 증가: 1 -> 2 -> 3 ...)
    const cost = currentLevel + 1;

		if (!canLearnSkill(player, key)) {
      // 순수 로직 호출
      addLog("🚫 스킬을 배울 수 없습니다.", "fail");
      return;
    }

		// 스킬 포인트 부족 확인 (비용이 1보다 클 수 있으므로 별도 체크 필요)
		if ((player.skillPoints || 0) < cost) {
			addLog(`🚫 스킬 포인트가 부족합니다. (필요: ${cost} P / 보유: ${player.skillPoints} P)`, "fail");
      return;
		}
    
		// 스킬 레벨업 처리
    const newLevel = currentLevel + 1;
    const updatedSkills = player.skills.includes(key)
      ? player.skills
      : [...player.skills, key];

    const updated = {
      ...player,
      skillPoints: (player.skillPoints || 0) - cost, // 계산된 비용만큼 차감
      skills: updatedSkills,
      skillUpgradeLevels: {
        ...(player.skillUpgradeLevels || {}),
        [key]: newLevel,
      },
    };
    setPlayer(updated);

    if (currentLevel === 0) {
      addLog(`📘 "${skill.name}" 스킬을 배웠다! (Lv.${newLevel}/${masterLevel}) [소모: ${cost}P]`, "normal");
    } else {
      addLog(
        `📘 "${skill.name}" 스킬 강화에 성공했습니다! (Lv.${newLevel}/${masterLevel}) [소모: ${cost}P]`,
        "normal"
      );
    }
  };

  // runMonsterTurn → useMonsterEngine으로 이동

  // runBossTurn → useMonsterEngine으로 이동
  // handleBossBattleEnd → useMonsterEngine으로 이동
  // handleBattleEnd → useMonsterEngine으로 이동
  // handleSelectBossDungeon → useMonsterEngine으로 이동
  // handleNextDungeon → useMonsterEngine으로 이동

  // 게임 시작
  const gameStart = (name: string, job: Job) => {
    const newPlayer = createNewPlayer(name, job);
    setPlayer(newPlayer);
    setGameState("dungeon");
    addLog(`🥾 ${newPlayer.name} (${newPlayer.job}) (이)가 모험을 시작했다...`);
  };

  // 던전 선택
  const handleSelectDungeon = (dungeonId: string) => {
    const dungeon = dungeons.find((d) => d.id === dungeonId);
    if (!player || !dungeon) return;
    if (player.level < dungeon.requiredLevel) {
      addLog(
        `🚫 레벨이 부족하여 입장할 수 없습니다. (필요 레벨: ${dungeon.requiredLevel})`,
        "fail"
      );
      return;
    }
    setCurrentDungeonId(dungeonId);
    setGameState("dungeon");
    setDungeonSessionKills(0);
    addLog(`--- ${dungeon.icon} ${dungeon.name} ---`, "normal");
    handleNextDungeon(dungeon);
  };

  const handleOpenDungeonSelect = () => setGameState("dungeonSelect");
  const handleCloseDungeonSelect = () => setGameState("dungeon");
  const handleOpenBossSelect = () => setGameState("bossSelect");
  const handleCloseBossSelect = () => setGameState("dungeon");

  const handleContinueBattle = () => {
    setShowBattleChoice(false);
    handleNextDungeon();
  };

  const handleExitDungeon = () => {
    if (!player) return;
    setShowBattleChoice(false);
    setGameState("dungeon");
    setCurrentDungeonId(null);
    setCurrentBossDungeonId(null);
    setDungeonSessionKills(0);
    setPlayer({
      ...player,
      activeBuffs: [],
      skillCooldowns: {},
      isDefending: false,
    });
    addLog("던전에서 퇴장합니다.", "normal");
  };

  const handleDungeonRecovery = () => {
    if (isProcessing || !player) return;

    let newHp = player.hp + Math.floor(player.maxHp * 0.4); // 최대 체력의 40% 회복
    if (newHp > player.maxHp) {
      newHp = player.maxHp;
    }

    if (player.hp === newHp) {
      addLog(`😊 이미 체력이 가득 찼다. (HP: ${newHp})`, "normal");
      return;
    }

    setPlayer({ ...player, hp: newHp });
    addLog(`😊 체력을 회복했다. (HP: ${newHp})`, "normal");
  };

  // 전투 액션
  const handleAttack = () => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;
    setIsPlayerTurn(false);
    setIsProcessing(true);

    const effectivePlayer = getEffectivePlayerStats(player); // 순수 로직
    const defenderStats = boss
      ? (boss as CharacterStats)
      : (monster as CharacterStats);

    let defenderBuffs = boss ? boss.activeBuffs || [] : []; // 몬스터는 버프 없음

    const isBonusAttack = consecutiveMisses >= 3;

    // 트루 스트라이크 버프 처리 (차지 공격력 배율은 getEffectivePlayerStats에 포함됨)
    const attackerStats = { ...effectivePlayer };
    let logs: Omit<LogMessage, "id">[] = [];

    const chargeIdx = (player.activeBuffs || []).findIndex(
      (b) => b.chargeAttackMultiplier
    );
    if (chargeIdx >= 0) {
      const buff = player.activeBuffs![chargeIdx];
      logs.push({
        msg: `🔥 [${buff.key}] 스킬 효과! 공격력 증폭!`,
        type: "vic",
      });
    }
    const trueStrikeIdx = (player.activeBuffs || []).findIndex(
      (b) => b.trueStrikeNext
    );
    if (trueStrikeIdx >= 0) {
      defenderStats.def = 0; // 방어 무시
      logs.push({
        msg: `🎯 [${
          player.activeBuffs![trueStrikeIdx].key
        }] 스킬 효과! 방어 무시!`,
        type: "vic",
      });
    }

    addLogs(logs); // 차지/트루 스트라이크 로그 먼저 출력

    if (boss) {
      const barrierIdx = defenderBuffs.findIndex((b) => b.barrier);
      if (barrierIdx >= 0) {
        const skillName = defenderBuffs[barrierIdx].key;
        addLog(`🛡️ 몬스터의 [${skillName}] 스킬이 공격을 무효화했다!`, "fail");
        const nextBuffs = [...defenderBuffs];
        nextBuffs.splice(barrierIdx, 1);

        // 1. 새로운 boss 객체를 변수로 생성
        const updatedBoss = { ...boss, activeBuffs: nextBuffs };

        // 2. setBoss와 runBossTurn에 *동일한* 새 객체를 전달
        setBoss(updatedBoss);
        runBossTurn(player, updatedBoss); // 턴 넘김
        return;
      }

      const hasEvade = defenderBuffs.some((b) => b.evadeAll);
      if (hasEvade) {
        addLog(`🍃 몬스터가 스킬 효과로 공격을 회피했다!`, "fail");
        runBossTurn(player, boss); // (이 코드는 보스 상태 변경이 없으므로 그대로 둬도 됩니다)
        return;
      }
    }

    let result = calculateAttack(attackerStats, defenderStats, isBonusAttack); // 순수 로직
    addLogs(result.logs);

    const updatedDefender = result.defender;
    // const updatedAttacker = result.attacker; // (현재는 변경사항 없음)

    if (boss) {
      setBoss(updatedDefender as BossStats);
    } else {
      setMonster(updatedDefender);
    }

    // 빗나감 카운터
    if (result.didHit) {
      setConsecutiveMisses(0);
    } else {
      const newMissCount = consecutiveMisses + 1;
      setConsecutiveMisses(newMissCount);
      if (newMissCount >= 3) {
        addLog(
          `😡 집중력이 한계에 달했다. 다음 공격은 반드시 명중한다!`,
          "cri"
        );
      }
    }

    // 버프 제거
    let playerAfterAttack = { ...player };
    if (chargeIdx >= 0) {
      const nextBuffs = [...(playerAfterAttack.activeBuffs || [])];
      nextBuffs.splice(chargeIdx, 1);
      playerAfterAttack.activeBuffs = nextBuffs;
    }
    if (trueStrikeIdx >= 0) {
      const nextBuffs = [...(playerAfterAttack.activeBuffs || [])];
      nextBuffs.splice(trueStrikeIdx, 1);
      playerAfterAttack.activeBuffs = nextBuffs;
    }
    setPlayer(playerAfterAttack); // (중요) 턴 넘기기 전에 버프 제거된 플레이어 상태 반영

    if (result.isBattleOver) {
      // 허수아비 전투인 경우 체력 무한 (자동 회복)
      if (isScarecrowBattle && !boss) {
        addLog(
          `🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`,
          "vic"
        );
        const restoredScarecrow: CharacterStats = {
          ...updatedDefender,
          hp: scarecrowConfig?.maxHp || updatedDefender.maxHp,
        };
        setMonster(restoredScarecrow);
        // 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(playerAfterAttack);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(
          ticked,
          restoredScarecrow,
          getEffectivePlayerStats
        );
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setMonster(monsterAfterPet);
        setIsPlayerTurn(true);
        setIsProcessing(false);
      } else if (boss) {
        handleBossBattleEnd(
          "victory",
          playerAfterAttack,
          updatedDefender as BossStats
        );
      } else {
        handleBattleEnd("victory", playerAfterAttack, updatedDefender);
      }
      setIsProcessing(false);
    } else {
      if (boss) {
        runBossTurn(playerAfterAttack, updatedDefender as BossStats);
      } else {
        runMonsterTurn(playerAfterAttack, updatedDefender);
      }
    }
  };

  const handleDefend = () => {
    if (isProcessing || !isPlayerTurn || !player) return;
    setIsPlayerTurn(false);
    setIsProcessing(true);
    addLog(`🛡️ 방어 태세를 취합니다. 받는 데미지가 50% 감소합니다.`, "normal");

    const defendedPlayer = { ...player, isDefending: true };
    setPlayer(defendedPlayer);

    if (boss) {
      runBossTurn(defendedPlayer, boss);
    } else if (monster) {
      runMonsterTurn(defendedPlayer, monster);
    }
  };

  const handleRecovery = () => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;

    if (recoveryCharges <= 0) {
      addLog(`🚫 회복 횟수를 모두 사용했다! (남은 횟수: 0)`, "fail");
      return;
    }

    setIsPlayerTurn(false); // 턴 종료
    setIsProcessing(true);

    let newHp = player.hp + Math.floor(player.maxHp * 0.6); // 60% 회복
    if (newHp > player.maxHp) {
      newHp = player.maxHp;
    }

    const newCharges = recoveryCharges - 1;
    setRecoveryCharges(newCharges); // 횟수 차감

    if (player.hp === newHp) {
      addLog(
        `😊 이미 체력이 가득 찼다. (HP: ${newHp}, 남은 횟수: ${newCharges})`,
        "normal"
      );
    } else {
      addLog(
        `😊 체력을 회복했다. (HP: ${newHp}, 남은 횟수: ${newCharges})`,
        "normal"
      );
    }

    const recoveredPlayer = { ...player, hp: newHp };
    setPlayer(recoveredPlayer);

    if (boss) {
      runBossTurn(recoveredPlayer, boss);
    } else if (monster) {
      runMonsterTurn(recoveredPlayer, monster);
    }
  };

  const handleUseSkill = (key: SkillKey) => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;
    const skill = allSkills.find((s) => s.key === key);
    if (!skill) return;

    const cd = (player.skillCooldowns || {})[key] || 0;
    if (cd > 0) {
      addLog(`🚫 [${skill.name}] 스킬은 쿨타임 중입니다. (${cd}턴 남음)`, "fail");
      return;
    }

    setIsPlayerTurn(false);
    setIsProcessing(true);

    let updatedPlayer = { ...player };
    let updatedDefender = boss
      ? ({ ...boss } as BossStats)
      : ({ ...monster } as CharacterStats);
    let logs: Omit<LogMessage, "id">[] = [];

    // 1. 쿨타임 적용
    const newCooldowns = { ...(updatedPlayer.skillCooldowns || {}), [key]: skill.cooldown };
    updatedPlayer.skillCooldowns = newCooldowns;

    // 2. 스킬 레벨 확인
    const skillLevel = (player.skillUpgradeLevels || {})[key] || 0;

    // 3. 스킬 종류별 처리
    if (skill.kind === 'attack') {
      // --- 공격 스킬 ---
      const baseMult = skill.damageMultiplier || 1.0;
      const growth = skill.growthPerLevel || 0;
      const finalMult = baseMult + (skillLevel * growth);
      
      const effectiveStats = getEffectivePlayerStats(player);
      const variance = getRandom(90, 110) / 100;
      let damage = Math.floor(effectiveStats.atk * finalMult * variance);

      // 치명타 계산
      const critChance = Math.min(50, effectiveStats.luk * 0.2);
      let isCrit = false;
      if (getRandom(1, 100) <= critChance) {
        damage = Math.floor(damage * 1.5);
        isCrit = true;
      }

      // 방어력 적용
      const defense = updatedDefender.def;
      const reducedDamage = Math.max(Math.floor(damage * 0.1), damage - defense);
      
      updatedDefender.hp = Math.max(0, updatedDefender.hp - reducedDamage);

      const percentText = Math.floor(finalMult * 100);
      logs.push({ msg: `⚔️ [${skill.name} Lv.${skillLevel}] 발동! (위력 ${percentText}%)`, type: 'normal' });
      
      if (isCrit) {
        logs.push({ msg: `💥 치명타! ${updatedDefender.name}에게 ${reducedDamage}의 폭발적인 피해!`, type: 'cri' });
      } else {
        logs.push({ msg: `🗡️ ${updatedDefender.name}에게 ${reducedDamage}의 피해를 입혔다!`, type: 'vic' });
      }

    } else if (skill.kind === 'heal') {
      // --- 회복 스킬 ---
      const baseMult = skill.damageMultiplier || 1.0;
      const growth = skill.growthPerLevel || 0;
      const finalMult = baseMult + (skillLevel * growth);
      
      const effectiveStats = getEffectivePlayerStats(player);
      const healAmount = Math.floor(effectiveStats.atk * finalMult);
      
      let newHp = updatedPlayer.hp + healAmount;
      if (newHp > updatedPlayer.maxHp) newHp = updatedPlayer.maxHp;
      updatedPlayer.hp = newHp;
      
      logs.push({ msg: `✨ [${skill.name} Lv.${skillLevel}] 치유! 체력을 ${healAmount} 회복했다.`, type: 'gainMoney' });

    } else if (skill.kind === 'buff') {
      // --- 버프 스킬 ---
      if (skill.effect) {
				// 버프 수치 성장 로직 적용
         const baseValue = skill.effect.value || 0;
         const growth = skill.growthPerLevel || 0;
         // 현재 레벨만큼 수치 증가 (0레벨 = 기본, 1레벨 = 기본 + 성장)
         const enhancedValue = baseValue + (skillLevel * growth);

         const newBuff = {
            key: skill.key,
            remainingTurns: skill.duration || 3,
            bonuses: {},
            barrier: skill.effect.type === 'barrier',

						// 1. 공격력 증가 적용 (charge 또는 trade_off일 때)
            chargeAttackMultiplier: (skill.effect.type === 'charge' || skill.effect.type === 'trade_off')
						? enhancedValue
						: 0,
            
						// 2. 방어력 감소 적용 (trade_off일 때만 penalty 적용)
            defenseMultiplier: skill.effect.type === 'trade_off' 
              ? (1 - skill.effect.penalty)  // 0.3이면 0.7(70%)가 됨
              : 1,

						// 기존 효과들 매핑
            evadeAll: skill.effect.type === 'evade',
            reflectPercent: skill.effect.type === 'reflect' ? skill.effect.value : 0,
         };
        updatedPlayer.activeBuffs = [...(updatedPlayer.activeBuffs || []), newBuff];
        
				if (skill.effect.type === 'trade_off') {
            // 1. 트레이드 오프 버프일 때 (마력 폭주 등)
            // 구체적인 수치 계산 (버프 적용 전 스탯 기준)
            const weaponAtk = updatedPlayer.weapon?.value || 0;
            const weaponEnhLevel = updatedPlayer.weapon ? ((updatedPlayer.weaponEnhanceLevels || {})[updatedPlayer.weapon.id] || 0) : 0;
            const weaponEnhBonus = weaponEnhLevel * 5;
            const armorDef = updatedPlayer.armor?.value || 0;
            const armorEnhLevel = updatedPlayer.armor ? ((updatedPlayer.armorEnhanceLevels || {})[updatedPlayer.armor.id] || 0) : 0;
            const armorEnhBonus = armorEnhLevel * 5;
            
            // 버프 적용 전 유효 스탯
            const baseAtk = updatedPlayer.atk + weaponAtk + weaponEnhBonus;
            const baseDef = updatedPlayer.def + armorDef + armorEnhBonus;
            
            // 공격력 증가량
            const atkIncrease = Math.floor(baseAtk * enhancedValue);
            
            // 방어력 감소량 (버프 적용 전 방어력 * penalty)
            const defDecrease = Math.floor(baseDef * skill.effect.penalty);
            
            logs.push({ msg: `🔥 [${skill.name}] 시전! 공격력 +${atkIncrease}, 방어력 -${defDecrease} (${skill.duration}턴 지속)`, type: 'normal' });
         } else {
            // 2. 일반 버프일 때 (기존 대사 유지)
            logs.push({ msg: `🛡️ [${skill.name}] 시전! ${skill.duration}턴 동안 효과 지속.`, type: 'normal' });
         }
      }
    }

    addLogs(logs);
    setPlayer(updatedPlayer);

    // 4. 전투 종료 판정 및 턴 넘기기
    if (updatedDefender.hp <= 0) {
       if (boss) {
          setBoss(updatedDefender as BossStats);
          handleBossBattleEnd("victory", updatedPlayer, updatedDefender as BossStats);
       } else {
          setMonster(updatedDefender);
          handleBattleEnd("victory", updatedPlayer, updatedDefender);
       }
       setIsProcessing(false);
       return;
    } 
    
    if (boss) setBoss(updatedDefender as BossStats);
    else setMonster(updatedDefender);

    if (boss) runBossTurn(updatedPlayer, updatedDefender as BossStats);
    else runMonsterTurn(updatedPlayer, updatedDefender);
  };

  const handleEscape = () => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;
    setIsPlayerTurn(false);
    setIsProcessing(true);
    addLog(`🤫 도망을 시도합니다...`, "normal");

    const effectivePlayer = getEffectivePlayerStats(player); // 순수 로직
    const defender = boss
      ? (boss as CharacterStats)
      : (monster as CharacterStats);

    let escapeRate = 50;
    if (effectivePlayer.luk >= defender.luk * 2) {
      escapeRate = 100;
    }

    setTimeout(() => {
      if (getRandom(1, 100) <= escapeRate) {
        if (boss) handleBossBattleEnd("escape", player);
        else handleBattleEnd("escape", player);
      } else {
        addLog(`😥 도망치는 데 실패했다...`, "fail");
        if (boss) runBossTurn(player, boss);
        else runMonsterTurn(player, monster!);
      }
    }, 1000);
  };

  // 상점/스킬/강화소 액션
  const handleEnterShop = () => setGameState("shop");
  const handleExitShop = () => setGameState("dungeon");
  const handleOpenSkills = () => setIsSkillsOpen(true);
  const handleCloseSkills = () => setIsSkillsOpen(false);

  const handleBuyItem = (item: EquipmentItem) => {
    if (!player) return;
    if (player.money < item.price) {
      addLog(`💰 골드가 부족합니다. (필요: ${item.price} G)`, "fail");
      return;
    }

		// 레벨 제한 확인
    if (item.requiredLevel && player.level < item.requiredLevel) {
      addLog(`🚫 레벨이 부족하여 구매할 수 없습니다. (필요 Lv.${item.requiredLevel})`, 'fail');
      return;
    }

    const jobCanUse =
      !item.allowedJobs || item.allowedJobs.includes(player.job);
    if (!jobCanUse) {
      addLog(`🚫 직업 제한으로 구매할 수 없습니다.`, "fail");
      return;
    }

    const newPlayer = { ...player, money: player.money - item.price };
    if (item.type === "weapon") {
      newPlayer.ownedWeaponIds = [...(newPlayer.ownedWeaponIds || []), item.id];
    } else {
      newPlayer.ownedArmorIds = [...(newPlayer.ownedArmorIds || []), item.id];
    }
    setPlayer(newPlayer);
    addLog(`✨ ${item.name}을(를) 구매했습니다!`, "gainMoney");
  };

  const handleBuyPet = (petId: string) => {
    if (!player) return;
    const pet = petShopList.find((p) => p.id === petId);
    if (!pet) return;
    if (player.money < pet.price) {
      addLog(`💰 골드가 부족합니다. (필요: ${pet.price} G)`, "fail");
      return;
    }
    setPlayer({
      ...player,
      money: player.money - pet.price,
      ownedPetIds: [...(player.ownedPetIds || []), pet.id],
    });
    addLog(`✨ ${pet.icon} ${pet.name}을(를) 구매했습니다!`, "gainMoney");
  };

  const handleEquipWeapon = (id: string) => {
    if (!player) return;
    const item =
      weaponShopList.find((w) => w.id === id) ||
      (id === STARTER_CLUB.id ? STARTER_CLUB : null);

    if (!item) return;

		// 레벨 제한 확인
    if (item.requiredLevel && player.level < item.requiredLevel) {
      addLog(`🚫 레벨이 부족하여 장착할 수 없습니다. (필요 Lv.${item.requiredLevel})`, 'fail');
      return;
    }

    const jobCanUse =
      !item.allowedJobs || item.allowedJobs.includes(player.job);
    if (!jobCanUse) {
      addLog(`🚫 직업 제한으로 장착할 수 없습니다.`, "fail");
      return;
    }
    setPlayer({ ...player, weapon: item });
    addLog(`⚔️ ${item.name}을(를) 장착했습니다.`, "normal");
  };

  const handleEquipArmor = (id: string) => {
    if (!player) return;
    const item = armorShopList.find((a) => a.id === id);

    if (!item) return;

		// 레벨 제한 확인
    if (item.requiredLevel && player.level < item.requiredLevel) {
      addLog(`🚫 레벨이 부족하여 장착할 수 없습니다. (필요 Lv.${item.requiredLevel})`, 'fail');
      return;
    }

    const jobCanUse =
      !item.allowedJobs || item.allowedJobs.includes(player.job);
    if (!jobCanUse) {
      addLog(`🚫 직업 제한으로 장착할 수 없습니다.`, "fail");
      return;
    }
    setPlayer({ ...player, armor: item });
    addLog(`🛡️ ${item.name}을(를) 장착했습니다.`, "normal");
  };

  const handleEquipPet = (id: string) => {
    if (!player) return;
    const pet = petShopList.find((p) => p.id === id);
    if (!pet) return;
    setPlayer({ ...player, pet: pet });
    addLog(`🐾 ${pet.icon} ${pet.name}을(를) 장착했습니다.`, "normal");
  };

  const handleUnequipWeapon = () => {
    if (!player) return;
    setPlayer({ ...player, weapon: null });
    addLog(`⚔️ 무기를 해제했습니다.`, "normal");
  };

  const handleUnequipArmor = () => {
    if (!player) return;
    setPlayer({ ...player, armor: null });
    addLog(`🛡️ 방어구를 해제했습니다.`, "normal");
  };

  const handleUnequipPet = () => {
    if (!player) return;
    setPlayer({ ...player, pet: null });
    addLog(`🐾 펫을 해제했습니다.`, "normal");
  };

  const handleOpenPetEnhance = () => setGameState("weaponEnhance");
  const handleOpenWeaponEnhance = () => setGameState("weaponEnhance");
  const handleCloseEnhance = () => setGameState("dungeon");
  const handleOpenScarecrow = () => {
    setGameState("scarecrow");
    setIsScarecrowBattle(false);
  };
  const handleCloseScarecrow = () => {
    setGameState("dungeon");
    setIsScarecrowBattle(false);
    setScarecrowConfig(null);
    setMonster(null);
    setBoss(null);
  };

  // 허수아비 전투 시작
  const handleStartScarecrowBattle = (config: {
    atk: number;
    def: number;
    luk: number;
  }) => {
    if (!player) return;
    // 허수아비는 체력이 무한이므로 maxHp를 큰 값으로 설정
    const maxHp = 999999;
    setScarecrowConfig({ maxHp, ...config });
    setIsScarecrowBattle(true);

    const scarecrow: CharacterStats = {
      name: "허수아비",
      level: 1,
      hp: maxHp,
      maxHp: maxHp,
      atk: config.atk,
      def: config.def,
      luk: config.luk,
    };

    setMonster(scarecrow);
    setBoss(null);
    setGameState("battle");
    setIsPlayerTurn(true);
    setIsProcessing(false);
    setConsecutiveMisses(0);
    setRecoveryCharges(5);
    addLog(`🎯 허수아비 훈련장에 입장했습니다.`, "normal");
    addLog(`--- 플레이어의 턴 ---`, "normal");
  };

  // 허수아비 전투 종료 (나가기)
  const handleExitScarecrowBattle = () => {
    if (!player) return;
    // 플레이어 HP 회복
    const recoveredPlayer = { ...player, hp: player.maxHp };
    setPlayer(recoveredPlayer);
    addLog(
      `😊 허수아비 훈련장에서 나왔습니다. 체력이 모두 회복되었습니다.`,
      "normal"
    );

    setIsScarecrowBattle(false);
    setScarecrowConfig(null);
    setMonster(null);
    setBoss(null);
    setGameState("dungeon"); // 던전 화면으로 돌아감
    setIsPlayerTurn(true);
    setIsProcessing(false);
  };

	// 전투 스킬 메뉴 토글 함수
	const handleToggleBattleSkills = () => {
    setIsBattleSkillOpen(prev => !prev);
  };

  const getPetEnhanceCost = (level: number) => 100 + level * 100;
  const handleEnhancePet = () => {
    if (!player || !player.pet) {
      addLog("🚫 강화할 펫을 먼저 장착해주세요.", "fail");
      return;
    }
    const level = (player.petEnhanceLevels || {})[player.pet.id] || 0;
    const cost = getPetEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, "fail");
      return;
    }
    const newLevel = level + 1;
    setPlayer({
      ...player,
      money: player.money - cost,
      petEnhanceLevels: {
        ...(player.petEnhanceLevels || {}),
        [player.pet.id]: newLevel,
      },
    });
    addLog(
      `✨ ${player.pet.icon} ${player.pet.name} 강화 성공! [${newLevel}강]`,
      "vic"
    );
  };

  const getArmorEnhanceCost = (level: number) => 150 + level * 150;
  const handleEnhanceArmor = () => {
    if (!player || !player.armor) {
      addLog("🚫 강화할 방어구를 먼저 장착해주세요.", "fail");
      return;
    }
    const level = (player.armorEnhanceLevels || {})[player.armor.id] || 0;
    const cost = getArmorEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, "fail");
      return;
    }
    const newLevel = level + 1;
    setPlayer({
      ...player,
      money: player.money - cost,
      armorEnhanceLevels: {
        ...(player.armorEnhanceLevels || {}),
        [player.armor.id]: newLevel,
      },
    });
    addLog(`✨ ${player.armor.name} 강화 성공! [${newLevel}강]`, "vic");
  };

  const getWeaponEnhanceCost = (level: number) => 150 + level * 150;
  const handleEnhanceWeapon = () => {
    if (!player || !player.weapon) {
      addLog("🚫 강화할 무기를 먼저 장착해주세요.", "fail");
      return;
    }
    const level = (player.weaponEnhanceLevels || {})[player.weapon.id] || 0;
    const cost = getWeaponEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, "fail");
      return;
    }
    const newLevel = level + 1;
    setPlayer({
      ...player,
      money: player.money - cost,
      weaponEnhanceLevels: {
        ...(player.weaponEnhanceLevels || {}),
        [player.weapon.id]: newLevel,
      },
    });
    addLog(`✨ ${player.weapon.name} 강화 성공! [${newLevel}강]`, "vic");
  };

  // 보스 보상 액션
  const handleBossRewardAction = (
    action: "equip" | "sell" | "ignore",
    reward: BossReward
  ) => {
    if (!player) return;
    let updatedPlayer = { ...player };
    const logs: Omit<LogMessage, "id">[] = [];

    // 아이템 소유권 처리 헬퍼
    const grantOwnership = (
      p: PlayerStats,
      item: EquipmentItem
    ): PlayerStats => {
      if (item.type === "weapon") {
        if (!(p.ownedWeaponIds || []).includes(item.id)) {
          p.ownedWeaponIds = [...(p.ownedWeaponIds || []), item.id];
        }
      } else if (item.type === "armor") {
        if (!(p.ownedArmorIds || []).includes(item.id)) {
          p.ownedArmorIds = [...(p.ownedArmorIds || []), item.id];
        }
      }
      return p;
    };

    if (action === "equip") {
      logs.push({
        msg: `✨ ${reward.item.name}을(를) 장착했습니다!`,
        type: "vic",
      });

      // 기존 장비가 '나무 몽둥이'가 아닐 경우에만 판매
      const oldItem =
        reward.item.type === "weapon"
          ? updatedPlayer.weapon
          : updatedPlayer.armor;
      if (oldItem && oldItem.id !== STARTER_CLUB.id) {
        const oldItemSellPrice = Math.floor(oldItem.price * 0.5);
        logs.push({
          msg: `🛡️ 기존 장비 ${oldItem.name}을(를) 판매하여 ${oldItemSellPrice} G를 획득했습니다.`,
          type: "gainMoney",
        });
        updatedPlayer.money += oldItemSellPrice;
      }

      // 새 아이템 장착 및 소유
      updatedPlayer = grantOwnership(updatedPlayer, reward.item);
      if (reward.item.type === "weapon") {
        updatedPlayer.weapon = reward.item;
      } else if (reward.item.type === "armor") {
        updatedPlayer.armor = reward.item;
      }
    } else if (action === "sell") {
      logs.push({
        msg: `💰 ${reward.item.name}을(를) ${reward.sellPrice} G에 판매했습니다.`,
        type: "gainMoney",
      });
      updatedPlayer.money += reward.sellPrice;
      // 판매 시에는 소유권 목록에 추가하지 않음 (다시 드롭될 수 있음)
    } else if (action === "ignore") {
      logs.push({
        msg: `아이템 ${reward.item.name}을(를) 무시했습니다. (소유 목록에 추가)`,
        type: "fail",
      });
      // 무시할 경우 소유권 목록에 추가 (중복 드롭 방지)
      updatedPlayer = grantOwnership(updatedPlayer, reward.item);
    }

    addLogs(logs);

		if(currentBossDungeonId) {
			// 보스 던전일 경우 : 전투 종료 후 홈으로 복귀
			setShowBattleChoice(false);
    	setGameState("dungeon");
    	setCurrentBossDungeonId(null); // 보스 던전 ID 초기화하여 홈으로 복귀

			// 쿨타임과 버프 초기화
			updatedPlayer.activeBuffs = [];
			updatedPlayer.skillCooldowns = {};
			updatedPlayer.isDefending = false;
		} else {
			// 일반 던전일 경우 : 다시 전투 화면(선택지)으로 복귀
			setGameState("battle");
			setShowBattleChoice(true);
		}

		// 플레이어 상태 (아이템 획득 + 초기화 적용)를 저장
		setPlayer(updatedPlayer);
    setBossReward(null);
  };

  const handleKeyDown = (key: string) => {
    if (isProcessing) return;

    if (isSkillsOpen) {
      if (key === "k" || key === "q") handleCloseSkills();
      return; // 모달이 열려있으면 다른 키 입력 무시
    }

    if (gameState === "dungeon") {
      if (!showBattleChoice) {
        if (key === "s") handleOpenDungeonSelect(); // 던전 탐험
        if (key === "b") handleOpenBossSelect(); // 보스 던전
        if (key === "r") handleDungeonRecovery(); // 휴식
        if (key === "h") handleEnterShop(); // 상점 (h)
        if (key === "k") handleOpenSkills(); // 스킬
        if (key === "p") handleOpenPetEnhance(); // 펫 강화 (강화소로 통합)
        if (key === "w") handleOpenWeaponEnhance(); // 강화소
        if (key === "t") handleOpenScarecrow(); // 허수아비 (Training dummy)
      }
    } else if (gameState === "battle") {
      if (showBattleChoice) {
        // 전투 후 선택지 (C, X)
        if (key === "c") handleContinueBattle();
        if (key === "x") handleExitDungeon();
      } else if (isPlayerTurn) {
        // 3-1. 스킬 메뉴가 열려있을 때 (숫자키 입력)
        if (isBattleSkillOpen) {
          const num = parseInt(key);
          // 숫자 1~9 키 입력 확인
          if (!isNaN(num) && num >= 1 && num <= 9) {
            const skillIndex = num - 1;
            // 현재 플레이어가 배운 스킬 목록
            const playerSkills = player?.skills || [];
            if (skillIndex < playerSkills.length) {
              // 해당 슬롯의 스킬 사용
              handleUseSkill(playerSkills[skillIndex]);
              // 스킬 사용 후 메뉴 닫기
              setIsBattleSkillOpen(false); 
            }
          }
          // 메뉴 닫기 (K, Q, ESC)
          if (key === 'k' || key === 'q' || key === 'escape') {
            setIsBattleSkillOpen(false);
          }
        } 
        // 3-2. 스킬 메뉴가 닫혀있을 때 (기본 단축키)
        else {
          if (key === "a") handleAttack();
          if (key === "d") handleDefend();
          if (key === "e") handleRecovery();
          if (key === "q") {
            if (isScarecrowBattle) {
              handleExitScarecrowBattle();
            } else {
              handleEscape();
            }
          }
          // 스킬 메뉴 열기 (K)
          if (key === "k") handleToggleBattleSkills();
        }
      }
    } else if (gameState === "shop") {
      if (key === "h" || key === "q") handleExitShop();
    } else if (gameState === "petEnhance" || gameState === "weaponEnhance") {
      if (key === "q") handleCloseEnhance();
    } else if (gameState === "scarecrow") {
      if (key === "q") handleCloseScarecrow();
    } else if (gameState === "dungeonSelect") {
      if (key === "q") handleCloseDungeonSelect();
    } else if (gameState === "bossSelect") {
      if (key === "q") handleCloseBossSelect();
    }
    // 보상 모달은 키보드 입력을 막습니다 (버튼 클릭만 허용)
  };

  return {
    player,
    monster: boss || monster,
    logMessages,
    gameState,
    isPlayerTurn,
    isProcessing,
    recoveryCharges,
    consecutiveMisses,
    skills: allSkills,
    isSkillsOpen,
    currentDungeonId,
    showBattleChoice,
    dungeons,
    bossDungeons,
    bossCooldowns,
    shopLists: {
      weapons: weaponShopList,
      armors: armorShopList,
      pets: petShopList,
    },
    bossReward,
    isDeveloperMode,
    isScarecrowBattle,
    dungeonSessionKills,
		isBattleSkillOpen,
    actions: {
      gameStart,
      handleSelectDungeon,
      handleSelectBossDungeon,
      handleOpenDungeonSelect,
      handleCloseDungeonSelect,
      handleOpenBossSelect,
      handleCloseBossSelect,
      handleNextDungeon,
      handleDungeonRecovery,
      handleAttack,
      handleDefend,
      handleRecovery,
      handleEscape,
      handleKeyDown,
      handleEnterShop,
      handleExitShop,
      handleBuyItem,
      handleBuyPet,
      handleEquipWeapon,
      handleEquipArmor,
      handleEquipPet,
      handleUnequipWeapon,
      handleUnequipArmor,
      handleUnequipPet,
      handleOpenPetEnhance,
      handleOpenWeaponEnhance,
      handleEnhanceArmor,
      handleCloseEnhance,
      handleEnhancePet,
      handleEnhanceWeapon,
      handleOpenScarecrow,
      handleCloseScarecrow,
      handleStartScarecrowBattle,
      handleExitScarecrowBattle,
      handleOpenSkills,
      handleCloseSkills,
      handleUseSkill,
      learnSkill,
      handleContinueBattle,
      handleExitDungeon,
      handleBossRewardAction,
      enableDeveloperMode,
      saveGameState,
      loadGameState,
      getSaveSlotInfo,
      deleteGameSlot,
      loadGameStateFromFile,
      loadGameStateFromText,
      resetAllBossCooldowns,
			handleToggleBattleSkills,
    },
  };
};