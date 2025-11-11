// src/game/engineConstants.ts

import type { EquipmentItem } from './types';
import { weaponShopList, armorShopList } from '../game/shopItems';

/**
 * 각 직업별 기본 스탯 편차 (배율)
 * [HP, ATK, DEF, LUK]
 */
export const jobStatModifiers = {
  // 마법사: HP/DEF 낮음, ATK 높음
  "마법사": { hp: 1.0, atk: 1.5, def: 0.9, luk: 1.0 },
  // 전사: HP/DEF 높음, ATK/LUK 낮음
  "전사": { hp: 1.5, atk: 0.7, def: 1.3, luk: 0.8 },
  // 도적: LUK 높음, DEF 약간 낮음
  "도적": { hp: 1.0, atk: 1.0, def: 1.0, luk: 1.3 },
};

// 기본 무기 제공
export const STARTER_CLUB: EquipmentItem = {
  id: 'w_starter_club', // 상점 ID와 겹치지 않는 고유 ID
  name: '나무 몽둥이',
  type: 'weapon',
  value: 4, // 몽둥이 공격력
  price: 0, // 상점 아이템이 아님
  allowedJobs: ['전사', '마법사', '도적'], // 전직업 공용
};

// 보스 드롭 아이템 풀(Pool) 정의
const TIER_3_PLUS_WEAPON_IDS = ['w8', 'w9', 'w10', 'w11'];
const TIER_3_PLUS_ARMOR_IDS = ['a8', 'a9', 'a10', 'a11'];

const bossRewardWeaponPool = weaponShopList.filter(item => TIER_3_PLUS_WEAPON_IDS.includes(item.id));
const bossRewardArmorPool = armorShopList.filter(item => TIER_3_PLUS_ARMOR_IDS.includes(item.id));

// 전체 보상 풀
export const bossRewardPool = [...bossRewardWeaponPool, ...bossRewardArmorPool];