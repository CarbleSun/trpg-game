import { useState } from 'react';
import type {
  PlayerStats,
  CharacterStats,
  Job,
  GameState,
  LogMessage,
  LogType,
  BattleResult,
	EquipmentItem, // 장비 구매 기능 
  Dungeon,
} from '../game/types';
import { ctrl, monsterList, skills as allSkills, dungeons, petShopList } from '../game/constants';
import { weaponShopList, armorShopList } from '../game/shopItems';
import { getRandom } from '../game/utils';

// --- 순수 계산 함수 (rpg.js 로직 포팅) ---

/**
 * 각 직업별 기본 스탯 편차 (배율)
 * [HP, ATK, DEF, LUK]
 */
const jobStatModifiers = {
  // 마법사: HP/DEF 낮음, ATK 높음
  "마법사": { hp: 1.0, atk: 1.5, def: 0.9, luk: 1.0 },
  // 전사: HP/DEF 높음, ATK/LUK 낮음
  "전사": { hp: 1.5, atk: 0.7, def: 1.3, luk: 0.8 },
  // 도적: LUK 높음, DEF 약간 낮음
  "도적": { hp: 1.0, atk: 1.0, def: 1.0, luk: 1.3 },
};

/**
 * 신규 플레이어 스탯을 생성합니다. (편차 적용 수정됨)
 */
const createNewPlayer = (name: string, job: Job): PlayerStats => {
  const level = 1;
  const { levUpVal, jobBonus } = ctrl;

  const bonus = jobBonus[job]; // [atk, def, luk] % 보너스
  const mod = jobStatModifiers[job]; // [hp, atk, def, luk] 기본 배율

  // (레벨 * 기본스탯 * 직업배율) * (1 + %보너스)
  const atk = Math.floor((level * levUpVal.atk * mod.atk) * (1 + bonus[0] / 100));
  const def = Math.floor((level * levUpVal.def * mod.def) * (1 + bonus[1] / 100));
  const luk = Math.floor((level * levUpVal.luk * mod.luk) * (1 + bonus[2] / 100));
  const hp = Math.floor(((level * levUpVal.hp[0]) + (level * levUpVal.hp[1])) * mod.hp);
  
  return {
    name,
    job,
    level,
    hp,
    maxHp: hp,
    atk, // 기본 공격력
    def, // 기본 방어력
    luk, // 기본 행운
    exp: 0,
    money: 0,
    goalExp: (level * 30) + (level * 120),
    vicCount: 0,
    defCount: 0,
		weapon: null,
    armor: null,
    pet: null,
    weaponEnhanceLevels: {},
    armorEnhanceLevels: {},
    petEnhanceLevels: {},
    ownedWeaponIds: [],
    ownedArmorIds: [],
    ownedPetIds: [],
    skillPoints: 0,
    skills: [],
  };
};

/**
 * 레벨에 맞는 몬스터를 생성합니다.
 * @param playerLevel 플레이어 레벨
 * @param monsterLevelOffset 던전의 몬스터 레벨 오프셋
 */
const makeMonster = (playerLevel: number, monsterLevelOffset: number = 0): CharacterStats => {
  // 플레이어 레벨을 10레벨 단위의 티어로 변환 후, 던전 오프셋 적용
  const baseTier = Math.floor((playerLevel - 1) / 10);
  let monsterTier = baseTier + monsterLevelOffset;
  if (monsterTier < 0) monsterTier = 0;
  const maxTier = Object.keys(monsterList).length - 1;
  if (monsterTier > maxTier) monsterTier = maxTier;

  const list = monsterList[monsterTier];
  const [name, level, hp, atk, def, luk] = list[getRandom(0, list.length - 1)];

  return {
    name: name as string,
    level: level as number,
    hp: hp as number,
    maxHp: hp as number,
    atk: atk as number,
    def: def as number,
    luk: luk as number,
  };
};

/**
 * 공격 계산 로직 (수정됨: 0 데미지는 빗나감으로 처리)
 * @returns 배틀로그, 변경된 상태, 전투 종료 여부, 명중 여부
 */
