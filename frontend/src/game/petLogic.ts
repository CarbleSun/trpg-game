// src/game/petLogic.ts

import type { PlayerStats, CharacterStats, LogMessage } from './types';

type PetTurnResult = {
  player: PlayerStats;
  monster: CharacterStats | null;
  logs: Omit<LogMessage, 'id'>[];
};

/**
 * 펫: 플레이어 턴 시작 시 자동 동작
 */
export const applyPetStartOfTurn = (
  currentPlayer: PlayerStats,
  currentMonster: CharacterStats | null,
  getEffectivePlayerStats: (p: PlayerStats) => CharacterStats // 의존성 주입
): PetTurnResult => {
  const logs: Omit<LogMessage, 'id'>[] = [];
  if (!currentPlayer.pet || !currentMonster) {
    return { player: currentPlayer, monster: currentMonster, logs };
  }
  
  const pet = currentPlayer.pet;
  const petLevel = (currentPlayer.petEnhanceLevels || {})[pet.id] || 0;
  const petBonus = petLevel * 0.05;

  if (pet.kind === 'attack') {
    const effective = getEffectivePlayerStats(currentPlayer);
    const dmg = Math.max(1, Math.floor(effective.atk * (pet.power + petBonus)));
    const nextMonster = { ...currentMonster, hp: Math.max(0, currentMonster.hp - dmg) };
    logs.push({ 
      msg: `${pet.icon} ${pet.name}이(가) 적을 공격! ${dmg} 피해 (적 HP: ${nextMonster.hp})`, 
      type: 'atk' 
    });
    return { player: currentPlayer, monster: nextMonster, logs };
  }

  if (pet.kind === 'heal') {
    const heal = Math.max(1, Math.floor(currentPlayer.maxHp * (pet.power + petBonus)));
    const nextHp = Math.min(currentPlayer.maxHp, currentPlayer.hp + heal);
    if (nextHp !== currentPlayer.hp) {
      logs.push({ 
        msg: `${pet.icon} ${pet.name}이(가) 치유의 가루를 뿌렸다! HP +${nextHp - currentPlayer.hp}`, 
        type: 'normal' 
      });
    }
    return { player: { ...currentPlayer, hp: nextHp }, monster: currentMonster, logs };
  }
  
  return { player: currentPlayer, monster: currentMonster, logs };
};