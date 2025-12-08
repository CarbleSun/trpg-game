// src/components/NormalDropModal.tsx

import React from 'react';
import type { PlayerStats, BossReward, EquipmentItem } from '../game/types';

interface NormalDropModalProps {
  player: PlayerStats;
  reward: BossReward; // 데이터 구조는 BossReward를 재사용 (item, isDuplicate 등 동일)
  onAction: (action: 'equip' | 'sell' | 'ignore', reward: BossReward) => void;
}

const NormalDropModal: React.FC<NormalDropModalProps> = ({ player, reward, onAction }) => {
  const { item, isDuplicate, sellPrice } = reward;

  // 현재 장착된 아이템 정보 (비교용)
  const currentEquippedItem = item.type === 'weapon' ? player.weapon : player.armor;
  
  // 강화 레벨을 포함한 유효 스탯 계산
  const getCurrentValue = (item: EquipmentItem | null, type: 'weapon' | 'armor') => {
    if (!item) return 0;
    const level = type === 'weapon' 
      ? (player.weaponEnhanceLevels || {})[item.id] || 0
      : (player.armorEnhanceLevels || {})[item.id] || 0;
    return item.value + (level * 5);
  };

  const currentEquippedValue = getCurrentValue(currentEquippedItem, item.type);
  const newValue = item.value;

	// 장착 불가 사유 판별 로직
  const jobCanUse = !item.allowedJobs || item.allowedJobs.includes(player.job);
  const levelCanUse = !item.requiredLevel || player.level >= item.requiredLevel;
	const isEquipped = currentEquippedItem?.id === item.id;

  const isEquipDisabled = !jobCanUse || !levelCanUse || isEquipped;

  let equipButtonText = '장착하기';
  if (!jobCanUse) {
    equipButtonText = '장착 불가 (직업 제한)';
  } else if (!levelCanUse) {
    equipButtonText = `장착 불가 (필요 Lv.${item.requiredLevel})`;
  } else if (currentEquippedItem?.id === item.id) {
    equipButtonText = '이미 장착중';
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-55 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
        onClick={() => onAction('ignore', reward)}
      ></div>

      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg font-stat border border-gray-200"
          onClick={(e) => e.stopPropagation()} 
        >
          {/* 헤더: 보스보다 덜 화려하게 */}
          <h2 className="mb-4 text-xl font-bold text-center text-gray-800">
            📦 아이템 발견!
          </h2>

          <div className="text-center mb-6">
            <p className="text-lg font-bold text-blue-600">{item.name}</p>
            <p className="text-sm text-gray-600 mt-1">
              {item.type === 'weapon' ? 'ATK' : 'DEF'} +{item.value} 

							{/* 레벨 제한 표시 */}
              {item.requiredLevel && (
                <span className={`ml-2 text-xs font-bold ${levelCanUse ? 'text-blue-600' : 'text-red-500'}`}>
                  Lv.{item.requiredLevel}
                </span>
              )}

							{/* 직업 제한 표시 */}
              {item.allowedJobs && item.allowedJobs.length > 0 && 
                <span className="ml-2 text-gray-500 text-xs">
                  { (item.allowedJobs.includes('전사') && item.allowedJobs.includes('마법사') && item.allowedJobs.includes('도적'))
                    ? '(공용)'
                    : `(${item.allowedJobs.join('/')})`
                  }
                </span>
              }
            </p>
            {isDuplicate && <p className="text-xs text-orange-500 mt-1">이미 보유 중</p>}
          </div>

          {/* 장비 비교 (간소화) */}
          <div className="bg-gray-50 p-3 rounded border border-gray-100 mb-5 text-sm">
            <div className="flex justify-between items-center text-gray-600">
              <span>착용 중:</span>
              <span>{currentEquippedItem ? `${currentEquippedItem.name} (+${currentEquippedValue})` : '없음'}</span>
            </div>
            <div className="flex justify-between items-center mt-1 font-bold">
              <span>획득:</span>
              <span className={newValue > currentEquippedValue ? 'text-green-600' : (newValue < currentEquippedValue ? 'text-red-500' : 'text-gray-800')}>
                {item.name} (+{item.value})
                {newValue > currentEquippedValue && ' ▲'}
              </span>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            <button
              onClick={() => onAction('equip', reward)}
              disabled={isEquipDisabled}
              className="flex-1 rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {equipButtonText}
            </button>
            <button
              onClick={() => onAction('sell', reward)}
              className="flex-1 rounded bg-yellow-500 py-2 text-sm text-white hover:bg-yellow-600"
            >
              판매 ({sellPrice} G)
            </button>
          </div>
          <button
            onClick={() => onAction('ignore', reward)}
            className="mt-2 w-full rounded border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            가방에 넣기 (무시)
          </button>
        </div>
      </div>
    </>
  );
};

export default NormalDropModal;