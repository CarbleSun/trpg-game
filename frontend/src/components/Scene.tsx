import type { CharacterStats, PlayerStats } from '../game/types';

interface SceneProps {
  player: PlayerStats;
  monster: CharacterStats | null;
  isPlayerTurn: boolean;
}

const Scene = ({ player, monster, isPlayerTurn }: SceneProps) => {
  // style.css의 .scene, .turnOwner
  const getCharacterClass = (isTurnOwner: boolean) => {
    return `text-5xl transition-all duration-300 ${
      isTurnOwner ? 'opacity-100 scale-110' : 'opacity-50 scale-75'
    }`;
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* 플레이어 */}
      <div className={getCharacterClass(isPlayerTurn)}>
        🧐
      </div>
      
      <div className="mx-5 text-2xl">VS.</div>

      {/* 몬스터 */}
      <div className={getCharacterClass(!isPlayerTurn && !!monster)}>
        {monster ? '👻' : '❓'}
      </div>
    </div>
  );
};

export default Scene;