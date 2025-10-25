import type { PlayerStats, EquipmentItem } from '../game/types';
import type { useGameEngine } from '../hooks/useGameEngine';

// useGameEngine 훅의 반환 타입에서 필요한 부분만 가져오기
type ShopLists = ReturnType<typeof useGameEngine>['shopLists'];

interface ShopScreenProps {
  player: PlayerStats;
  shopLists: ShopLists;
  onExitShop: () => void;
  onBuyItem: (item: EquipmentItem) => void;
}

// 아이템 카드 컴포넌트
const ShopItemCard = ({ item, player, onBuyItem }: {
  item: EquipmentItem;
  player: PlayerStats;
  onBuyItem: (item: EquipmentItem) => void;
}) => {
  const isEquipped = (item.type === 'weapon' && player.weapon?.id === item.id) ||
                     (item.type === 'armor' && player.armor?.id === item.id);
  const canAfford = player.money >= item.price;

  return (
    <div className="flex items-center justify-between rounded border border-gray-300 p-4">
      <div>
        <div className="font-bold">{item.name}</div>
        <div className="text-sm">
          {item.type === 'weapon' ? 'ATK' : 'DEF'} +{item.value}
        </div>
      </div>
      <button
        onClick={() => onBuyItem(item)}
        disabled={!canAfford || isEquipped}
        className="rounded border border-gray-700 px-4 py-2 font-stat text-sm 
                   font-bold text-gray-800 transition-colors
                   enabled:hover:bg-blue-700 enabled:hover:text-white
                   disabled:opacity-50"
      >
        {isEquipped ? '장착중' : `구매 (${item.price} G)`}
      </button>
    </div>
  );
};

// 메인 상점 스크린 (모달로 수정됨)
const ShopScreen = ({ player, shopLists, onExitShop, onBuyItem }: ShopScreenProps) => {
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 max-h-[60vh] overflow-y-auto pr-2">
            {/* 무기 목록 */}
            <section>
              <h2 className="mb-4 text-xl font-bold">⚔️ 무기</h2>
              <div className="flex flex-col gap-4">
                {shopLists.weapons.map(item => (
                  <ShopItemCard key={item.id} item={item} player={player} onBuyItem={onBuyItem} />
                ))}
              </div>
            </section>

            {/* 방어구 목록 */}
            <section>
              <h2 className="mb-4 text-xl font-bold">🛡️ 방어구</h2>
              <div className="flex flex-col gap-4">
                {shopLists.armors.map(item => (
                  <ShopItemCard key={item.id} item={item} player={player} onBuyItem={onBuyItem} />
                ))}
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