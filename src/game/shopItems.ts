import type { EquipmentItem } from './types';

export const weaponShopList: EquipmentItem[] = [
  { id: 'w1', name: '낡은 단검', type: 'weapon', value: 5, price: 50 },
  { id: 'w2', name: '강철 검', type: 'weapon', value: 12, price: 150 },
  { id: 'w3', name: '마법사의 지팡이', type: 'weapon', value: 18, price: 300 },
  { id: 'w4', name: '암살자의 검', type: 'weapon', value: 25, price: 500 },
];

export const armorShopList: EquipmentItem[] = [
  { id: 'a1', name: '가죽 갑옷', type: 'armor', value: 8, price: 70 },
  { id: 'a2', name: '강철 갑옷', type: 'armor', value: 15, price: 180 },
  { id: 'a3', name: '마법사의 로브', type: 'armor', value: 22, price: 320 },
  { id: 'a4', name: '그림자 갑옷', type: 'armor', value: 30, price: 550 },
];