const calculateAttack = (
  attacker: CharacterStats,
  defender: CharacterStats,
  isGuaranteedHit: boolean = false // 3회 빗나감 보너스 공격 여부
): BattleResult & { didHit: boolean } => {
  const logs: Omit<LogMessage, 'id'>[] = [];
  let newAttacker = { ...attacker };
  let newDefender = { ...defender };
  let isBattleOver = false;
  let didHit = false;

  logs.push({ msg: `🗡 ${newAttacker.name}이(가) ${newDefender.name}을(를) 공격한다.`, type: 'tryToAtk' });

  // 1. 데미지 산출 (Base)
  const atkCalc = getRandom(newAttacker.atk * -0.1, newAttacker.atk * 0.1);
  const defCalc = getRandom(newDefender.def * -0.05, newDefender.def * 0.05);
  let damage = Math.ceil((newAttacker.atk + atkCalc) - (newDefender.def + defCalc));

  // 2. 방어 상태
  if (newDefender.isDefending) {
    damage = Math.floor(damage / 2);
    logs.push({ msg: `🛡 ${newDefender.name}이(가) 방어했다! (데미지 절반)`, type: 'normal' });
    newDefender.isDefending = false;
  }

  // 3. 데미지 0 이하 (수정된 부분)
  if (damage <= 0) {
    damage = 0;

    // 보너스 공격(isGuaranteedHit)이 아닐 때만 '실패'로 처리.
    if (!isGuaranteedHit) { 
      logs.push({ msg: `😓 ${newAttacker.name}의 공격이 막혔다! (0 데미지)`, type: 'fail' });
      didHit = false; // '빗나감'으로 처리

      const isAttackerPlayer = 'job' in newAttacker;
      // 몬스터의 0 데미지 공격은 여기서 턴 종료
      if (!isAttackerPlayer) {
        return { logs, attacker: newAttacker, defender: newDefender, isBattleOver, didHit };
      }
      // (플레이어의 0 데미지 공격은 턴을 종료하지 않고
      //  '회피' 판정(5번)으로 넘어감.
      //  회피 판정에서도 '명중'으로 바뀌지 않으면 최종 didHit = false가 됨)
    }
    // (보너스 공격(isGuaranteedHit)이면, 데미지가 0이더라도
    //  6번 로직에서 데미지를 추가할 것이므로 '실패' 처리를 하지 않고 통과)
  }

  // 4. 크리티컬
  const criRate = 2 * (newAttacker.luk - newDefender.luk);
  let isCritical = false;

	if (isGuaranteedHit) {
    logs.push({ msg: `⚡️ 100% 크리티컬 히트!`, type: 'cri' });
    isCritical = true;
  }

  else if (getRandom(1, 100) <= criRate) {
    logs.push({ msg: `⚡️ 크리티컬 히트!`, type: 'cri' });
    isCritical = true;
  }

	// 크리티컬 데미지 적용
  if (isCritical) {
    damage *= 2;
    didHit = true; // 크리티컬은 '명중'
  }

  // 5. 회피 (크리티컬이 아니면서, "보너스 공격도 아닐 때"만 실행)
  if (!isCritical && !isGuaranteedHit) {
    let evadeRate = 1;
    const lukDiff = newDefender.luk - newAttacker.luk;
    if (lukDiff > 0) evadeRate = 5;
    if (newDefender.luk >= newAttacker.luk * 2) evadeRate = 30;
    if (newDefender.luk >= newAttacker.luk * 3) evadeRate = 50;

    const isAttackerPlayer = 'job' in newAttacker;
    const isDefenderPlayer = 'job' in newDefender;

    if (isAttackerPlayer) { // 몬스터 회피율 감소
      evadeRate = Math.floor(evadeRate * 0.3);
    } else if (isDefenderPlayer) { // 플레이어 회피율 증가
      evadeRate = Math.floor(evadeRate * 1.5);
    }

    if (getRandom(1, 100) <= evadeRate) {
      logs.push({ msg: `🍃 ${newDefender.name}이(가) 공격을 회피했다.`, type: 'fail' });
      didHit = false; // '빗나감'
      return { logs, attacker: newAttacker, defender: newDefender, isBattleOver, didHit };
    }
  }

  // 6. 3회 빗나감 보너스 적용 (특수대사 + 추가 데미지)
  if (isGuaranteedHit) {
    // --- 특수대사 ---
    logs.push({ msg: `🔥 "WRYYYYYYYY!!!!!!! 로드롤러다!!!!!!!!"`, type: 'cri' });

    // (데미지가 0이었을 경우를 대비해 최소 데미지 보장)
    const minBonusDmg = Math.floor(newAttacker.atk * 0.5); // 공격력 50%
    damage = Math.max(damage, minBonusDmg);

    // --- 추가 데미지 (기존 데미지의 50% + 행운) ---
    const bonusDamage = Math.floor(damage * 0.5 + newAttacker.luk);
    damage += bonusDamage;
    
    logs.push({ msg: `✨ 집중력의 일격! ${bonusDamage}의 추가 데미지!`, type: 'vic' });
    didHit = true;
  }

  // 7. 최종 데미지 적용
  if (!didHit && damage > 0) { // (크리티컬X, 회피X, 보너스X, 0데미지X)
    didHit = true;
  }

  newDefender.hp -= damage;
  if (newDefender.hp <= 0) {
    newDefender.hp = 0;
    isBattleOver = true;
  }
  
  logs.push({ 
    msg: `💥 ${newDefender.name}에게 ${damage}의 데미지를 입혔다. (HP: ${newDefender.hp})`, 
    type: 'atk' 
  });

  return { logs, attacker: newAttacker, defender: newDefender, isBattleOver, didHit };
};

/**
 * 레벨업 처리 (편차 적용 수정됨)
 */
const checkLevelUp = (player: PlayerStats): { newPlayer: PlayerStats, logs: Omit<LogMessage, 'id'>[] } => {
  let newPlayer = { ...player };
  const logs: Omit<LogMessage, 'id'>[] = [];

  if (newPlayer.exp < newPlayer.goalExp) {
    return { newPlayer, logs };
  }

  // 레벨 업!
  newPlayer.level += 1;
  logs.push({ msg: `🆙 레벨 업! 레벨 ${newPlayer.level}이(가) 되었다.`, type: 'lvup' });
  // 스킬 포인트 +1
  newPlayer.skillPoints = (newPlayer.skillPoints || 0) + 1;
  logs.push({ msg: `✨ 스킬 포인트 +1 (보유: ${newPlayer.skillPoints})`, type: 'lvup' });

  const { levUpVal, jobBonus } = ctrl;
  const bonus = jobBonus[newPlayer.job]; // [atk, def, luk] % 보너스
  const mod = jobStatModifiers[newPlayer.job]; // [hp, atk, def, luk] 기본 배율

  // 스탯 재계산 (createNewPlayer와 동일한 공식 적용)
  newPlayer.atk = Math.floor((newPlayer.level * levUpVal.atk * mod.atk) * (1 + bonus[0] / 100));
  newPlayer.def = Math.floor((newPlayer.level * levUpVal.def * mod.def) * (1 + bonus[1] / 100));
  newPlayer.luk = Math.floor((newPlayer.level * levUpVal.luk * mod.luk) * (1 + bonus[2] / 100));
  
  newPlayer.hp = Math.floor(((newPlayer.level * levUpVal.hp[0]) + (newPlayer.level * levUpVal.hp[1])) * mod.hp);
  newPlayer.maxHp = newPlayer.hp; // HP 전체 회복
  
  newPlayer.exp = 0; // 경험치 초기화 (원본에서는 0으로 설정됨)
  newPlayer.goalExp = (newPlayer.level * 30) + (newPlayer.level * 120);

  return { newPlayer, logs };
};

// --- 메인 커스텀 훅 ---

