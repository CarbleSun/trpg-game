import { useEffect, useRef, useState } from 'react';
import type { CharacterStats, PlayerStats } from '../game/types';

interface SceneProps {
  player: PlayerStats;
  monster: CharacterStats | null;
  isPlayerTurn: boolean;
  logMessages?: any[];
}

const Scene = ({ player, monster, isPlayerTurn, logMessages = [] }: SceneProps) => {
  const [animState, setAnimState] = useState<{ 
    attacker: 'player' | 'monster' | null; 
    victim: 'player' | 'monster' | null;
    isCritical: boolean;
    damage: number | null; 
  }>({ attacker: null, victim: null, isCritical: false, damage: null });

  const [displayMonster, setDisplayMonster] = useState<CharacterStats | null>(monster);
  const [isDeadAnim, setIsDeadAnim] = useState(false);
  
  const isDeadAnimRef = useRef(false);
  const latestPropMonster = useRef(monster);
  const prevPropMonster = useRef(monster); // 직전 monster prop 기억

  useEffect(() => {
    const prev = prevPropMonster.current;
    latestPropMonster.current = monster;
    prevPropMonster.current = monster;

    // 이미 사망 애니메이션 중이면 새 몬스터 교체만 예약하고 끝
    if (isDeadAnimRef.current) return;

    // 사망 감지: 이전에 살아있던 몬스터가 있었는데 지금 prop이 바뀌었다면
    // (hp<=0으로 바뀐 경우 OR 엔진이 바로 다음 몬스터로 교체한 경우 둘 다 커버)
    const prevWasAlive = prev && prev.hp > 0;
    const monsterDied =
      prevWasAlive && (
        // 케이스 A: 같은 몬스터인데 hp가 0 이하가 됨
        (monster && monster.name === prev.name && monster.hp <= 0) ||
        // 케이스 B: 엔진이 죽은 몬스터를 즉시 다음 몬스터로 교체 (이름이 바뀜)
        (monster?.name !== prev.name) ||
        // 케이스 C: 몬스터가 null로 바뀜 (전투 종료)
        monster === null
      );

    if (monsterDied) {
      isDeadAnimRef.current = true;
      setIsDeadAnim(true);
      // displayMonster는 죽은 prev 몬스터로 고정
      setDisplayMonster(prev);

      setTimeout(() => {
        isDeadAnimRef.current = false;
        setIsDeadAnim(false);
        setDisplayMonster(latestPropMonster.current);
      }, 1200);
    } else {
      setDisplayMonster(monster);
    }
  }, [monster]);

  // 2. 피격 및 데미지 계산 (실제 화면에 떠있는 displayMonster 기준)
  const prevPlayerHp = useRef(player.hp);
  const prevMonsterHp = useRef(displayMonster?.hp || 0);
  const prevMonsterName = useRef(displayMonster?.name);

  useEffect(() => {
    let attacker: 'player' | 'monster' | null = null;
    let victim: 'player' | 'monster' | null = null;
    let isCrit = false;
    let damage: number | null = null;

    const isSameMonster = displayMonster?.name === prevMonsterName.current;

    if (player.hp < prevPlayerHp.current) {
      victim = 'player';
      attacker = 'monster';
      damage = prevPlayerHp.current - player.hp;
    }
    
    // 똑같은 몬스터의 HP가 깎였을 때만 타격 처리
    if (displayMonster && isSameMonster && displayMonster.hp < prevMonsterHp.current) {
      victim = 'monster';
      attacker = 'player';
      damage = prevMonsterHp.current - displayMonster.hp;
    }

    if (attacker || victim) {
      const recentLogs = logMessages.slice(-3);
      isCrit = recentLogs.some(msg => {
        const text = typeof msg === 'string' ? msg : msg?.msg || msg?.text || '';
        return msg?.type === 'cri' || text.includes('크리티컬') || text.includes('치명타');
      });

      setAnimState({ attacker, victim, isCritical: isCrit, damage });
      setTimeout(() => setAnimState({ attacker: null, victim: null, isCritical: false, damage: null }), 600);
    }

    prevPlayerHp.current = player.hp;
    prevMonsterHp.current = displayMonster?.hp || 0;
    prevMonsterName.current = displayMonster?.name;
  }, [player.hp, displayMonster, logMessages]);

  const isPlayerDead = player.hp <= 0;

  const getWrapperStyle = (isPlayer: boolean) => {
    const isAttacker = animState.attacker === (isPlayer ? 'player' : 'monster');
    const isVictim = animState.victim === (isPlayer ? 'player' : 'monster');
    const isTurnOwner = isPlayer ? isPlayerTurn : (!isPlayerTurn && !!displayMonster);

    const base = "relative transition-all ease-out transform";

    if (isAttacker) return `${base} duration-75 scale-125 opacity-100 z-30 drop-shadow-2xl grayscale-0 ${isPlayer ? "translate-x-16" : "-translate-x-16"}`;
    if (isVictim) {
      const move = isPlayer ? (animState.isCritical ? "-translate-x-12" : "-translate-x-8") : (animState.isCritical ? "translate-x-12" : "translate-x-8");
      return `${base} duration-100 scale-95 opacity-80 z-0 ${move}`;
    }
    if (isTurnOwner) return `${base} duration-500 scale-110 opacity-100 z-10 drop-shadow-xl grayscale-0 ${isPlayer ? "translate-x-6" : "-translate-x-6"}`;
    
    return `${base} duration-500 scale-90 opacity-40 grayscale-[0.8] blur-[1px] ${isPlayer ? "-translate-x-2" : "translate-x-2"}`;
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
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
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

        @keyframes crit-flash { 0% { opacity: 0.8; background-color: white; } 100% { opacity: 0; background-color: transparent; } }
        .anim-crit-flash { animation: crit-flash 0.5s ease-out forwards; pointer-events: none; }

        @keyframes crit-text-pop {
          0% { transform: scale(0.5) translateY(20px) rotate(-10deg); opacity: 0; }
          20% { transform: scale(1.2) translateY(-20px) rotate(5deg); opacity: 1; text-shadow: 0 0 20px rgba(255,255,0,0.8); }
          80% { transform: scale(1) translateY(-25px) rotate(0deg); opacity: 1; text-shadow: 0 0 10px rgba(255,0,0,0.8); }
          100% { transform: scale(1.5) translateY(-40px); opacity: 0; }
        }
        .anim-crit-text { animation: crit-text-pop 1s cubic-bezier(.175,.885,.32,1.275) forwards; pointer-events: none; }

        @keyframes float-damage {
          0% { transform: scale(0.5) translateY(0); opacity: 0; }
          20% { transform: scale(1.4) translateY(-20px); opacity: 1; }
          70% { transform: scale(1) translateY(-35px); opacity: 1; }
          100% { transform: scale(1) translateY(-45px); opacity: 0; }
        }
        .anim-damage-text { animation: float-damage 0.6s cubic-bezier(.25,.46,.45,.94) forwards; pointer-events: none; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0px 3px 5px rgba(0,0,0,0.8); }

        /* 🌟 격렬한 타격 + 폭발 팽창 + 재가 되어 낙하하는 사망 애니메이션 */
        @keyframes fatal-die {
          0%   { transform: scale(1)   translate(0, 0)        rotate(0deg);    filter: brightness(1)   sepia(0); opacity: 1; }
          10%  { transform: scale(1.2) translate(-15px, -5px) rotate(-15deg);  filter: brightness(3) sepia(1) hue-rotate(-50deg) saturate(5); opacity: 1; }
          20%  { transform: scale(1.2) translate(15px, 5px)   rotate(15deg);   filter: brightness(3) sepia(1) hue-rotate(-50deg) saturate(5); opacity: 1; }
          30%  { transform: scale(1.2) translate(-15px, 5px)  rotate(-15deg);  filter: brightness(2) sepia(1) hue-rotate(0deg) saturate(5); opacity: 1; }
          40%  { transform: scale(1.4) translate(0, 0)        rotate(0deg);    filter: brightness(3) drop-shadow(0 0 30px rgba(255,0,0,1)); opacity: 1; }
          100% { transform: scale(0.1) translateY(100px)      rotate(-180deg); filter: grayscale(1) blur(10px); opacity: 0; }
        }
        .anim-fatal-die { animation: fatal-die 1.0s cubic-bezier(.36,.07,.19,.97) forwards; pointer-events: none; }
      `}</style>

      <div className={`relative w-full h-full max-h-[260px] rounded-2xl overflow-hidden bg-slate-900 shadow-inner border transition-colors duration-100 ${
        animState.victim ? (animState.isCritical ? 'anim-screen-quake border-yellow-400' : 'anim-screen-quake border-red-500') : 'border-slate-700'
      }`}>
        
        {animState.isCritical && <div className="absolute inset-0 z-50 anim-crit-flash mix-blend-overlay rounded-2xl"></div>}
        <div className={`absolute top-0 left-0 w-1/2 h-full bg-indigo-500/10 transition-opacity duration-500 ${isPlayerTurn ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`absolute top-0 right-0 w-1/2 h-full bg-red-500/10 transition-opacity duration-500 ${!isPlayerTurn ? 'opacity-100' : 'opacity-0'}`}></div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 pointer-events-none">
          <span className="text-slate-500 font-black text-6xl italic tracking-widest">VS</span>
        </div>

        {animState.isCritical && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <span className="anim-crit-text inline-block font-black text-4xl sm:text-5xl tracking-widest text-transparent bg-clip-text bg-linear-to-br from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">CRITICAL!</span>
          </div>
        )}

        <div className="relative h-full flex items-center justify-between px-10 sm:px-24">
          
          {/* ================= 플레이어 영역 ================= */}
          <div className={`flex flex-col items-center z-10 ${getWrapperStyle(true)}`}>
            <div className="relative">
              {animState.victim === 'player' && animState.damage !== null && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50">
                  <span className="anim-damage-text inline-block font-black text-3xl text-red-500">-{animState.damage}</span>
                </div>
              )}
              <div className={isPlayerDead ? 'anim-fatal-die' : animState.victim === 'player' ? 'anim-hit' : isPlayerTurn ? 'animate-float' : ''}>
                <div className="text-5xl filter drop-shadow-md">🧐</div>
              </div>
            </div>
            <div className={`w-full flex flex-col items-center transition-all duration-1000 ${isPlayerDead ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100'}`}>
              <MiniHpBar current={player.hp} max={player.maxHp} isPlayer={true} />
              <div className={`mt-1 text-xs font-bold tracking-wide transition-colors ${isPlayerTurn ? 'text-white' : 'text-slate-500'}`}>{player.name}</div>
            </div>
          </div>

          {/* ================= 몬스터 영역 ================= */}
          <div className={`flex flex-col items-center z-10 ${getWrapperStyle(false)}`}>
            <div className="relative">
              {animState.victim === 'monster' && animState.damage !== null && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50">
                  <span className={`anim-damage-text inline-block font-black ${animState.isCritical ? 'text-yellow-400 text-4xl' : 'text-white text-3xl'}`}>
                    -{animState.damage}
                  </span>
                </div>
              )}
              {/* key가 바뀌면 React가 DOM을 새로 생성 → animation이 반드시 처음부터 실행됨 */}
              <div key={isDeadAnim ? 'dying' : 'alive'} className={isDeadAnim ? 'anim-fatal-die' : animState.victim === 'monster' ? 'anim-hit' : (!isPlayerTurn && !!displayMonster) ? 'animate-float' : ''}>
                <div className="text-5xl filter drop-shadow-md">{displayMonster ? '👻' : '❓'}</div>
              </div>
            </div>
            
            {displayMonster ? (
              // 🌟 몬스터가 사망하면 체력바와 이름도 1초에 걸쳐 부드럽게 사라집니다
              <div className={`w-full flex flex-col items-center transition-all duration-1000 ${isDeadAnim ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100'}`}>
                <MiniHpBar current={displayMonster.hp} max={displayMonster.maxHp} isPlayer={false} />
                <div className={`mt-1 text-xs font-bold tracking-wide transition-colors ${!isPlayerTurn ? 'text-white' : 'text-slate-500'}`}>
                  {displayMonster.name}
                </div>
              </div>
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