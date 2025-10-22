import { useState } from 'react';
import type {
  PlayerStats,
  CharacterStats,
  Job,
  GameState,
  LogMessage,
  LogType,
  BattleResult,
} from '../game/types';
import { ctrl, monsterList } from '../game/constants';
import { getRandom } from '../game/utils';

// --- 순수 계산 함수 (rpg.js 로직 포팅) ---

/**
 * 신규 플레이어 스탯을 생성합니다.
 */
const createNewPlayer = (name: string, job: Job): PlayerStats => {
  const level = 1;
  const { levUpVal, jobBonus } = ctrl;

  const bonus = jobBonus[job]; // [atk, def, luk]

  const atk = Math.floor((level * levUpVal.atk) * (1 + bonus[0] / 100));
  const def = Math.floor((level * levUpVal.def) * (1 + bonus[1] / 100));
  const luk = Math.floor((level * levUpVal.luk) * (1 + bonus[2] / 100));
  const hp = (level * levUpVal.hp[0]) + (level * levUpVal.hp[1]);
  
  return {
    name,
    job,
    level,
    hp,
    maxHp: hp,
    atk,
    def,
    luk,
    exp: 0,
    money: 0,
    goalExp: (level * 30) + (level * 120),
    vicCount: 0,
    defCount: 0,
  };
};

/**
 * 레벨에 맞는 몬스터를 생성합니다.
 */
const makeMonster = (playerLevel: number): CharacterStats => {
  let monsterLevel = playerLevel - 1;
  if (monsterLevel < 0) monsterLevel = 0;
  if (monsterLevel >= Object.keys(monsterList).length) {
    monsterLevel = Object.keys(monsterList).length - 1;
  }
  
  const list = monsterList[monsterLevel];
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
 * 공격 계산 로직 (수정됨: 3스택 보너스 공격 추가)
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

  // 3. 데미지 0 이하
  if (damage <= 0) {
    damage = 0;
    const isAttackerPlayer = 'job' in newAttacker;
    // (플레이어이고, 보너스 공격이 아닐 때) 최소 1 데미지
    if (isAttackerPlayer && !isGuaranteedHit) { 
      damage = 1;
      logs.push({ msg: `🛡 몬스터가 간신히 막았지만 1의 데미지를 입혔다!`, type: 'atk' });
      didHit = true;
    } 
    // (몬스터이거나, 보너스 공격인데 데미지가 0일 때)
    // 보너스 공격은 아래에서 데미지를 추가할 것이므로 0으로 놔둔다.
    // 몬스터 공격은 빗나간다.
    else if (!isAttackerPlayer) { 
      logs.push({ msg: `😓 공격에 실패했다...`, type: 'fail' });
      didHit = false;
      return { logs, attacker: newAttacker, defender: newDefender, isBattleOver, didHit };
    }
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
  if (!didHit && damage > 0) { // (크리티컬X, 회피X, 보너스X, 데미지 1보장)
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
 * 레벨업 처리 (rpg.js의 levelUp 메서드 포팅)
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

  const { levUpVal, jobBonus } = ctrl;
  const bonus = jobBonus[newPlayer.job]; // [atk, def, luk]

  // 스탯 재계산
  newPlayer.atk = Math.floor((newPlayer.level * levUpVal.atk) * (1 + bonus[0] / 100));
  newPlayer.def = Math.floor((newPlayer.level * levUpVal.def) * (1 + bonus[1] / 100));
  newPlayer.luk = Math.floor((newPlayer.level * levUpVal.luk) * (1 + bonus[2] / 100));
  newPlayer.hp = (newPlayer.level * levUpVal.hp[0]) + (newPlayer.level * levUpVal.hp[1]);
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

  /**
   * 몬스터 턴 실행
   */
  const runMonsterTurn = (currentPlayer: PlayerStats, currentMonster: CharacterStats) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      addLog(`--- 몬스터의 턴 ---`, 'normal');
      
      // 몬스터가 플레이어 공격
      const result = calculateAttack(currentMonster, currentPlayer);
      addLogs(result.logs);
      setPlayer(result.defender as PlayerStats); // 몬스터가 공격했으므로 방어자는 플레이어

      if (result.isBattleOver) {
        // 플레이어 패배
        handleBattleEnd('defeat', result.defender as PlayerStats);
      } else {
        // 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, 'normal');
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
    setGameState('dungeon');
    setIsProcessing(false);
    setIsPlayerTurn(true); // 턴 초기화
  };

  // --- 1. 게임 시작 ---
  const gameStart = (name: string, job: Job) => {
    const newPlayer = createNewPlayer(name, job);
    setPlayer(newPlayer);
    setGameState('dungeon');
    addLog(`🥾 ${newPlayer.name} (${newPlayer.job}) (이)가 던전에 들어왔다...`);
  };

  // --- 2. 던전 액션 ---
  const handleNextDungeon = () => {
    if (isProcessing || !player) return;
    
    addLog("🧭 던전 안을 향해 들어가본다...");
    setIsProcessing(true); // 몬스터 등장 딜레이

    setTimeout(() => {
      const newMonster = makeMonster(player.level);
      setMonster(newMonster);
      setGameState('battle');
      addLog(`👻 ${newMonster.name}이(가) 나타났다...!`, 'appear');

      // 선공 결정 (원본)
      if (getRandom(1, 100) <= 50) {
        addLog(`😁 선빵필승! ${player.name}은(는) 먼저 공격할 수 있다.`);
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
    const result = calculateAttack(player, monster, isBonusAttack);
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

    setIsPlayerTurn(false); // 턴 종료
    
    let newHp = player.hp + Math.floor(player.maxHp * 0.4); // 40% 회복
    if (newHp > player.maxHp) {
      newHp = player.maxHp;
    }

    if (player.hp === newHp) {
      addLog(`😊 이미 체력이 가득 찼다. (HP: ${newHp})`, 'normal');
    } else {
      addLog(`😊 체력을 회복했다. (HP: ${newHp})`, 'normal');
    }
    
    const recoveredPlayer = { ...player, hp: newHp };
    setPlayer(recoveredPlayer);

    // 몬스터 턴 진행
    runMonsterTurn(recoveredPlayer, monster);
  };
  
  const handleEscape = () => {
    if (isProcessing || !isPlayerTurn || !player || !monster) return;

    setIsPlayerTurn(false); // 턴 종료
    addLog(`🤫 ${player.name}은(는) 도망을 시도한다...`, 'normal');

    // 도망 확률 (원본 공식)
    let escapeRate = 50;
    if (player.luk >= monster.luk * 2) {
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
  
  // 키보드 이벤트 핸들러 (단축키)
  const handleKeyDown = (key: string) => {
    if (isProcessing) return; // 처리 중일 땐 입력 무시

    if (gameState === 'dungeon') {
      if (key === 's') handleNextDungeon();
      if (key === 'r') handleDungeonRecovery();
    } 
    else if (gameState === 'battle' && isPlayerTurn) {
      if (key === 'a') handleAttack();
      if (key === 'd') handleDefend();
      if (key === 'e') handleRecovery();
      if (key === 'q') handleEscape();
    }
  };


  return {
    player,
    monster,
    logMessages,
    gameState,
    isPlayerTurn,
    isProcessing,
    actions: {
      gameStart,
      handleNextDungeon,
      handleDungeonRecovery,
      handleAttack,
      handleDefend,
      handleRecovery,
      handleEscape,
      handleKeyDown,
    },
  };
};