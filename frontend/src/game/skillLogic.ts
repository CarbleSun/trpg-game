// src/game/skillLogic.ts

import type { PlayerStats, SkillKey } from './types';
import { skills as allSkills } from '../game/constants';

type TickableEntity = {
  activeBuffs?: PlayerStats['activeBuffs']; // (PlayerStats와 BossStats의 activeBuffs 타입이 동일함)
  skillCooldowns?: PlayerStats['skillCooldowns'];
}

/**
 * 스킬 지속/쿨다운 틱 (제네릭으로 수정)
 */
export const tickSkills = <T extends TickableEntity>(p: T): T => {
  const nextBuffs = (p.activeBuffs || [])
    .map(b => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
    .filter(b => b.remainingTurns > 0);

  const nextCooldowns: NonNullable<TickableEntity['skillCooldowns']> = { ...(p.skillCooldowns || {}) };
  Object.keys(nextCooldowns).forEach(k => {
    const key = k as keyof typeof nextCooldowns;
    if (typeof nextCooldowns[key] === 'number' && (nextCooldowns[key] as number) > 0) {
      nextCooldowns[key] = Math.max(0, (nextCooldowns[key] as number) - 1);
    }
  });
  
  // 입력받은 타입 T와 동일한 타입 T를 반환
  return { ...p, activeBuffs: nextBuffs, skillCooldowns: nextCooldowns };
};

/**
 * 스킬을 배울 수 있는지 검사
 */
export const canLearnSkill = (p: PlayerStats, key: SkillKey): boolean => {
  const skill = allSkills.find(s => s.key === key);
  if (!skill) return false;
  if (p.level < skill.requiredLevel) return false;
  if (skill.allowedJobs && !skill.allowedJobs.includes(p.job)) return false;
  if ((p.skillPoints || 0) <= 0) return false;

  const currentLevel = (p.skillUpgradeLevels || {})[key] || 0;
	
	// 데이터에 maxLevel이 있으면 그걸 쓰고, 없으면 기본 5
	const masterLevel = skill.maxLevel || 5;

  if (currentLevel >= masterLevel) return false; // 최대 레벨
  return true;
};