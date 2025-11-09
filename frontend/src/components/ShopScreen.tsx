import { useState } from 'react';
import type { PlayerStats, EquipmentItem } from '../game/types';
import type { useGameEngine } from '../hooks/useGameEngine';

type ShopLists = ReturnType<typeof useGameEngine>['shopLists'];
type ShopTab = 'weapon' | 'armor' | 'pet';

interface ShopScreenProps {
  player: PlayerStats;
  shopLists: ShopLists;
  onExitShop: () => void;
  onBuyItem: (item: EquipmentItem) => void;
  onBuyPet: (petId: string) => void;
  onEquipWeapon?: (id: string) => void;
  onEquipArmor?: (id: string) => void;
  onEquipPet?: (id: string) => void;
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

const ShopScreen = ({ player, shopLists, onExitShop, onBuyItem, onBuyPet, onEquipWeapon, onEquipArmor, onEquipPet }: ShopScreenProps) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('weapon');

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

          {/* 탭 버튼 */}
          <div className="mb-4 flex border-b">
            <TabButton label="⚔️ 무기" isActive={activeTab === 'weapon'} onClick={() => setActiveTab('weapon')} />
            <TabButton label="🛡️ 방어구" isActive={activeTab === 'armor'} onClick={() => setActiveTab('armor')} />
            <TabButton label="🐾 펫" isActive={activeTab === 'pet'} onClick={() => setActiveTab('pet')} />
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            
            {activeTab === 'weapon' && (
              <section>
                <div className="grid grid-cols-2 gap-3"> 
                  {shopLists.weapons.map(item => {
                    const owned = (player.ownedWeaponIds || []).includes(item.id);
                    const equipped = player.weapon?.id === item.id;
                    const canAfford = player.money >= item.price;
                    return (
                      <div key={item.id} className="flex flex-col justify-between rounded border border-gray-300 p-3">
                        {/* 내용 영역 */}
												<div>
                          <div className="text-sm font-bold">
                            {item.name}
                            {(() => {
                              const lvl = (player.weaponEnhanceLevels || {})[item.id] || 0;
                              return lvl > 0 ? ` [${lvl}강]` : '';
                            })()}
                          </div>
                          <div className="text-xs">ATK +{item.value}</div>
                        </div>

												{/* 버튼 영역 */}
                        <div className="mt-2 flex gap-2"> 
                          {!owned ? (
                            <button
                              onClick={() => onBuyItem(item)}
                              disabled={!canAfford}
                              className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50"
                            >
															구매 ({item.price} G)
														</button>
                          ) : equipped ? (
                            <button disabled className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs opacity-60">장착중</button>
                          ) : (
                            <button 
															onClick={() => onEquipWeapon && onEquipWeapon(item.id)} 
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

            {activeTab === 'armor' && (
              <section>
                <div className="grid grid-cols-2 gap-3">
                  {shopLists.armors.map(item => {
                    const owned = (player.ownedArmorIds || []).includes(item.id);
                    const equipped = player.armor?.id === item.id;
                    const canAfford = player.money >= item.price;
                    return (
                      <div key={item.id} className="flex flex-col justify-between rounded border border-gray-300 p-3">
                         {/* 내용 영역 */}
												<div>
                          <div className="text-sm font-bold">
                            {item.name}
                            {(() => {
                              const lvl = (player.armorEnhanceLevels || {})[item.id] || 0;
                              return lvl > 0 ? ` [${lvl}강]` : '';
                            })()}
                          </div>
                          <div className="text-xs">DEF +{item.value}</div>
                        </div>

												{/* 버튼 영역 */}
                        <div className="mt-2 flex gap-2"> 
                          {!owned ? (
                            <button
                              onClick={() => onBuyItem(item)}
                              disabled={!canAfford}
                              className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50"
                            >
															구매 ({item.price} G)
														</button>
                          ) : equipped ? (
                            <button disabled className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs opacity-60">장착중</button>
                          ) : (
                            <button 
															onClick={() => onEquipArmor && onEquipArmor(item.id)} 
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
                        {/* 내용 영역 */}
												<div> 
                          <div className="text-sm font-bold">{pet.icon} {pet.name}
                            {(() => {
                              const lvl = (player.petEnhanceLevels || {})[pet.id] || 0;
                              return lvl > 0 ? ` [${lvl}강]` : '';
                            })()}
                          </div>
                          <div className="text-xs text-gray-600">{pet.description}</div>
                        </div>

												{/* 버튼 영역 */}
                        <div className="mt-2 flex gap-2"> 
                          {!owned ? (
                            <button onClick={() => onBuyPet(pet.id)} disabled={!canAfford} className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50">구매 ({price} G)</button>
                          ) : equipped ? (
                            <button disabled className="w-full rounded border border-gray-700 px-3 py-1 font-stat text-xs opacity-60">장착중</button>
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