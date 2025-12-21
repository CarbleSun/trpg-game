// src/game/playerLogic.ts

import type { PlayerStats, CharacterStats, Job, EquipmentItem, LogMessage } from './types';
import { ctrl } from '../game/constants';
import { jobStatModifiers, STARTER_CLUB } from './engineConstants';

/**
 * 신규 플레이어 스탯을 생성합니다.
 */
export const createNewPlayer = (name: string, job: Job): PlayerStats => {
  const level = 1;
  const { levUpVal, jobBonus } = ctrl;

  const bonus = jobBonus[job]; // [atk, def, luk] % 보너스
  const mod = jobStatModifiers[job]; // [hp, atk, def, luk] 기본 배율

  const atk = Math.floor((level * levUpVal.atk * mod.atk) * (1 + bonus[0] / 100));
  const def = Math.floor((level * levUpVal.def * mod.def) * (1 + bonus[1] / 100));
  const luk = Math.floor((level * levUpVal.luk * mod.luk) * (1 + bonus[2] / 100));
  const hp = Math.floor(((level * levUpVal.hp[0]) + (level * levUpVal.hp[1])) * mod.hp);
  
  const starterWeapon: EquipmentItem = STARTER_CLUB; 
  const starterWeaponId = starterWeapon?.id;

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
		weapon: starterWeapon,
    armor: null,
    pet: null,
    weaponEnhanceLevels: {},
    armorEnhanceLevels: {},
    petEnhanceLevels: {},
    ownedWeaponIds: [starterWeaponId],
    ownedArmorIds: [],
    ownedPetIds: [],
    skillPoints: 0,
    skills: [],
    skillUpgradeLevels: {},
  };
};

/**
 * 레벨업 처리
 */
export const checkLevelUp = (player: PlayerStats) => {
  let newPlayer = { ...player };
  const logs: Omit<LogMessage, 'id'>[] = [];

  if (newPlayer.exp < newPlayer.goalExp) {
    return { newPlayer, logs };
  }

  // 레벨 업!
  newPlayer.level += 1;
  logs.push({ msg: `🆙 레벨 업! 레벨 ${newPlayer.level}이(가) 되었다.`, type: 'lvup' });
  newPlayer.skillPoints = (newPlayer.skillPoints || 0) + 1;
  logs.push({ msg: `✨ 스킬 포인트 +1 (보유: ${newPlayer.skillPoints})`, type: 'lvup' });

  const { levUpVal, jobBonus } = ctrl;
  const bonus = jobBonus[newPlayer.job];
  const mod = jobStatModifiers[newPlayer.job];

  newPlayer.atk = Math.floor((newPlayer.level * levUpVal.atk * mod.atk) * (1 + bonus[0] / 100));
  newPlayer.def = Math.floor((newPlayer.level * levUpVal.def * mod.def) * (1 + bonus[1] / 100));
  newPlayer.luk = Math.floor((newPlayer.level * levUpVal.luk * mod.luk) * (1 + bonus[2] / 100));
  newPlayer.hp = Math.floor(((newPlayer.level * levUpVal.hp[0]) + (newPlayer.level * levUpVal.hp[1])) * mod.hp);
  newPlayer.maxHp = newPlayer.hp;
  newPlayer.exp = 0;
  newPlayer.goalExp = (newPlayer.level * 30) + (newPlayer.level * 120);

  return { newPlayer, logs };
};

/**
 * 플레이어의 기본 스탯과 장비, 버프 스탯을 합산합니다.
 */
export const getEffectivePlayerStats = (p: PlayerStats): CharacterStats => {
	// 장비 스텟 계산(무가)
  const weaponAtk = p.weapon?.value || 0;
  const weaponEnhLevel = p.weapon ? ((p.weaponEnhanceLevels || {})[p.weapon.id] || 0) : 0;
  const weaponEnhBonus = weaponEnhLevel * 5;

	// 장비 스텟 계산(방어구)
  const armorDef = p.armor?.value || 0;
  const armorEnhLevel = p.armor ? ((p.armorEnhanceLevels || {})[p.armor.id] || 0) : 0;
  const armorEnhBonus = armorEnhLevel * 5;

	// 버프의 고정 수치(덧셈) 합산
  const buffs = (p.activeBuffs || []).reduce((acc, b) => {
    acc.atk += b.bonuses.atk || 0;
    acc.def += b.bonuses.def || 0;
    acc.luk += b.bonuses.luk || 0;
    return acc;
  }, { atk: 0, def: 0, luk: 0 });

	// 기본 합산 (스탯 + 장비 + 버프고정수치)
	let finalAtk = p.atk + weaponAtk + weaponEnhBonus + buffs.atk;
  let finalDef = p.def + armorDef + armorEnhBonus + buffs.def;
	let finalLuk = p.luk + buffs.luk;

	// 버프의 배율(곱셈) 적용
	if (p.activeBuffs) {
    p.activeBuffs.forEach(buff => {
      // defenseMultiplier가 존재하면 곱해줍니다. (예: 0.7이면 방어력 30% 감소)
      if (buff.defenseMultiplier !== undefined) {
        finalDef = Math.floor(finalDef * buff.defenseMultiplier);
      }
    });
  }

	// 음수 방지
	finalDef = Math.max(0, finalDef);

  return {
    name: p.name,
    level: p.level,
    hp: p.hp,
    maxHp: p.maxHp,
    atk: finalAtk,
    def: finalDef,
    luk: finalLuk,
    isDefending: p.isDefending,
  };
};