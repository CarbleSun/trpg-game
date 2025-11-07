import type { PlayerStats, EquipmentItem } from '../game/types';
import type { useGameEngine } from '../hooks/useGameEngine';

// useGameEngine 훅의 반환 타입에서 필요한 부분만 가져오기
type ShopLists = ReturnType<typeof useGameEngine>['shopLists'];

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

// 메인 상점 스크린 (모달로 수정됨)
const ShopScreen = ({ player, shopLists, onExitShop, onBuyItem, onBuyPet, onEquipWeapon, onEquipArmor, onEquipPet }: ShopScreenProps) => {
  return (
    <>
      {/* 1. 뒷배경 */}
      <div 
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
        onClick={onExitShop} // 뒷배경 클릭 시 닫기
      ></div>

      {/* 2. 모달 컨텐츠 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 모달 내부 클릭 시 닫기 방지 */}
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

          {/* 아이템 목록 (스크롤 영역) */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-h-[60vh] overflow-y-auto pr-2">
            {/* 무기 목록 */}
            <section>
              <h2 className="mb-4 text-xl font-bold">⚔️ 무기</h2>
              <div className="flex flex-col gap-4">
                {shopLists.weapons.map(item => {
                  const owned = (player.ownedWeaponIds || []).includes(item.id);
                  const equipped = player.weapon?.id === item.id;
                  const canAfford = player.money >= item.price;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded border border-gray-300 p-4">
                      <div>
                        <div className="font-bold">
                          {item.name}
                          {(() => {
                            const lvl = (player.weaponEnhanceLevels || {})[item.id] || 0;
                            return lvl > 0 ? ` [${lvl}강]` : '';
                          })()}
                        </div>
                        <div className="text-sm">ATK +{item.value}</div>
                      </div>
                      <div className="flex gap-2">
                        {!owned ? (
                          <button
                            onClick={() => onBuyItem(item)}
                            disabled={!canAfford}
                            className="rounded border border-gray-700 px-4 py-2 font-stat text-sm enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50"
                          >구매 ({item.price} G)</button>
                        ) : equipped ? (
                          <button disabled className="rounded border border-gray-700 px-4 py-2 font-stat text-sm opacity-60">장착중</button>
                        ) : (
                          <button onClick={() => onEquipWeapon && onEquipWeapon(item.id)} className="rounded border border-gray-700 px-4 py-2 font-stat text-sm hover:bg-emerald-600 hover:text-white">장착</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 방어구 목록 */}
            <section>
              <h2 className="mb-4 text-xl font-bold">🛡️ 방어구</h2>
              <div className="flex flex-col gap-4">
                {shopLists.armors.map(item => {
                  const owned = (player.ownedArmorIds || []).includes(item.id);
                  const equipped = player.armor?.id === item.id;
                  const canAfford = player.money >= item.price;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded border border-gray-300 p-4">
                      <div>
                        <div className="font-bold">
                          {item.name}
                          {(() => {
                            const lvl = (player.armorEnhanceLevels || {})[item.id] || 0;
                            return lvl > 0 ? ` [${lvl}강]` : '';
                          })()}
                        </div>
                        <div className="text-sm">DEF +{item.value}</div>
                      </div>
                      <div className="flex gap-2">
                        {!owned ? (
                          <button
                            onClick={() => onBuyItem(item)}
                            disabled={!canAfford}
                            className="rounded border border-gray-700 px-4 py-2 font-stat text-sm enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50"
                          >구매 ({item.price} G)</button>
                        ) : equipped ? (
                          <button disabled className="rounded border border-gray-700 px-4 py-2 font-stat text-sm opacity-60">장착중</button>
                        ) : (
                          <button onClick={() => onEquipArmor && onEquipArmor(item.id)} className="rounded border border-gray-700 px-4 py-2 font-stat text-sm hover:bg-emerald-600 hover:text-white">장착</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 펫 목록 */}
            <section>
              <h2 className="mb-4 text-xl font-bold">🐾 펫</h2>
              <div className="flex flex-col gap-4">
                {shopLists.pets.map(pet => {
                  const owned = (player.ownedPetIds || []).includes(pet.id);
                  const equipped = player.pet?.id === pet.id;
                  const price = (pet as any).price as number;
                  const canAfford = player.money >= price;
                  return (
                    <div key={pet.id} className="flex items-center justify-between rounded border border-gray-300 p-4">
                      <div>
                        <div className="font-bold">{pet.icon} {pet.name}
                          {(() => {
                            const lvl = (player.petEnhanceLevels || {})[pet.id] || 0;
                            return lvl > 0 ? ` [${lvl}강]` : '';
                          })()}
                        </div>
                        <div className="text-xs text-gray-600">{pet.description}</div>
                      </div>
                      <div className="flex gap-2">
                        {!owned ? (
                          <button onClick={() => onBuyPet(pet.id)} disabled={!canAfford} className="rounded border border-gray-700 px-4 py-2 font-stat text-sm enabled:hover:bg-blue-700 enabled:hover:text-white disabled:opacity-50">구매 ({price} G)</button>
                        ) : equipped ? (
                          <button disabled className="rounded border border-gray-700 px-4 py-2 font-stat text-sm opacity-60">장착중</button>
                        ) : (
                          <button onClick={() => onEquipPet && onEquipPet(pet.id)} className="rounded border border-gray-700 px-4 py-2 font-stat text-sm hover:bg-emerald-600 hover:text-white">장착</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* 모달 푸터 (나가기 버튼) */}
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