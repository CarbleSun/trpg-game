// src/game/battleLogic.ts

import type { CharacterStats, BattleResult } from './types';
import { getRandom } from '../game/utils';

/**
 * 공격 계산 로직
 */
export const calculateAttack = (
  attacker: CharacterStats,
  defender: CharacterStats,
  isGuaranteedHit: boolean = false
): BattleResult & { didHit: boolean } => {
  const logs: Omit<BattleResult['logs'][0], 'id'>[] = [];
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
    if (!isGuaranteedHit) { 
      logs.push({ msg: `😓 ${newAttacker.name}의 공격이 막혔다! (0 데미지)`, type: 'fail' });
      didHit = false; 
      const isAttackerPlayer = 'job' in newAttacker;
      if (!isAttackerPlayer) {
        return { logs, attacker: newAttacker, defender: newDefender, isBattleOver, didHit };
      }
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
  if (isCritical) {
    damage *= 2;
    didHit = true;
  }

  // 5. 회피
  if (!isCritical && !isGuaranteedHit) {
    let evadeRate = 1;
    const lukDiff = newDefender.luk - newAttacker.luk;
    if (lukDiff > 0) evadeRate = 5;
    if (newDefender.luk >= newAttacker.luk * 2) evadeRate = 30;
    if (newDefender.luk >= newAttacker.luk * 3) evadeRate = 50;
    const isAttackerPlayer = 'job' in newAttacker;
    const isDefenderPlayer = 'job' in newDefender;
    if (isAttackerPlayer) {
      evadeRate = Math.floor(evadeRate * 0.3);
    } else if (isDefenderPlayer) {
      evadeRate = Math.floor(evadeRate * 1.5);
    }
    if (getRandom(1, 100) <= evadeRate) {
      logs.push({ msg: `🍃 ${newDefender.name}이(가) 공격을 회피했다.`, type: 'fail' });
      didHit = false;
      return { logs, attacker: newAttacker, defender: newDefender, isBattleOver, didHit };
    }
  }

  // 6. 3회 빗나감 보너스
  if (isGuaranteedHit) {
    logs.push({ msg: `🔥 "WRYYYYYYYY!!!!!!! 로드롤러다!!!!!!!!"`, type: 'cri' });
    const minBonusDmg = Math.floor(newAttacker.atk * 0.5);
    damage = Math.max(damage, minBonusDmg);
    const bonusDamage = Math.floor(damage * 0.5 + newAttacker.luk);
    damage += bonusDamage;
    logs.push({ msg: `✨ 집중력의 일격! ${bonusDamage}의 추가 데미지!`, type: 'vic' });
    didHit = true;
  }

  // 7. 최종 데미지
  if (!didHit && damage > 0) {
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