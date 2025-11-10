// src/components/BossRewardModal.tsx

import React from 'react';
import type { PlayerStats, BossReward, EquipmentItem } from '../game/types';

interface BossRewardModalProps {
  player: PlayerStats;
  reward: BossReward;
  onAction: (action: 'equip' | 'sell' | 'ignore', reward: BossReward) => void;
}

const BossRewardModal: React.FC<BossRewardModalProps> = ({ player, reward, onAction }) => {
  const { item, isDuplicate, isUsable, sellPrice } = reward;

  // 현재 장착된 아이템 정보 (비교용)
  const currentEquippedItem = item.type === 'weapon' ? player.weapon : player.armor;
  
  // 강화 레벨을 포함한 유효 스탯 계산
  const getCurrentValue = (item: EquipmentItem | null, type: 'weapon' | 'armor') => {
    if (!item) return 0;
    const level = type === 'weapon' 
      ? (player.weaponEnhanceLevels || {})[item.id] || 0
      : (player.armorEnhanceLevels || {})[item.id] || 0;
    return item.value + (level * 5); // 강화 1렙당 +5
  };

  const currentEquippedValue = getCurrentValue(currentEquippedItem, item.type);
  const newValue = item.value; // 새 아이템은 강화 레벨 0

  // 장착 버튼 비활성화 조건
  const isEquipDisabled = !isUsable;
  let equipButtonText = '장착하기';
  if (!isUsable) {
    equipButtonText = '장착 불가 (직업 제한)';
  } else if (currentEquippedItem?.id === item.id) {
    equipButtonText = '이미 장착중';
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 z-[55] bg-[rgba(0,0,0,0.7)] backdrop-blur-sm"
        onClick={() => onAction('ignore', reward)} // 배경 클릭 시 무시
      ></div>

      {/* 모달 컨텐츠 */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl font-stat" // max-w-lg -> max-w-md로 약간 줄임
          onClick={(e) => e.stopPropagation()} 
        >
          <h2 className="mb-4 text-2xl font-bold text-center">🏆 보스 전리품 획득!</h2>
          <div className="text-center mb-6">
            <p className="text-xl font-semibold text-blue-700">{item.name}</p>
            <p className="text-sm text-gray-600">
              {item.type === 'weapon' ? 'ATK' : 'DEF'} +{item.value} 
              {item.allowedJobs && item.allowedJobs.length > 0 && 
                <span className="ml-2 text-red-500">
                  { (item.allowedJobs.includes('전사') && item.allowedJobs.includes('마법사') && item.allowedJobs.includes('도적'))
                    ? '(직업 공용)'
                    : `(${item.allowedJobs.join('/')} 전용)`
                  }
                </span>
              }
            </p>
            {isDuplicate && <p className="text-sm text-yellow-600 mt-1">💡 이미 소유하고 있는 아이템입니다.</p>}
          </div>

          {/* 장비 비교 */}
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="text-lg font-semibold mb-2">현재 장비 비교</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{item.type === 'weapon' ? '현재 무기:' : '현재 방어구:'}</span>
              <span>{currentEquippedItem ? `${currentEquippedItem.name} (${item.type === 'weapon' ? 'ATK' : 'DEF'} +${currentEquippedValue})` : '없음'}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="font-medium">획득 장비:</span>
              <span className={newValue > currentEquippedValue ? 'text-green-600 font-bold' : (newValue < currentEquippedValue ? 'text-red-600' : '')}>
                {item.name} ({item.type === 'weapon' ? 'ATK' : 'DEF'} +{item.value})
                {newValue > currentEquippedValue && ' ▲'}
                {newValue < currentEquippedValue && ' ▼'}
              </span>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => onAction('equip', reward)}
              disabled={isEquipDisabled}
              className="rounded border border-gray-700 px-4 py-2 font-stat text-sm text-gray-800 
                         enabled:hover:bg-blue-700 enabled:hover:text-white
                         disabled:pointer-events-none disabled:opacity-50"
            >
              {equipButtonText}
            </button>
            <button
              onClick={() => onAction('sell', reward)}
              className="rounded border border-gray-700 px-4 py-2 font-stat text-sm text-gray-800 
                         hover:bg-yellow-500 hover:text-white"
            >
              판매하기 ({sellPrice} G)
            </button>
            <button
              onClick={() => onAction('ignore', reward)}
              className="rounded border border-gray-700 px-4 py-2 font-stat text-sm text-gray-800 
                         hover:bg-gray-200"
            >
              무시하기 (소유 목록에 추가)
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BossRewardModal;