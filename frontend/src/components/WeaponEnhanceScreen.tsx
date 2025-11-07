import type { PlayerStats } from '../game/types';

interface WeaponEnhanceScreenProps {
  player: PlayerStats;
  onClose: () => void;
  onEnhance: () => void;
}

const WeaponEnhanceScreen = ({ player, onClose, onEnhance }: WeaponEnhanceScreenProps) => {
  const weapon = player.weapon;
  const level = weapon ? ((player.weaponEnhanceLevels || {})[weapon.id] || 0) : 0;
  const cost = 150 + level * 150;
  const nextLevel = level + 1;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl font-stat" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">🔧 무기 강화소</h2>
            <div className="text-lg">💰 {player.money} G</div>
          </div>
          {weapon ? (
            <div>
              <div className="mb-2 text-lg font-semibold">현재 무기: {weapon.name}</div>
              <div className="text-sm text-gray-700 mb-4">현재 강화: {level}단 (추가 ATK +{level * 5})</div>
              <div className="rounded border p-4">
                <div className="mb-2 font-medium">다음 강화 효과</div>
                <div className="text-sm">ATK +5 (강화 {nextLevel}단)</div>
                <div className="mt-3 text-sm">필요 골드: {cost} G</div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={onClose} className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white">닫기</button>
                <button onClick={onEnhance} className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-blue-700 hover:text-white" disabled={player.money < cost}>강화</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">강화할 무기가 없습니다. 상점에서 먼저 무기를 구매하세요.</div>
              <div className="text-right">
                <button onClick={onClose} className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white">닫기</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WeaponEnhanceScreen;


