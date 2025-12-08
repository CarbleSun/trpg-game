import { useState } from 'react';
import type { PlayerStats, EquipmentItem, Job } from '../game/types';
import type { useGameEngine } from '../hooks/useGameEngine';

type ShopLists = ReturnType<typeof useGameEngine>['shopLists'];
type ShopTab = 'weapon' | 'armor' | 'pet';
type JobFilterTab = Job | 'ALL' | 'COMMON';

interface ShopScreenProps {
  player: PlayerStats;
  shopLists: ShopLists;
  onExitShop: () => void;
  onBuyItem: (item: EquipmentItem) => void;
  onBuyPet: (petId: string) => void;
  onEquipWeapon?: (id: string) => void;
  onEquipArmor?: (id: string) => void;
  onEquipPet?: (id: string) => void;
  onUnequipWeapon?: () => void;
  onUnequipArmor?: () => void;
  onUnequipPet?: () => void;
}

const TabButton = ({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`py-2 px-6 font-stat text-lg ${
      isActive
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'text-gray-500 hover:text-gray-800'
    }`}
  >
    {label}
  </button>
);

const JobTabButton = ({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`py-1 px-4 font-stat text-sm rounded-t-md ${
      isActive
        ? 'bg-gray-100 text-blue-600' // 활성
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50' // 비활성
    }`}
  >
    {label}
  </button>
);


