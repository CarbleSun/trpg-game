import type { CharacterStats, PlayerStats } from '../game/types';

interface SceneProps {
  player: PlayerStats;
  monster: CharacterStats | null;
  isPlayerTurn: boolean;
}

const Scene = ({ player, monster, isPlayerTurn }: SceneProps) => {
  // 캐릭터 렌더링 스타일 (턴 주인 강조)
  const getCharacterStyle = (isTurnOwner: boolean) => {
    return `relative transition-all duration-500 ease-out transform ${
      isTurnOwner 
        ? 'scale-110 opacity-100 z-10 drop-shadow-2xl grayscale-0' 
        : 'scale-90 opacity-60 grayscale-[0.5] blur-[1px]'
    }`;
  };

  // 미니 HP 바 컴포넌트
  const MiniHpBar = ({ current, max, isPlayer }: { current: number; max: number; isPlayer: boolean }) => (
    <div className="mt-4 w-24 h-1.5 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
      <div 
        className={`h-full transition-all duration-300 ${isPlayer ? 'bg-emerald-400' : 'bg-rose-500'}`}
        style={{ width: `${Math.min(100, Math.max(0, (current / max) * 100))}%` }}
      />
    </div>
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-6">
      {/* 배경 아레나 카드 */}
      <div className="relative h-64 w-full rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-700/50">
        
        {/* 배경 장식 (조명 효과) */}
        <div className={`absolute top-0 left-0 w-1/2 h-full bg-indigo-500/10 transition-opacity duration-500 ${isPlayerTurn ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`absolute top-0 right-0 w-1/2 h-full bg-red-500/10 transition-opacity duration-500 ${!isPlayerTurn ? 'opacity-100' : 'opacity-0'}`}></div>
        
        {/* 중앙 VS 배지 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600 shadow-xl">
            <span className="text-slate-400 font-black text-xs italic tracking-widest">VS</span>
          </div>
        </div>

        {/* 전투 스테이지 */}
        <div className="relative h-full flex items-center justify-around px-8">
          
          {/* 플레이어 영역 */}
          <div className="flex flex-col items-center">
            {isPlayerTurn && (
              <div className="absolute -top-10 text-xs font-bold text-indigo-300 animate-bounce">
                MY TURN!
              </div>
            )}
            <div className={getCharacterStyle(isPlayerTurn)}>
              <div className="text-7xl filter drop-shadow-lg cursor-default hover:scale-110 transition-transform">
                🧐
              </div>
            </div>
            <MiniHpBar current={player.hp} max={player.maxHp} isPlayer={true} />
            <div className={`mt-2 text-sm font-bold tracking-wide transition-colors ${isPlayerTurn ? 'text-white' : 'text-slate-500'}`}>
              {player.name}
            </div>
          </div>

          {/* 몬스터 영역 */}
          <div className="flex flex-col items-center">
             {!isPlayerTurn && monster && (
              <div className="absolute -top-10 text-xs font-bold text-red-300 animate-bounce">
                ENEMY TURN!
              </div>
            )}
            <div className={getCharacterStyle(!isPlayerTurn && !!monster)}>
              <div className="text-7xl filter drop-shadow-lg cursor-default hover:scale-110 transition-transform">
                {monster ? '👻' : '❓'}
              </div>
            </div>
            {monster && (
              <>
                <MiniHpBar current={monster.hp} max={monster.maxHp} isPlayer={false} />
                <div className={`mt-2 text-sm font-bold tracking-wide transition-colors ${!isPlayerTurn ? 'text-white' : 'text-slate-500'}`}>
                  {monster.name}
                </div>
              </>
            )}
            {!monster && (
              <div className="mt-8 text-sm text-slate-600 font-medium">대기 중...</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Scene;