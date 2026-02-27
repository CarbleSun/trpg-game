import { useEffect, useRef, useState } from 'react';
import type { CharacterStats, PlayerStats } from '../game/types';

interface SceneProps {
  player: PlayerStats;
  monster: CharacterStats | null;
  isPlayerTurn: boolean;
  logMessages?: any[];
}

const Scene = ({ player, monster, isPlayerTurn, logMessages = [] }: SceneProps) => {
  // 🌟 상태에 'damage' (입은 피해량) 추가
  const [animState, setAnimState] = useState<{ 
    attacker: 'player'|'monster'|null, 
    victim: 'player'|'monster'|null,
    isCritical: boolean,
    damage: number | null 
  }>({ attacker: null, victim: null, isCritical: false, damage: null });

  const prevPlayerHp = useRef(player.hp);
  const prevMonsterHp = useRef(monster?.hp || 0);
  const prevMonsterName = useRef(monster?.name);

  useEffect(() => {
    let attacker: 'player' | 'monster' | null = null;
    let victim: 'player' | 'monster' | null = null;
    let isCrit = false;
    let damage: number | null = null;

    const isSameMonster = monster?.name === prevMonsterName.current;

    // 플레이어 피격 감지 및 데미지 계산
    if (player.hp < prevPlayerHp.current) {
      victim = 'player';
      attacker = 'monster';
      damage = prevPlayerHp.current - player.hp;
    }
    // 몬스터 피격 감지 및 데미지 계산
    if (monster && isSameMonster && monster.hp < prevMonsterHp.current) {
      victim = 'monster';
      attacker = 'player';
      damage = prevMonsterHp.current - monster.hp;
    }

    if (attacker || victim) {
      // 크리티컬 판별
      const recentLogs = logMessages.slice(-3);
      isCrit = recentLogs.some(msg => {
        const text = typeof msg === 'string' ? msg : msg?.msg || msg?.text || '';
        return msg?.type === 'cri' || text.includes('크리티컬') || text.includes('치명타');
      });

      // 애니메이션 상태 업데이트 (데미지 포함)
      setAnimState({ attacker, victim, isCritical: isCrit, damage });
      
      // 애니메이션 지속 시간 (플로팅 텍스트가 사라질 여유를 주기 위해 600ms로 통일)
      setTimeout(() => setAnimState({ attacker: null, victim: null, isCritical: false, damage: null }), 600);
    }

    prevPlayerHp.current = player.hp;
    prevMonsterHp.current = monster?.hp || 0;
    prevMonsterName.current = monster?.name;
  }, [player.hp, monster?.hp, monster?.name, logMessages]);

  const getWrapperStyle = (isPlayer: boolean) => {
    const isAttacker = animState.attacker === (isPlayer ? 'player' : 'monster');
    const isVictim = animState.victim === (isPlayer ? 'player' : 'monster');
    const isTurnOwner = isPlayer ? isPlayerTurn : (!isPlayerTurn && !!monster);

    const base = "relative transition-all ease-out transform";

    if (isAttacker) {
      const move = isPlayer ? "translate-x-16" : "-translate-x-16";
      return `${base} duration-75 scale-125 opacity-100 z-30 drop-shadow-2xl grayscale-0 ${move}`;
    }

    if (isVictim) {
      const move = isPlayer 
        ? (animState.isCritical ? "-translate-x-12" : "-translate-x-8") 
        : (animState.isCritical ? "translate-x-12" : "translate-x-8");
      return `${base} duration-100 scale-95 opacity-80 z-0 ${move}`;
    }

    if (isTurnOwner) {
      const move = isPlayer ? "translate-x-6" : "-translate-x-6";
      return `${base} duration-500 scale-110 opacity-100 z-10 drop-shadow-xl grayscale-0 ${move}`;
    } else {
      const move = isPlayer ? "-translate-x-2" : "translate-x-2";
      return `${base} duration-500 scale-90 opacity-40 grayscale-[0.8] blur-[1px] ${move}`;
    }
  };

  const MiniHpBar = ({ current, max, isPlayer }: { current: number; max: number; isPlayer: boolean }) => (
    <div className="mt-3 w-28 h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-600">
      <div 
        className={`h-full transition-all duration-300 ${isPlayer ? 'bg-emerald-400' : 'bg-rose-500'}`}
        style={{ width: `${Math.min(100, Math.max(0, (current / max) * 100))}%` }}
      />
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 2.5s ease-in-out infinite; }

        @keyframes screen-quake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-6px, -4px) rotate(-1deg); }
          40% { transform: translate(6px, 4px) rotate(1deg); }
          60% { transform: translate(-6px, 4px) rotate(-1deg); }
          80% { transform: translate(6px, -4px) rotate(1deg); }
        }
        .anim-screen-quake { animation: screen-quake 0.3s cubic-bezier(.36,.07,.19,.97) both; }

        @keyframes hit-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); filter: brightness(1) sepia(0); }
          20% { transform: translate(-10px, -5px) rotate(-15deg); filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); }
          40% { transform: translate(10px, 5px) rotate(15deg); filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); }
          60% { transform: translate(-10px, 5px) rotate(-15deg); filter: brightness(1.5) sepia(1) hue-rotate(0deg) saturate(5); }
          80% { transform: translate(10px, -5px) rotate(15deg); filter: brightness(1.5); }
        }
        .anim-hit { animation: hit-shake 0.35s cubic-bezier(.36,.07,.19,.97) both; }

        @keyframes crit-flash {
          0% { opacity: 0.8; background-color: white; }
          100% { opacity: 0; background-color: transparent; }
        }
        .anim-crit-flash { animation: crit-flash 0.5s ease-out forwards; pointer-events: none; }

        @keyframes crit-text-pop {
          0% { transform: scale(0.5) translateY(20px) rotate(-10deg); opacity: 0; }
          20% { transform: scale(1.2) translateY(-20px) rotate(5deg); opacity: 1; text-shadow: 0 0 20px rgba(255,255,0,0.8); }
          80% { transform: scale(1) translateY(-25px) rotate(0deg); opacity: 1; text-shadow: 0 0 10px rgba(255,0,0,0.8); }
          100% { transform: scale(1.5) translateY(-40px); opacity: 0; }
        }
        .anim-crit-text { animation: crit-text-pop 1s cubic-bezier(.175,.885,.32,1.275) forwards; pointer-events: none; }

        /* 🌟 데미지 수치 플로팅 애니메이션 */
        @keyframes float-damage {
          0% { transform: scale(0.5) translateY(0); opacity: 0; }
          20% { transform: scale(1.4) translateY(-20px); opacity: 1; }
          70% { transform: scale(1) translateY(-35px); opacity: 1; }
          100% { transform: scale(1) translateY(-45px); opacity: 0; }
        }
        .anim-damage-text { 
          animation: float-damage 0.6s cubic-bezier(.25,.46,.45,.94) forwards; 
          pointer-events: none;
          text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0px 3px 5px rgba(0,0,0,0.8); /* 진한 외곽선 및 그림자 */
        }
      `}</style>

      <div className={`relative w-full h-full max-h-[260px] rounded-2xl overflow-hidden bg-slate-900 shadow-inner border transition-colors duration-100 ${
        animState.victim ? (animState.isCritical ? 'anim-screen-quake border-yellow-400' : 'anim-screen-quake border-red-500') : 'border-slate-700'
      }`}>
        
        {animState.isCritical && (
          <div className="absolute inset-0 z-50 anim-crit-flash mix-blend-overlay rounded-2xl"></div>
        )}

        <div className={`absolute top-0 left-0 w-1/2 h-full bg-indigo-500/10 transition-opacity duration-500 ${isPlayerTurn ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`absolute top-0 right-0 w-1/2 h-full bg-red-500/10 transition-opacity duration-500 ${!isPlayerTurn ? 'opacity-100' : 'opacity-0'}`}></div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 pointer-events-none">
          <span className="text-slate-500 font-black text-6xl italic tracking-widest">VS</span>
        </div>

        {animState.isCritical && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <span className="anim-crit-text inline-block font-black text-4xl sm:text-5xl tracking-widest text-transparent bg-clip-text bg-linear-to-br from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
              CRITICAL!
            </span>
          </div>
        )}

        <div className="relative h-full flex items-center justify-between px-10 sm:px-24">
          
          {/* ================= 플레이어 영역 ================= */}
          <div className={`flex flex-col items-center z-10 ${getWrapperStyle(true)}`}>
            <div className="relative">
              {/* 플레이어가 맞았을 때 피로 물든 데미지 표시 */}
              {animState.victim === 'player' && animState.damage !== null && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50">
                  <span className="anim-damage-text inline-block font-black text-3xl text-red-500">
                    -{animState.damage}
                  </span>
                </div>
              )}
              <div className={animState.victim === 'player' ? 'anim-hit' : isPlayerTurn ? 'animate-float' : ''}>
                <div className="text-5xl filter drop-shadow-md">🧐</div>
              </div>
            </div>
            <MiniHpBar current={player.hp} max={player.maxHp} isPlayer={true} />
            <div className={`mt-1 text-xs font-bold tracking-wide transition-colors ${isPlayerTurn ? 'text-white' : 'text-slate-500'}`}>
              {player.name}
            </div>
          </div>

          {/* ================= 몬스터 영역 ================= */}
          <div className={`flex flex-col items-center z-10 ${getWrapperStyle(false)}`}>
            <div className="relative">
              {/* 몬스터가 맞았을 때 흰색/노란색 데미지 표시 */}
              {animState.victim === 'monster' && animState.damage !== null && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50">
                  <span className={`anim-damage-text inline-block font-black ${
                    animState.isCritical ? 'text-yellow-400 text-4xl' : 'text-white text-3xl'
                  }`}>
                    -{animState.damage}
                  </span>
                </div>
              )}
              <div className={animState.victim === 'monster' ? 'anim-hit' : (!isPlayerTurn && !!monster) ? 'animate-float' : ''}>
                <div className="text-5xl filter drop-shadow-md">{monster ? '👻' : '❓'}</div>
              </div>
            </div>
            {monster ? (
              <>
                <MiniHpBar current={monster.hp} max={monster.maxHp} isPlayer={false} />
                <div className={`mt-1 text-xs font-bold tracking-wide transition-colors ${!isPlayerTurn ? 'text-white' : 'text-slate-500'}`}>
                  {monster.name}
                </div>
              </>
            ) : (
              <div className="mt-8 text-xs text-slate-600 font-medium">대기 중...</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Scene;