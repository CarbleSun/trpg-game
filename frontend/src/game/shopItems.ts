import type { EquipmentItem, Job } from './types';

// 직업을 상수로 정의하여 재사용
const MAGE: Job[] = ['마법사'];
const WARRIOR: Job[] = ['전사'];
const ROGUE: Job[] = ['도적'];
const JOBALL: Job[] = ['전사', '마법사', '도적']; // 전직업 공용

export const weaponShopList: EquipmentItem[] = [
	// 1티어 장비
  { id: 'w1', name: '강철 단검', type: 'weapon', value: 5, price: 60, allowedJobs: ROGUE, requiredLevel: 1 },
  { id: 'w2', name: '강철 검', type: 'weapon', value: 12, price: 60, allowedJobs: WARRIOR, requiredLevel: 1 },
  { id: 'w3', name: '견습용 스태프', type: 'weapon', value: 18, price: 60, allowedJobs: MAGE, requiredLevel: 1 },

	// 2티어 장비
	{ id: 'w4', name: '광전사의 대검', type: 'weapon', value: 40, price: 900, allowedJobs: WARRIOR, requiredLevel: 10 },
  { id: 'w5', name: '현자의 스태프', type: 'weapon', value: 48, price: 1100, allowedJobs: MAGE, requiredLevel: 10 },
  { id: 'w6', name: '그림자 단검', type: 'weapon', value: 44, price: 1000, allowedJobs: ROGUE, requiredLevel: 10 },

  // 3티어 장비
  { id: 'w7', name: '용기사의 창', type: 'weapon', value: 65, price: 1800, allowedJobs: WARRIOR, requiredLevel: 20 },
  { id: 'w8', name: '파멸의 오브', type: 'weapon', value: 75, price: 2100, allowedJobs: MAGE, requiredLevel: 20 },
  { id: 'w9', name: '밤의 송곳니', type: 'weapon', value: 70, price: 1950, allowedJobs: ROGUE, requiredLevel: 20 },

  // 4티어 장비
  { id: 'w10', name: '전설의 검 엑스칼리버', type: 'weapon', value: 100, price: 5000, allowedJobs: WARRIOR, requiredLevel: 30 },
	{ id: 'w11', name: '깨달은 자의 낙서', type: 'weapon', value: 100, price: 5000, allowedJobs: MAGE, requiredLevel: 30 },
	{ id: 'w12', name: '어쌔신 크리드', type: 'weapon', value: 100, price: 5000, allowedJobs: ROGUE, requiredLevel: 30 },
];

export const armorShopList: EquipmentItem[] = [
	// 1티어 장비
  { id: 'a1', name: '가죽 갑옷', type: 'armor', value: 8, price: 70, allowedJobs: JOBALL, requiredLevel: 1 },
  { id: 'a2', name: '강철 갑옷', type: 'armor', value: 15, price: 200, allowedJobs: WARRIOR, requiredLevel: 1 },
  { id: 'a3', name: '마법사의 로브', type: 'armor', value: 22, price: 200, allowedJobs: MAGE, requiredLevel: 1 },
  { id: 'a4', name: '그림자 갑옷', type: 'armor', value: 30, price: 200, allowedJobs: ROGUE, requiredLevel: 1 },

	// 2티어 장비
  { id: 'a5', name: '기사의 갑옷', type: 'armor', value: 45, price: 950, allowedJobs: WARRIOR, requiredLevel: 10 },
  { id: 'a6', name: '대마법사의 로브', type: 'armor', value: 38, price: 1050, allowedJobs: MAGE, requiredLevel: 10 },
  { id: 'a7', name: '밤그림자 튜닉', type: 'armor', value: 42, price: 1000, allowedJobs: ROGUE, requiredLevel: 10 },

  // 3티어 장비
  { id: 'a8', name: '임페리얼 아머', type: 'armor', value: 70, price: 1900, allowedJobs: WARRIOR, requiredLevel: 20 },
  { id: 'a9', name: '공허의 로브', type: 'armor', value: 60, price: 2000, allowedJobs: MAGE, requiredLevel: 20 },
  { id: 'a10', name: '어둠의 장막', type: 'armor', value: 65, price: 1950, allowedJobs: ROGUE, requiredLevel: 20 },

  // 4티어 장비
  { id: 'a11', name: '신성한 수호 갑옷', type: 'armor', value: 120, price: 5500, allowedJobs: JOBALL, requiredLevel: 30 },
];

// 보스 전용 드롭 아이템 추가
export const bossExclusiveWeapons: EquipmentItem[] = [
  { id: 'bw_1', name: '마왕의 검: 라그나로크', type: 'weapon', value: 180, price: 15000, allowedJobs: WARRIOR, requiredLevel: 40 },
  { id: 'bw_2', name: '고대 용의 지팡이', type: 'weapon', value: 195, price: 16000, allowedJobs: MAGE, requiredLevel: 40 },
  { id: 'bw_3', name: '영혼을 베는 낫', type: 'weapon', value: 185, price: 15500, allowedJobs: ROGUE, requiredLevel: 40 },
  { id: 'bw_4', name: '[신화] 무적의 두줄 작대기', type: 'weapon', value: 250, price: 50000, allowedJobs: JOBALL, requiredLevel: 45 }, // 초레어
];

export const bossExclusiveArmors: EquipmentItem[] = [
  { id: 'ba_1', name: '드래곤 스케일 메일', type: 'armor', value: 150, price: 14000, allowedJobs: WARRIOR, requiredLevel: 40},
  { id: 'ba_2', name: '대현자의 로브', type: 'armor', value: 130, price: 14500, allowedJobs: MAGE, requiredLevel: 40 },
  { id: 'ba_3', name: '그림자 군주의 망토', type: 'armor', value: 140, price: 14200, allowedJobs: ROGUE, requiredLevel: 40 },
  { id: 'ba_4', name: '[신화] 불멸의 갑옷', type: 'armor', value: 220, price: 45000, allowedJobs: JOBALL, requiredLevel: 45 }, // 초레어
];