export const useGameEngine = () => {
  const [player, setPlayer] = useState<PlayerStats | null>(null);
  const [monster, setMonster] = useState<CharacterStats | null>(null);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // 몬스터 턴 등 처리 중 플래그
	const [consecutiveMisses, setConsecutiveMisses] = useState(0); // 연속 빗나감 횟수
	const [recoveryCharges, setRecoveryCharges] = useState(5); // 회복 횟수 추가
  const [isSkillsOpen, setIsSkillsOpen] = useState(false); // 스킬 창 모달
  const [currentDungeonId, setCurrentDungeonId] = useState<string | null>(null); // 현재 던전 ID
  const [showBattleChoice, setShowBattleChoice] = useState(false); // 전투 후 선택 화면 표시 여부

  /**
   * 로그 추가 유틸리티
   */
  const addLog = (msg: string, type: LogType = 'normal') => {
    // timestamp + random 값으로 고유 ID 보장
    const id = Date.now() + getRandom(1, 1000); 
  	setLogMessages((prev) => [...prev, { id, msg, type }]);
  };
  
  const addLogs = (logs: Omit<LogMessage, 'id'>[]) => {
    const newLogs = logs.map((log, i) => ({
      ...log,
      id: Date.now() + i + getRandom(1, 1000),
    })); // 시간 순서대로 추가하기 위해 reverse
    setLogMessages((prev) => [...prev, ...newLogs]);
  };

  // 펫: 플레이어 턴 시작 시 자동 동작
  const applyPetStartOfTurn = (
    currentPlayer: PlayerStats,
    currentMonster: CharacterStats | null,
  ): { player: PlayerStats; monster: CharacterStats | null } => {
    if (!currentPlayer.pet || !currentMonster) return { player: currentPlayer, monster: currentMonster };
    const pet = currentPlayer.pet;
    const petLevel = (currentPlayer.petEnhanceLevels || {})[pet.id] || 0;
    const petBonus = petLevel * 0.05;
    if (pet.kind === 'attack') {
      const effective = getEffectivePlayerStats(currentPlayer);
      const dmg = Math.max(1, Math.floor(effective.atk * (pet.power + petBonus)));
      const nextMonster = { ...currentMonster, hp: Math.max(0, currentMonster.hp - dmg) };
      addLog(`${pet.icon} ${pet.name}이(가) 적을 공격! ${dmg} 피해 (적 HP: ${nextMonster.hp})`, 'atk');
      return { player: currentPlayer, monster: nextMonster };
    }
    if (pet.kind === 'heal') {
      const heal = Math.max(1, Math.floor(currentPlayer.maxHp * (pet.power + petBonus)));
      const nextHp = Math.min(currentPlayer.maxHp, currentPlayer.hp + heal);
      if (nextHp !== currentPlayer.hp) {
        addLog(`${pet.icon} ${pet.name}이(가) 치유의 가루를 뿌렸다! HP +${nextHp - currentPlayer.hp}`, 'normal');
      }
      return { player: { ...currentPlayer, hp: nextHp }, monster: currentMonster };
    }
    return { player: currentPlayer, monster: currentMonster };
  };

	/** 플레이어 유효 스탯 계산기
   * 플레이어의 기본 스탯과 장비 스탯을 합산하여
   * 전투에 실제 사용될 '유효 스탯' 객체를 반환합니다.
   */
  const getEffectivePlayerStats = (p: PlayerStats): CharacterStats => {
    const weaponAtk = p.weapon?.value || 0;
    const weaponEnhLevel = p.weapon ? ((p.weaponEnhanceLevels || {})[p.weapon.id] || 0) : 0;
    const weaponEnhBonus = weaponEnhLevel * 5; // 무기 강화: 레벨당 ATK +5
    const armorDef = p.armor?.value || 0;
    const armorEnhLevel = p.armor ? ((p.armorEnhanceLevels || {})[p.armor.id] || 0) : 0;
    const armorEnhBonus = armorEnhLevel * 5; // 방어구 강화: 레벨당 DEF +5

    // 활성 버프 합산
    const buffs = (p.activeBuffs || []).reduce((acc, b) => {
      acc.atk += b.bonuses.atk || 0;
      acc.def += b.bonuses.def || 0;
      acc.luk += b.bonuses.luk || 0;
      return acc;
    }, { atk: 0, def: 0, luk: 0 });

    return {
      name: p.name,
      level: p.level,
      hp: p.hp,
      maxHp: p.maxHp,
      atk: p.atk + weaponAtk + weaponEnhBonus + buffs.atk,
      def: p.def + armorDef + armorEnhBonus + buffs.def,
      luk: p.luk + buffs.luk,
      isDefending: p.isDefending,
    };
  };

  // 스킬 관련: 배울 수 있는지 검사 및 배우기
  const canLearnSkill = (p: PlayerStats, key: typeof allSkills[number]['key']): boolean => {
    const skill = allSkills.find(s => s.key === key);
    if (!skill) return false;
    if (p.skills.includes(key)) return false;
    if (p.level < skill.requiredLevel) return false;
    if (skill.allowedJobs && !skill.allowedJobs.includes(p.job)) return false;
    if ((p.skillPoints || 0) <= 0) return false;
    return true;
  };

  const learnSkill = (key: typeof allSkills[number]['key']) => {
    if (!player) return;
    if (!canLearnSkill(player, key)) {
      addLog('🚫 스킬을 배울 수 없습니다.', 'fail');
      return;
    }
    const skill = allSkills.find(s => s.key === key)!;
    const updated = {
      ...player,
      skillPoints: player.skillPoints - 1,
      skills: [...player.skills, key],
    };
    setPlayer(updated);
    addLog(`📘 "${skill.name}" 스킬을 습득했다!`, 'normal');
  };

  /**
   * 몬스터 턴 실행
   */
  const runMonsterTurn = (currentPlayer: PlayerStats, currentMonster: CharacterStats) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      addLog(`--- 몬스터의 턴 ---`, 'normal');

      // 몬스터 기절 체크
      if ((currentPlayer.monsterStunnedTurns || 0) > 0) {
        addLog(`💫 적이 기절하여 행동할 수 없다!`, 'fail');
        const nextPlayer = { ...currentPlayer, monsterStunnedTurns: (currentPlayer.monsterStunnedTurns || 0) - 1 };
        // 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, 'normal');
        const ticked = tickSkills(nextPlayer);
        const afterPet = applyPetStartOfTurn(ticked, currentMonster);
        setPlayer(afterPet.player);
        setMonster(afterPet.monster);
        if (afterPet.monster && afterPet.monster.hp <= 0) {
          handleBattleEnd('victory', afterPet.player, afterPet.monster);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }
      
      // 특수 방어 버프 처리 (배리어/완회)
      const barrierIdx = (currentPlayer.activeBuffs || []).findIndex(b => b.barrier);
      if (barrierIdx >= 0) {
        addLog(`🛡 배리어가 적의 공격을 완전히 막았다!`, 'normal');
        const nextBuffs = [...(currentPlayer.activeBuffs || [])];
        nextBuffs.splice(barrierIdx, 1); // 1회성 소모
        const updatedAfterBarrier = { ...currentPlayer, activeBuffs: nextBuffs };
        setPlayer(updatedAfterBarrier);
        addLog(`--- 플레이어의 턴 ---`, 'normal');
        const ticked = tickSkills(updatedAfterBarrier);
        const afterPet = applyPetStartOfTurn(ticked, currentMonster);
        setPlayer(afterPet.player);
        setMonster(afterPet.monster);
        if (afterPet.monster && afterPet.monster.hp <= 0) {
          handleBattleEnd('victory', afterPet.player, afterPet.monster);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }

      const hasEvade = (currentPlayer.activeBuffs || []).some(b => b.evadeAll);
      if (hasEvade) {
        addLog(`🍃 그림자처럼 공격을 모두 회피했다!`, 'fail');
        addLog(`--- 플레이어의 턴 ---`, 'normal');
        const ticked = tickSkills(currentPlayer);
        const afterPet = applyPetStartOfTurn(ticked, currentMonster);
        setPlayer(afterPet.player);
        setMonster(afterPet.monster);
        if (afterPet.monster && afterPet.monster.hp <= 0) {
          handleBattleEnd('victory', afterPet.player, afterPet.monster);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }

      // 약화(weaken) 적용
      const weaken = (currentPlayer.activeBuffs || []).find(b => (b.weakenPercent || 0) > 0)?.weakenPercent || 0;
      const attackerForTurn = weaken > 0 ? { ...currentMonster, atk: Math.max(1, Math.floor(currentMonster.atk * (1 - weaken))) } : currentMonster;

      // 몬스터가 플레이어 공격
			// 몬스터가 '유효 스탯'을 가진 플레이어를 공격
			const effectivePlayer = getEffectivePlayerStats(currentPlayer);
      const result = calculateAttack(attackerForTurn, effectivePlayer);
      addLogs(result.logs);

			// '유효 스탯' 객체에서 변경된 HP를 '실제' 플레이어 state에 반영
			let updatedPlayer = { ...currentPlayer, hp: result.defender.hp };
      setPlayer(updatedPlayer); // 몬스터가 공격했으므로 방어자는 플레이어

      // 반사/카운터 처리
      const reflect = (currentPlayer.activeBuffs || []).find(b => (b.reflectPercent || 0) > 0)?.reflectPercent || 0;
      const counter = (currentPlayer.activeBuffs || []).find(b => (b.counterDamage || 0) > 0)?.counterDamage || 0;
      let updatedMonster = { ...currentMonster };
      // 마지막 로그에서 데미지 파싱 (없으면 0)
      const last = result.logs[result.logs.length - 1];
      const match = last?.msg.match(/(\d+)의 데미지를/);
      const dealt = match ? parseInt(match[1], 10) : 0;
      if (reflect > 0 && dealt > 0) {
        const reflectDmg = Math.max(1, Math.floor(dealt * reflect));
        updatedMonster.hp = Math.max(0, updatedMonster.hp - reflectDmg);
        addLog(`🔁 가시 갑옷 반사! ${reflectDmg} 피해 (적 HP: ${updatedMonster.hp})`, 'atk');
      }
      if (counter > 0 && dealt > 0) {
        updatedMonster.hp = Math.max(0, updatedMonster.hp - counter);
        addLog(`🔪 반격 성공! ${counter} 피해 (적 HP: ${updatedMonster.hp})`, 'atk');
      }
      setMonster(updatedMonster);

      if (result.isBattleOver) {
        // 플레이어 패배
        handleBattleEnd('defeat', updatedPlayer);
      } else {
        // 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, 'normal');
        // 턴 시작 시 스킬 지속/쿨다운 감소 + 펫 동작
        const ticked = tickSkills(updatedPlayer);
        const afterPet = applyPetStartOfTurn(ticked, updatedMonster);
        setPlayer(afterPet.player);
        setMonster(afterPet.monster);
        if (afterPet.monster && afterPet.monster.hp <= 0) {
          handleBattleEnd('victory', afterPet.player, afterPet.monster);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
      }
    }, 1500); // 몬스터의 턴 딜레이
  };

  /**
   * 전투 종료 처리 (승리/패배/도망)
   */
  const handleBattleEnd = (
    type: 'victory' | 'defeat' | 'escape',
    updatedPlayer: PlayerStats,
    targetMonster?: CharacterStats,
  ) => {
		setConsecutiveMisses(0); // 전투 종료 시 빗나감 카운터 초기화
		setRecoveryCharges(5); // 전투 종료 시 회복 횟수 초기화
    let playerAfterBattle = { ...updatedPlayer };
    const logs: Omit<LogMessage, 'id'>[] = [];

    if (type === 'victory' && targetMonster) {
      logs.push({ msg: `🎉 전투에서 승리했다! ${targetMonster.name}을(를) 물리쳤다.`, type: 'vic' });
      playerAfterBattle.vicCount += 1;

      // 보상 획득 (원본 공식)
      const gainedExp = getRandom(5, 30) + (targetMonster.level * 60);
      const gainedGold = getRandom(10, 50) + (targetMonster.level * 30);
      
      playerAfterBattle.exp += gainedExp;
      playerAfterBattle.money += gainedGold;
      logs.push({ msg: `👑 ${gainedExp} Exp를 획득했다.`, type: 'gainExp' });
      logs.push({ msg: `💰 ${gainedGold} Gold를 획득했다.`, type: 'gainMoney' });

      // 레벨업 체크
      const levelUpResult = checkLevelUp(playerAfterBattle);
      playerAfterBattle = levelUpResult.newPlayer;
      logs.push(...levelUpResult.logs);
    } 
    else if (type === 'defeat') {
      logs.push({ msg: `☠️ 전투에서 패배했다...`, type: 'def' });
      playerAfterBattle.defCount += 1;
      // 경험치 30% 감소 (원본)
      playerAfterBattle.exp = Math.floor(playerAfterBattle.exp * 0.7);
      // HP 전체 회복 (원본)
      playerAfterBattle.hp = playerAfterBattle.maxHp; 
      logs.push({ msg: `😥 잠시 쉬고 일어나 체력을 모두 회복했다.`, type: 'normal' });
    }
    else if (type === 'escape') {
      logs.push({ msg: `💨 전투에서 도망쳤다...`, type: 'fail' });
    }

    addLogs(logs);
    setPlayer(playerAfterBattle);
    setMonster(null);
    setIsProcessing(false);
    setIsPlayerTurn(true); // 턴 초기화
    
    // 승리 시에만 계속/나가기 선택 표시, 패배/도망 시에는 던전으로 복귀
    if (type === 'victory') {
      setShowBattleChoice(true);
    } else {
      setGameState('dungeon');
    }
  };

  // 전투 후 계속하기
  const handleContinueBattle = () => {
    if (!player || !currentDungeonId) return;
    setShowBattleChoice(false);
    handleNextDungeon();
  };

  // 전투 후 던전 나가기
  const handleExitDungeon = () => {
    setShowBattleChoice(false);
    setCurrentDungeonId(null);
    setGameState('dungeon');
    addLog('🏘️ 던전에서 나와 마을로 돌아왔다.', 'normal');
  };

  // --- 1. 게임 시작 ---
  const gameStart = (name: string, job: Job) => {
    const newPlayer = createNewPlayer(name, job);
    setPlayer(newPlayer);
    setGameState('dungeon');
    addLog(`🥾 ${newPlayer.name} (${newPlayer.job}) (이)가 모험을 시작했다...`);
  };

  // --- 2. 던전 선택 및 액션 ---
  const handleSelectDungeon = (dungeonId: string) => {
    if (!player) return;
    
    const dungeon = dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;
    
    if (player.level < dungeon.requiredLevel) {
      addLog(`🚫 레벨이 부족합니다. 필요 레벨: ${dungeon.requiredLevel}`, 'fail');
      return;
    }
    
    setCurrentDungeonId(dungeonId);
    setGameState('dungeon');
    addLog(`🗺️ ${dungeon.icon} ${dungeon.name}에 입장했습니다.`, 'normal');
    // 던전 입장 직후 바로 탐색 시작
    handleNextDungeon(dungeon);
  };

  const handleOpenDungeonSelect = () => {
    if (isProcessing) return;
    setGameState('dungeonSelect');
  };

  const handleCloseDungeonSelect = () => {
    setGameState('dungeon');
  };

  const handleNextDungeon = (selectedDungeon?: Dungeon) => {
    if (isProcessing || !player) return;
    
    const dungeon = selectedDungeon || (currentDungeonId ? dungeons.find(d => d.id === currentDungeonId) : undefined);
    if (!dungeon) return;
    
    addLog("🧭 던전 안을 향해 들어가본다...");
    setIsProcessing(true); // 몬스터 등장 딜레이

    setTimeout(() => {
      const newMonster = makeMonster(player.level, dungeon.monsterLevelOffset);
      setMonster(newMonster);
      setGameState('battle');
      addLog(`👻 ${newMonster.name}이(가) 나타났다...!`, 'appear');

			setRecoveryCharges(5); // 전투 시작 시 회복 횟수 초기화

      // 선공 결정 (원본)
      if (getRandom(1, 100) <= 50) {
        addLog(`😁 선빵필승! ${player.name}은(는) 먼저 공격할 수 있다.`);
        // 턴 시작 시 스킬 지속/쿨다운 감소 + 펫 동작
        const ticked = tickSkills(player);
        const afterPet = applyPetStartOfTurn(ticked, newMonster);
        setPlayer(afterPet.player);
        setMonster(afterPet.monster);
        if (afterPet.monster && afterPet.monster.hp <= 0) {
          handleBattleEnd('victory', afterPet.player, afterPet.monster);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
      } else {
        addLog(`😰 칫! 기습인가? ${newMonster.name}이(가) 먼저 공격해 올 것이다.`);
        setIsPlayerTurn(false);
        runMonsterTurn(player, newMonster); // 몬스터가 즉시 턴 실행
      }
    }, 1000);
  };

  const handleDungeonRecovery = () => {
    if (isProcessing || !player) return;
    
    let newHp = player.hp + Math.floor(player.maxHp * 0.4); // 최대 체력의 40% 회복
    if (newHp > player.maxHp) {
      newHp = player.maxHp;
    }
    
    if (player.hp === newHp) {
      addLog(`😊 이미 체력이 가득 찼다. (HP: ${newHp})`, 'normal');
      return;
    }
    
    setPlayer({ ...player, hp: newHp });
    addLog(`😊 체력을 회복했다. (HP: ${newHp})`, 'normal');
  };

  // --- 3. 전투 액션 ---
  const handleAttack = () => {
    if (isProcessing || !isPlayerTurn || !player || !monster) return;

    setIsPlayerTurn(false); // 즉시 턴 종료
    
		// 1. 3회 연속 빗나감인지 확인 (3회 이상이면 보너스 발동)
    const isBonusAttack = consecutiveMisses >= 3; 

    // 2. calculateAttack에 보너스 여부(isBonusAttack) 전달
		// 플레이어의 '유효 스탯'으로 몬스터를 공격
		const effectivePlayer = getEffectivePlayerStats(player);
    // 차지 버프 적용 (다음 공격 강화)
    const chargeIdx = (player.activeBuffs || []).findIndex(b => (b.chargeAttackMultiplier || 0) > 0);
    let chargedStats = effectivePlayer;
    if (chargeIdx >= 0) {
      const mult = (player.activeBuffs || [])[chargeIdx].chargeAttackMultiplier || 0;
      chargedStats = { ...chargedStats, atk: Math.floor(chargedStats.atk * (1 + mult)) };
      // 일회성 소비
      const nextBuffs = [...(player.activeBuffs || [])];
      nextBuffs.splice(chargeIdx, 1);
      setPlayer({ ...player, activeBuffs: nextBuffs });
      addLog(`⚡️ 차지 에너지가 방출된다! (+${Math.floor(mult * 100)}% ATK)`, 'cri');
    }
    // true strike: 방어 무시
    const trueIdx = (player.activeBuffs || []).findIndex(b => b.trueStrikeNext);
    let defenderStats = monster;
    if (trueIdx >= 0) {
      defenderStats = { ...monster, def: 0 };
      const nextBuffs = [...(player.activeBuffs || [])];
      nextBuffs.splice(trueIdx, 1);
      setPlayer({ ...player, activeBuffs: nextBuffs });
      addLog(`🎯 방어를 꿰뚫는 일격!`, 'cri');
    }
    let result = calculateAttack(chargedStats, defenderStats, isBonusAttack);
    addLogs(result.logs);
    setMonster(result.defender);

    // 3. 결과에 따라 빗나감 카운터 업데이트
    if (result.didHit) {
      setConsecutiveMisses(0); // 명중! 카운터 초기화
    } else {
      setConsecutiveMisses((prev) => prev + 1); // 빗나감! 카운터 증가
      if (consecutiveMisses + 1 === 3) { // 방금 3스택이 되었다면
         addLog(`😡 오마에와 모 신데이루. 너는 내가 죽인다!`, 'cri');
      }
    }

    // 라이프스틸 적용
    const ls = (player.activeBuffs || []).find(b => (b.lifeStealPercent || 0) > 0)?.lifeStealPercent || 0;
    if (ls > 0) {
      const last = result.logs[result.logs.length - 1];
      const match = last?.msg.match(/(\d+)의 데미지를/);
      const dealt = match ? parseInt(match[1], 10) : 0;
      if (dealt > 0) {
        const heal = Math.max(1, Math.floor(dealt * ls));
        const healed = Math.min(player.maxHp, player.hp + heal);
        setPlayer(prev => prev ? { ...prev, hp: healed } : prev);
        addLog(`🩸 흡혈 효과! HP +${heal} (현재 ${Math.min(player.maxHp, player.hp + heal)})`, 'normal');
      }
    }

    // 멀티 스트라이크
    const msIdx = (player.activeBuffs || []).findIndex(b => b.multiStrikeNext);
    if (msIdx >= 0 && !result.isBattleOver) {
      const nextBuffs = [...(player.activeBuffs || [])];
      nextBuffs.splice(msIdx, 1);
      setPlayer(prev => prev ? { ...prev, activeBuffs: nextBuffs } : prev);
      addLog(`🔪 연속 타격!`, 'atk');
      const secondAttacker = { ...chargedStats, atk: Math.floor(chargedStats.atk * 0.6) };
      result = calculateAttack(secondAttacker, result.defender, false);
      addLogs(result.logs);
      setMonster(result.defender);
      // 라이프스틸 2타 적용
      if (ls > 0) {
        const last2 = result.logs[result.logs.length - 1];
        const m2 = last2?.msg.match(/(\d+)의 데미지를/);
        const dealt2 = m2 ? parseInt(m2[1], 10) : 0;
        if (dealt2 > 0) {
          const heal2 = Math.max(1, Math.floor(dealt2 * ls));
          setPlayer(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + heal2) } : prev);
          addLog(`🩸 흡혈 효과! HP +${heal2}`, 'normal');
        }
      }
    }

    if (result.isBattleOver) {
      // 몬스터 승리 (카운터는 handleBattleEnd에서 초기화됨)
      handleBattleEnd('victory', { ...player }, result.defender);
    } else {
      // 몬스터 턴 진행
      runMonsterTurn({ ...player }, result.defender);
    }
  };
  
  const handleDefend = () => {
    if (isProcessing || !isPlayerTurn || !player || !monster) return;

    setIsPlayerTurn(false); // 턴 종료
    const defendedPlayer = { ...player, isDefending: true };
    setPlayer(defendedPlayer);
    addLog(`🛡 ${player.name}이(가) 방어 태세를 취한다.`, 'normal');

    // 몬스터 턴 진행
    runMonsterTurn(defendedPlayer, monster);
  };
  
  const handleRecovery = () => {
    if (isProcessing || !isPlayerTurn || !player || !monster) return;

    // 횟수 체크
    if (recoveryCharges <= 0) {
      addLog(`🚫 회복 횟수를 모두 사용했다! (남은 횟수: 0)`, 'fail');
      // 턴을 종료하지 않고 다른 행동을 선택하게 함
      return; 
    }

    setIsPlayerTurn(false); // 턴 종료
    
    // 회복량 60%로 상향
    let newHp = player.hp + Math.floor(player.maxHp * 0.6); 
    if (newHp > player.maxHp) {
      newHp = player.maxHp;
    }

    if (player.hp === newHp) {
      addLog(`😊 이미 체력이 가득 찼다. (HP: ${newHp})`, 'normal');
      // 턴은 낭비했지만, 횟수는 차감하지 않음
    } else {
      // 횟수 차감 및 로그
      const newCharges = recoveryCharges - 1;
      setRecoveryCharges(newCharges); // 횟수 차감
      addLog(`😊 체력을 회복했다. (HP: ${newHp}, 남은 횟수: ${newCharges})`, 'normal');
    }
    
    const recoveredPlayer = { ...player, hp: newHp };
    setPlayer(recoveredPlayer);

    // 몬스터 턴 진행
    runMonsterTurn(recoveredPlayer, monster);
  };

  // 스킬 지속/쿨다운 틱 (플레이어 턴 시작 시)
  const tickSkills = (p: PlayerStats): PlayerStats => {
    const nextBuffs = (p.activeBuffs || [])
      .map(b => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
      .filter(b => b.remainingTurns > 0);
    const nextCooldowns: NonNullable<PlayerStats['skillCooldowns']> = { ...(p.skillCooldowns || {}) };
    Object.keys(nextCooldowns).forEach(k => {
      const key = k as keyof typeof nextCooldowns;
      if (typeof nextCooldowns[key] === 'number' && (nextCooldowns[key] as number) > 0) {
        nextCooldowns[key] = Math.max(0, (nextCooldowns[key] as number) - 1);
      }
    });
    return { ...p, activeBuffs: nextBuffs, skillCooldowns: nextCooldowns };
  };

  // 전투 중 스킬 사용
  const handleUseSkill = (key: typeof allSkills[number]['key']) => {
    if (isProcessing || !isPlayerTurn || !player || !monster) return;
    if (!player.skills.includes(key)) {
      addLog('🚫 습득하지 않은 스킬입니다.', 'fail');
      return;
    }
    const skill = allSkills.find(s => s.key === key);
    if (!skill) return;
    const cd = player.skillCooldowns?.[key] || 0;
    if (cd > 0) {
      addLog(`⏳ 스킬 쿨다운: ${cd}턴 남음`, 'fail');
      return;
    }

    setIsPlayerTurn(false); // 행동 소모

    if (skill.kind === 'buff') {
      const duration = skill.duration || 1;
      const bonuses = skill.bonuses || {};
      const extra: any = {};
      if (skill.effect?.type === 'evade') extra.evadeAll = true;
      if (skill.effect?.type === 'reflect') extra.reflectPercent = skill.effect.value;
      if (skill.effect?.type === 'barrier') extra.barrier = true;
      if (skill.effect?.type === 'charge') extra.chargeAttackMultiplier = skill.effect.value;
      if (skill.effect?.type === 'counter') extra.counterDamage = skill.effect.value;
      if (skill.effect?.type === 'lifesteal') extra.lifeStealPercent = skill.effect.value;
      if (skill.effect?.type === 'weaken') extra.weakenPercent = skill.effect.value;
      if (skill.effect?.type === 'multiStrike') extra.multiStrikeNext = true;
      if (skill.effect?.type === 'trueStrike') extra.trueStrikeNext = true;
      const updatedPlayer: PlayerStats = {
        ...player,
        activeBuffs: [ ...(player.activeBuffs || []), { key, remainingTurns: duration, bonuses, ...extra } ],
        skillCooldowns: { ...(player.skillCooldowns || {}), [key]: skill.cooldown },
      };
      setPlayer(updatedPlayer);
      addLog(`🛡 스킬 사용: ${skill.name} (지속 ${duration}턴)`, 'normal');
      // 몬스터 턴 진행
      runMonsterTurn(updatedPlayer, monster);
      return;
    }
    if (skill.effect?.type === 'timeStop') {
      // 추가 턴 획득: 행동 소모하되 턴 유지
      setPlayer({ ...player, skillCooldowns: { ...(player.skillCooldowns || {}), [key]: skill.cooldown } });
      addLog(`⏳ 시간 정지! 추가 턴을 얻었다.`, 'cri');
      setIsPlayerTurn(true);
      setIsProcessing(false);
      return;
    }

    if (skill.effect?.type === 'stun') {
      const turns = Math.max(1, Math.floor(skill.effect.value));
      const updated = { ...player, monsterStunnedTurns: (player.monsterStunnedTurns || 0) + turns };
      setPlayer({ ...updated, skillCooldowns: { ...(player.skillCooldowns || {}), [key]: skill.cooldown } });
      addLog(`🌀 적이 ${turns}턴 동안 기절했다!`, 'cri');
      // 스턴은 사용으로 행동 소모되고, 다음 몬스터 턴에 적용되어 스킵됨
      runMonsterTurn(updated, monster);
      return;
    }

    // 공격형 액티브: 강화된 공격 1회 수행
    const effectivePlayer = getEffectivePlayerStats(player);
    // 기본 공격 계산
    const result = calculateAttack(
      { ...effectivePlayer, atk: Math.floor(effectivePlayer.atk * (1 + (skill.attackBonusMultiplier || 0))) },
      monster,
      !!skill.guaranteedCrit,
    );
    addLogs([{ msg: `🔥 스킬 사용: ${skill.name}`, type: 'cri' }, ...result.logs]);
    setMonster(result.defender);

    // 쿨다운 부여
    setPlayer(prev => prev ? { ...prev, skillCooldowns: { ...(prev.skillCooldowns || {}), [key]: skill.cooldown } } : prev);

    if (result.isBattleOver) {
      handleBattleEnd('victory', { ...player }, result.defender);
    } else {
      runMonsterTurn({ ...player }, result.defender);
    }
  };
  
  const handleEscape = () => {
    if (isProcessing || !isPlayerTurn || !player || !monster) return;

    setIsPlayerTurn(false); // 턴 종료
    addLog(`🤫 ${player.name}은(는) 도망을 시도한다...`, 'normal');

    // 도망 확률 (원본 공식)
		// '유효 스탯'의 행운으로 도망 확률 계산
		const effectivePlayer = getEffectivePlayerStats(player);
    let escapeRate = 50;
    if (effectivePlayer.luk >= monster.luk * 2) {
      escapeRate = 100;
    }

    setTimeout(() => {
      if (getRandom(1, 100) <= escapeRate) {
        // 도망 성공
        handleBattleEnd('escape', { ...player });
      } else {
        // 도망 실패
        addLog(`😥 도망치는 데 실패했다...`, 'fail');
        runMonsterTurn({ ...player }, monster);
      }
    }, 1000); // 도망 시도 딜레이
  };

	// 상점 관련 액션
  const handleEnterShop = () => {
    addLog(`🛍 상점에 입장했습니다.`, 'normal');
    setGameState('shop');
  };

  const handleExitShop = () => {
    addLog(`🏘️ 마을로 돌아갑니다.`, 'normal');
    // 항상 홈(던전 메인)으로 복귀
    setGameState('dungeon');
  };

  // 스킬 창 (모달)
  const handleOpenSkills = () => {
    if (isProcessing) return;
    // 전투 중에는 스킬 배우기 창 접근 불가
    if (gameState === 'battle') {
      addLog(`🚫 전투 중에는 스킬을 배울 수 없습니다.`, 'fail');
      return;
    }
    addLog(`📘 스킬 수련장을 연다.`, 'normal');
    setIsSkillsOpen(true);
  };

  const handleCloseSkills = () => {
    addLog(`📕 스킬 수련장을 닫았다.`, 'normal');
    setIsSkillsOpen(false);
  };

  const handleBuyItem = (item: EquipmentItem) => {
    if (!player) return;

    // 돈 확인
    if (player.money < item.price) {
      addLog(`💰 골드가 부족합니다. (필요: ${item.price} G)`, 'fail');
      return;
    }
    
    // 구매 처리
    setPlayer(prevPlayer => {
      if (!prevPlayer) return null;
      const next = {
        ...prevPlayer,
        money: prevPlayer.money - item.price,
        ownedWeaponIds: item.type === 'weapon' ? [ ...(prevPlayer.ownedWeaponIds || []), item.id ] : (prevPlayer.ownedWeaponIds || []),
        ownedArmorIds: item.type === 'armor' ? [ ...(prevPlayer.ownedArmorIds || []), item.id ] : (prevPlayer.ownedArmorIds || []),
      };
      return next;
    });
    addLog(`✨ ${item.name}을(를) 구매했습니다! (장착은 장착하기 버튼)`, 'gainMoney');
  };

  // 펫 구매
  const handleBuyPet = (petId: string) => {
    if (!player) return;
    const petItem = petShopList.find(p => p.id === petId);
    if (!petItem) return;
    if (player.money < petItem.price) {
      addLog(`💰 골드가 부족합니다. (필요: ${petItem.price} G)`, 'fail');
      return;
    }
    setPlayer(prev => prev ? { ...prev, money: prev.money - petItem.price, ownedPetIds: [ ...(prev.ownedPetIds || []), petItem.id ] } : prev);
    addLog(`✨ 새로운 펫 획득! ${petItem.icon} ${petItem.name} (장착 가능)`, 'gainMoney');
  };

  // 장착 핸들러
  const handleEquipWeapon = (id: string) => {
    const all = weaponShopList;
    const found = all.find(w => w.id === id);
    if (!player || !found) return;
    if (!(player.ownedWeaponIds || []).includes(id)) {
      addLog('🚫 소유하지 않은 무기입니다.', 'fail');
      return;
    }
    setPlayer(prev => prev ? { ...prev, weapon: found } : prev);
    addLog(`⚔️ 무기 장착: ${found.name}`, 'normal');
  };
  const handleEquipArmor = (id: string) => {
    const all = armorShopList;
    const found = all.find(a => a.id === id);
    if (!player || !found) return;
    if (!(player.ownedArmorIds || []).includes(id)) {
      addLog('🚫 소유하지 않은 방어구입니다.', 'fail');
      return;
    }
    setPlayer(prev => prev ? { ...prev, armor: found } : prev);
    addLog(`🛡️ 방어구 장착: ${found.name}`, 'normal');
  };
  const handleEquipPet = (id: string) => {
    const found = petShopList.find(p => p.id === id);
    if (!player || !found) return;
    if (!(player.ownedPetIds || []).includes(id)) {
      addLog('🚫 소유하지 않은 펫입니다.', 'fail');
      return;
    }
    setPlayer(prev => prev ? { ...prev, pet: found } : prev);
    addLog(`🐾 펫 장착: ${found.icon} ${found.name}`, 'normal');
  };

  // 강화소 열기/닫기
  const handleOpenPetEnhance = () => {
    addLog(`🧪 펫 강화소에 입장했습니다.`, 'normal');
    setGameState('petEnhance');
  };
  const handleOpenWeaponEnhance = () => {
    addLog(`🔧 무기 강화소에 입장했습니다.`, 'normal');
    setGameState('weaponEnhance');
  };
  const handleCloseEnhance = () => {
    addLog(`🏘️ 마을로 돌아갑니다.`, 'normal');
    setGameState('dungeon');
  };

  // 강화 로직
  const getPetEnhanceCost = (level: number) => 100 + level * 100;
  const handleEnhancePet = () => {
    if (!player || !player.pet) {
      addLog(`🚫 강화할 펫이 없습니다.`, 'fail');
      return;
    }
    const petId = player.pet.id;
    const level = (player.petEnhanceLevels || {})[petId] || 0;
    const cost = getPetEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, 'fail');
      return;
    }
    const nextLevel = level + 1;
    setPlayer(prev => prev ? { ...prev, money: prev.money - cost, petEnhanceLevels: { ...(prev.petEnhanceLevels || {}), [petId]: nextLevel } } : prev);
    addLog(`🧪 펫 강화! 파워 +5% (누적 +${nextLevel * 5}%)`, 'lvup');
  };

  // 방어구 강화 (추가)
  const getArmorEnhanceCost = (level: number) => 150 + level * 150;
  const handleEnhanceArmor = () => {
    if (!player || !player.armor) {
      addLog(`🚫 강화할 방어구가 없습니다.`, 'fail');
      return;
    }
    const armorId = player.armor.id;
    const level = (player.armorEnhanceLevels || {})[armorId] || 0;
    const cost = getArmorEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, 'fail');
      return;
    }
    const nextLevel = level + 1;
    setPlayer(prev => prev ? { ...prev, money: prev.money - cost, armorEnhanceLevels: { ...(prev.armorEnhanceLevels || {}), [armorId]: nextLevel } } : prev);
    addLog(`🛡️ 방어구 강화! DEF +5 (강화 ${nextLevel}단)`, 'lvup');
  };

  const getWeaponEnhanceCost = (level: number) => 150 + level * 150;
  const handleEnhanceWeapon = () => {
    if (!player || !player.weapon) {
      addLog(`🚫 강화할 무기가 없습니다.`, 'fail');
      return;
    }
    const weaponId = player.weapon.id;
    const level = (player.weaponEnhanceLevels || {})[weaponId] || 0;
    const cost = getWeaponEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, 'fail');
      return;
    }
    const nextLevel = level + 1;
    setPlayer(prev => prev ? { ...prev, money: prev.money - cost, weaponEnhanceLevels: { ...(prev.weaponEnhanceLevels || {}), [weaponId]: nextLevel } } : prev);
    addLog(`🔧 무기 강화! ATK +5 (강화 ${nextLevel}단)`, 'lvup');
  };
  
  // 키보드 이벤트 핸들러 (단축키)
  const handleKeyDown = (key: string) => {
    if (isProcessing) return; // 처리 중일 땐 입력 무시

    if (gameState === 'dungeon') {
      if (key === 's') handleOpenDungeonSelect();
      if (key === 'r') handleDungeonRecovery();
			if (key === 'b') handleEnterShop();
      if (key === 'k') {
        if (isSkillsOpen) handleCloseSkills(); else handleOpenSkills();
      }
    } 
    else if (gameState === 'battle') {
      if (showBattleChoice) {
        // 전투 승리 후 선택
        if (key === 'c') handleContinueBattle();
        if (key === 'x') handleExitDungeon();
      } else if (isPlayerTurn) {
        // 일반 전투 중
        if (key === 'a') handleAttack();
        if (key === 'd') handleDefend();
        if (key === 'e') handleRecovery();
        if (key === 'q') handleEscape();
        // 전투 중에는 스킬 배우기 창 접근 불가
      }
    }
    // 모달 공통 단축키
    if (isSkillsOpen && (key === 'k' || key === 'q')) {
      handleCloseSkills();
    }
  };


  return {
    player,
    monster,
    logMessages,
    gameState,
    isPlayerTurn,
    isProcessing,
		recoveryCharges, // UI에 횟수를 표시하기 위해 추가
    consecutiveMisses, // (이전 요청에서 추가됨)
    skills: allSkills,
    isSkillsOpen,
    currentDungeonId,
    showBattleChoice,
    dungeons,
    shopLists: { weapons: weaponShopList, armors: armorShopList, pets: petShopList },
    actions: {
      gameStart,
      handleSelectDungeon,
      handleOpenDungeonSelect,
      handleNextDungeon,
      handleDungeonRecovery,
      handleAttack,
      handleDefend,
      handleRecovery,
      handleEscape,
      handleKeyDown,
			handleEnterShop, // 상점
      handleExitShop,
      handleBuyItem,
      handleBuyPet,
      handleEquipWeapon,
      handleEquipArmor,
      handleEquipPet,
      handleOpenPetEnhance,
      handleOpenWeaponEnhance,
      handleEnhanceArmor,
      handleCloseEnhance,
      handleEnhancePet,
      handleEnhanceWeapon,
      handleOpenSkills,
      handleCloseSkills,
      handleUseSkill,
      learnSkill,
      handleContinueBattle,
      handleExitDungeon,
      handleCloseDungeonSelect,
    },
  };
};