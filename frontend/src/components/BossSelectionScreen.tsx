import type { PlayerStats, BossDungeon } from '../game/types';

interface BossSelectionScreenProps {
  player: PlayerStats;
  bossDungeons: BossDungeon[];
  bossCooldowns: Record<string, number>; // 보스 쿨타임 (밀리초)
  onSelectBossDungeon: (bossDungeonId: string) => void;
  onExit: () => void;
}

const BossSelectionScreen = ({
  player,
  bossDungeons,
  bossCooldowns,
  onSelectBossDungeon,
  onExit,
}: BossSelectionScreenProps) => {
  const canEnterBossDungeon = (bossDungeon: BossDungeon) => {
    if (player.level < bossDungeon.requiredLevel) return false;
    const cooldown = bossCooldowns[bossDungeon.id] || 0;
    return cooldown <= Date.now();
  };

  const getBossCooldownText = (bossDungeon: BossDungeon) => {
    const cooldown = bossCooldowns[bossDungeon.id] || 0;
    if (cooldown <= Date.now()) return null;
    const remaining = Math.ceil((cooldown - Date.now()) / 1000 / 60); // 분 단위
    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    return `${hours}시간 ${minutes}분`;
  };

  return (
    <>
      {/* 배경 오버레이 (상점과 동일 스타일) */}
      <div 
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm" 
        onClick={onExit}
      ></div>

      {/* 모달 컨텐츠 컨테이너 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 내부 클릭 시 닫기 방지 */}
        <div 
          className="relative w-full max-w-4xl rounded-lg bg-white p-8 shadow-xl font-stat max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        <h2 className="text-3xl font-bold mb-4 text-center">보스 던전 선택</h2>
        <p className="text-center text-gray-600 mb-6">
          현재 레벨: <span className="font-bold text-red-600">{player.level}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {bossDungeons.map((bossDungeon) => {
            const canEnter = canEnterBossDungeon(bossDungeon);
            const cooldownText = getBossCooldownText(bossDungeon);
            return (
              <button
                key={bossDungeon.id}
                onClick={() => canEnter && onSelectBossDungeon(bossDungeon.id)}
                disabled={!canEnter}
                className={`
                  relative p-6 rounded-lg border-2 transition-all duration-200
                  ${canEnter
                    ? 'border-red-500 hover:border-red-700 hover:bg-red-50 cursor-pointer'
                    : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                  }
                `}
              >
                <div className="text-4xl mb-2">{bossDungeon.icon}</div>
                <h3 className="text-xl font-bold mb-2">{bossDungeon.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{bossDungeon.description}</p>
                <div className="text-xs text-gray-500">
                  필요 레벨: <span className="font-bold">{bossDungeon.requiredLevel}</span>
                </div>
                {!canEnter && player.level >= bossDungeon.requiredLevel && cooldownText && (
                  <div className="absolute top-2 right-2 text-orange-500 text-xs font-bold">
                    쿨타임: {cooldownText}
                  </div>
                )}
                {!canEnter && player.level < bossDungeon.requiredLevel && (
                  <div className="absolute top-2 right-2 text-red-500 text-xs font-bold">
                    레벨 부족
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onExit}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            취소
          </button>
        </div>
        </div>
      </div>
    </>
  );
};

export default BossSelectionScreen;

