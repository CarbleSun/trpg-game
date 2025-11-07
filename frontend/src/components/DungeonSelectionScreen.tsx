import type { Dungeon, PlayerStats } from '../game/types';

interface DungeonSelectionScreenProps {
  player: PlayerStats;
  dungeons: Dungeon[];
  onSelectDungeon: (dungeonId: string) => void;
  onExit: () => void;
}

const DungeonSelectionScreen = ({
  player,
  dungeons,
  onSelectDungeon,
  onExit,
}: DungeonSelectionScreenProps) => {
  const canEnterDungeon = (dungeon: Dungeon) => {
    return player.level >= dungeon.requiredLevel;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold mb-4 text-center">던전 선택</h2>
        <p className="text-center text-gray-600 mb-6">
          현재 레벨: <span className="font-bold text-blue-600">{player.level}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {dungeons.map((dungeon) => {
            const canEnter = canEnterDungeon(dungeon);
            return (
              <button
                key={dungeon.id}
                onClick={() => canEnter && onSelectDungeon(dungeon.id)}
                disabled={!canEnter}
                className={`
                  relative p-6 rounded-lg border-2 transition-all duration-200
                  ${canEnter
                    ? 'border-blue-500 hover:border-blue-700 hover:bg-blue-50 cursor-pointer'
                    : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                  }
                `}
              >
                <div className="text-4xl mb-2">{dungeon.icon}</div>
                <h3 className="text-xl font-bold mb-2">{dungeon.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{dungeon.description}</p>
                <div className="text-xs text-gray-500">
                  필요 레벨: <span className="font-bold">{dungeon.requiredLevel}</span>
                </div>
                {!canEnter && (
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
  );
};

export default DungeonSelectionScreen;

