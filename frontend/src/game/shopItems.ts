import type { EquipmentItem, Job } from './types';

// 직업을 상수로 정의하여 재사용
const MAGE: Job[] = ['마법사'];
const WARRIOR: Job[] = ['전사'];
const ROGUE: Job[] = ['도적'];
const JOBALL: Job[] = ['전사', '마법사', '도적']; // 전직업 공용

export const weaponShopList: EquipmentItem[] = [
	// 1티어 장비
  { id: 'w1', name: '강철 단검', type: 'weapon', value: 5, price: 60, allowedJobs: ROGUE },
  { id: 'w2', name: '강철 검', type: 'weapon', value: 12, price: 60, allowedJobs: WARRIOR },
  { id: 'w3', name: '견습용 스태프', type: 'weapon', value: 18, price: 60, allowedJobs: MAGE },

	// 2티어 장비
	{ id: 'w4', name: '광전사의 대검', type: 'weapon', value: 40, price: 900, allowedJobs: WARRIOR },
  { id: 'w5', name: '현자의 스태프', type: 'weapon', value: 48, price: 1100, allowedJobs: MAGE },
  { id: 'w6', name: '그림자 단검', type: 'weapon', value: 44, price: 1000, allowedJobs: ROGUE },

  // 3티어 장비
  { id: 'w7', name: '용기사의 창', type: 'weapon', value: 65, price: 1800, allowedJobs: WARRIOR },
  { id: 'w8', name: '파멸의 오브', type: 'weapon', value: 75, price: 2100, allowedJobs: MAGE },
  { id: 'w9', name: '밤의 송곳니', type: 'weapon', value: 70, price: 1950, allowedJobs: ROGUE },

  // 4티어 장비
  { id: 'w10', name: '전설의 검 엑스칼리버', type: 'weapon', value: 100, price: 5000, allowedJobs: WARRIOR },
	{ id: 'w11', name: '깨달은 자의 낙서', type: 'weapon', value: 100, price: 5000, allowedJobs: MAGE },
	{ id: 'w12', name: '어쌔신 크리드', type: 'weapon', value: 100, price: 5000, allowedJobs: ROGUE },
];

export const armorShopList: EquipmentItem[] = [
	// 1티어 장비
  { id: 'a1', name: '가죽 갑옷', type: 'armor', value: 8, price: 70, allowedJobs: JOBALL },
  { id: 'a2', name: '강철 갑옷', type: 'armor', value: 15, price: 200, allowedJobs: WARRIOR },
  { id: 'a3', name: '마법사의 로브', type: 'armor', value: 22, price: 200, allowedJobs: MAGE },
  { id: 'a4', name: '그림자 갑옷', type: 'armor', value: 30, price: 200, allowedJobs: ROGUE },

	// 2티어 장비
  { id: 'a5', name: '기사의 갑옷', type: 'armor', value: 45, price: 950, allowedJobs: WARRIOR },
  { id: 'a6', name: '대마법사의 로브', type: 'armor', value: 38, price: 1050, allowedJobs: MAGE },
  { id: 'a7', name: '밤그림자 튜닉', type: 'armor', value: 42, price: 1000, allowedJobs: ROGUE },

  // 3티어 장비
  { id: 'a8', name: '임페리얼 아머', type: 'armor', value: 70, price: 1900, allowedJobs: WARRIOR },
  { id: 'a9', name: '공허의 로브', type: 'armor', value: 60, price: 2000, allowedJobs: MAGE },
  { id: 'a10', name: '어둠의 장막', type: 'armor', value: 65, price: 1950, allowedJobs: ROGUE },

  // 4티어 장비
  { id: 'a11', name: '신성한 수호 갑옷', type: 'armor', value: 120, price: 5500, allowedJobs: JOBALL },
];