const ShopScreen = ({ 
  player, 
  shopLists, 
  onExitShop, 
  onBuyItem, 
  onBuyPet, 
  onEquipWeapon, 
  onEquipArmor, 
  onEquipPet,
  onUnequipWeapon, // 해제 함수 구조 분해 할당 추가
  onUnequipArmor,
  onUnequipPet
}: ShopScreenProps) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('weapon');
  const [activeJobFilter, setActiveJobFilter] = useState<JobFilterTab>('ALL');

  const filterItems = (items: EquipmentItem[]) => {
    if (activeJobFilter === 'ALL') {
      return items; 
    }
    return items.filter(item => {
      if (activeJobFilter === 'COMMON') {
        return !item.allowedJobs || (item.allowedJobs.includes('전사') && item.allowedJobs.includes('마법사') && item.allowedJobs.includes('도적'));
      }
      return item.allowedJobs?.includes(activeJobFilter);
    });
  };

  const filteredWeapons = filterItems(shopLists.weapons);
  const filteredArmors = filterItems(shopLists.armors);

  const getJobText = (item: EquipmentItem) => {
    if (!item.allowedJobs || item.allowedJobs.length === 0) {
      return ''; 
    }
    const isCommon = item.allowedJobs.includes('전사') &&
                     item.allowedJobs.includes('마법사') &&
                     item.allowedJobs.includes('도적');
    
    if (isCommon) {
      return '(직업 공용)'; 
    }
    return `(${item.allowedJobs.join('/')} 전용)`;
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
        onClick={onExitShop} 
      ></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl font-stat"
          onClick={(e) => e.stopPropagation()} 
        >

          {/* 모달 헤더 */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold">🛍 상점</h1>
            <div className="mt-2 sm:mt-0 sm:text-right">
              <div className="text-lg">💰 보유 골드: {player.money} G</div>
            </div>
          </div>

          {/* 메인 탭 버튼 */}
          <div className="mb-4 flex border-b">
            <TabButton label="⚔️ 무기" isActive={activeTab === 'weapon'} onClick={() => { setActiveTab('weapon'); setActiveJobFilter('ALL'); }} />
            <TabButton label="🛡️ 방어구" isActive={activeTab === 'armor'} onClick={() => { setActiveTab('armor'); setActiveJobFilter('ALL'); }} />
            <TabButton label="🐾 펫" isActive={activeTab === 'pet'} onClick={() => setActiveTab('pet')} />
          </div>

          {/* 직업 필터 탭 */}
          { (activeTab === 'weapon' || activeTab === 'armor') && (
            <div className="mb-3 flex space-x-2">
              <JobTabButton label="전체" isActive={activeJobFilter === 'ALL'} onClick={() => setActiveJobFilter('ALL')} />
              <JobTabButton label="전사" isActive={activeJobFilter === '전사'} onClick={() => setActiveJobFilter('전사')} />
              <JobTabButton label="마법사" isActive={activeJobFilter === '마법사'} onClick={() => setActiveJobFilter('마법사')} />
              <JobTabButton label="도적" isActive={activeJobFilter === '도적'} onClick={() => setActiveJobFilter('도적')} />
              {activeTab === 'armor' && (
                <JobTabButton label="공용" isActive={activeJobFilter === 'COMMON'} onClick={() => setActiveJobFilter('COMMON')} />
              )}
            </div>
          )}


          <div className="max-h-[55vh] overflow-y-auto pr-2">
            
            {/* 무기 탭 */}
            {activeTab === 'weapon' && (
              <section>
                <div className="grid grid-cols-2 gap-3"> 
                  {filteredWeapons.map(item => {
                    const owned = (player.ownedWeaponIds || []).includes(item.id);
                    const equipped = player.weapon?.id === item.id;
                    const canAfford = player.money >= item.price;
                    const jobCanUse = !item.allowedJobs || item.allowedJobs.includes(player.job);
                    const levelCanUse = !item.requiredLevel || player.level >= item.requiredLevel;
                    const jobText = getJobText(item);

                    return (
                      <div key={item.id} className="flex flex-col justify-between rounded border border-gray-300 p-3">
                        <div>
                          <div className="text-sm font-bold">
                            {item.name}
                            {(() => {
                              const lvl = (player.weaponEnhanceLevels || {})[item.id] || 0;
                              return lvl > 0 ? ` [${lvl}강]` : '';
                            })()}
                          </div>
                          <div className="text-xs mt-1">
                            ATK +{item.value}

                            {item.requiredLevel && (
                              <span className={`ml-2 font-bold ${levelCanUse ? 'text-blue-600' : 'text-red-500'}`}>
                                Lv.{item.requiredLevel}
                              </span>
                            )}
                            <span className="ml-2 text-gray-500">{jobText}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2"> 
                          {!owned ? (
                            <button
                              onClick={() => onBuyItem(item)}
                              disabled={!canAfford || !jobCanUse || !levelCanUse}
                              className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50"
                            >
                              {!levelCanUse ? `Lv.${item.requiredLevel} 필요` : !jobCanUse ? '직업 제한' : `구매 (${item.price} G)`}
                            </button>
                          ) : equipped ? (
                            <button 
                              onClick={() => onUnequipWeapon && onUnequipWeapon()}
                              className="w-full rounded border border-red-300 bg-red-50 px-3 py-1 font-stat text-xs text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              장착 해제
                            </button>
                          ) : (
                            <button 
                              onClick={() => onEquipWeapon && onEquipWeapon(item.id)} 
                              disabled={!jobCanUse || !levelCanUse} 
                              className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs hover:bg-emerald-600 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-800"
                            >
                              {!levelCanUse ? `Lv.${item.requiredLevel} 필요` : !jobCanUse ? '직업 제한' : '장착'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 방어구 탭 */}
            {activeTab === 'armor' && (
              <section>
                <div className="grid grid-cols-2 gap-3">
                  {filteredArmors.map(item => {
                    const owned = (player.ownedArmorIds || []).includes(item.id);
                    const equipped = player.armor?.id === item.id;
                    const canAfford = player.money >= item.price;
                    const jobCanUse = !item.allowedJobs || item.allowedJobs.includes(player.job);
                    const levelCanUse = !item.requiredLevel || player.level >= item.requiredLevel;
                    const jobText = getJobText(item);

                    return (
                      <div key={item.id} className="flex flex-col justify-between rounded border border-gray-300 p-3">
                         <div>
                          <div className="text-sm font-bold">
                            {item.name}
                            {(() => {
                              const lvl = (player.armorEnhanceLevels || {})[item.id] || 0;
                              return lvl > 0 ? ` [${lvl}강]` : '';
                            })()}
                          </div>
                          <div className="text-xs mt-1">
                            DEF +{item.value}

                            {item.requiredLevel && (
                              <span className={`ml-2 font-bold ${levelCanUse ? 'text-blue-600' : 'text-red-500'}`}>
                                Lv.{item.requiredLevel}
                              </span>
                            )}
                            <span className="ml-2 text-gray-500">{jobText}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2"> 
                          {!owned ? (
                            <button
                              onClick={() => onBuyItem(item)}
                              disabled={!canAfford || !jobCanUse || !levelCanUse}
                              className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50"
                            >
                              {!levelCanUse ? `Lv.${item.requiredLevel} 필요` : !jobCanUse ? '직업 제한' : `구매 (${item.price} G)`}
                            </button>
                          ) : equipped ? (
                            <button 
                              onClick={() => onUnequipArmor && onUnequipArmor()}
                              className="w-full rounded border border-red-300 bg-red-50 px-3 py-1 font-stat text-xs text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              장착 해제
                            </button>
                          ) : (
                            <button 
                              onClick={() => onEquipArmor && onEquipArmor(item.id)} 
                              disabled={!jobCanUse || !levelCanUse}
                              className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs hover:bg-emerald-600 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-800"
                            >
                              {!levelCanUse ? `Lv.${item.requiredLevel} 필요` : !jobCanUse ? '직업 제한' : '장착'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            
            {/* 펫 탭 */}
            {activeTab === 'pet' && (
              <section>
                <div className="grid grid-cols-2 gap-3">
                  {shopLists.pets.map(pet => {
                    const owned = (player.ownedPetIds || []).includes(pet.id);
                    const equipped = player.pet?.id === pet.id;
                    const price = (pet as any).price as number;
                    const canAfford = player.money >= price;
                    return (
                      <div key={pet.id} className="flex flex-col justify-between rounded border border-gray-300 p-3">
                        <div> 
                          <div className="text-sm font-bold">{pet.icon} {pet.name}
                            {(() => {
                              const lvl = (player.petEnhanceLevels || {})[pet.id] || 0;
                              return lvl > 0 ? ` [${lvl}강]` : '';
                            })()}
                          </div>
                          <div className="text-xs text-gray-600">{pet.description}</div>
                        </div>

                        <div className="mt-2 flex gap-2"> 
                          {!owned ? (
                            <button onClick={() => onBuyPet(pet.id)} disabled={!canAfford} className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50">구매 ({price} G)</button>
                          ) : equipped ? (
                            <button 
                              onClick={() => onUnequipPet && onUnequipPet()}
                              className="w-full rounded border border-red-300 bg-red-50 px-3 py-1 font-stat text-xs text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              장착 해제
                            </button>
                          ) : (
                            <button 
                              onClick={() => onEquipPet && onEquipPet(pet.id)} 
                              className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs hover:bg-emerald-600 hover:text-white"
                            >
                              장착
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>

          {/* 모달 푸터 */}
          <div className="mt-6 border-t pt-4 text-right">
            <button
              onClick={onExitShop}
              className="rounded border border-gray-700 px-4 py-2 
                         font-stat text-sm hover:bg-red-600 hover:text-white"
            >
              나가기 (B / Q)
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default ShopScreen;