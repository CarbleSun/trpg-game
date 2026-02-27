import { useMemo } from 'react';
import type { PlayerStats } from '../game/types';
import { skills as allSkills } from '../game/constants'; 
import ProgressBar from './ProgressBar';
import { getItemGrade, getGradeColorClass } from '../game/utils';

interface StatusDisplayProps {
  player: PlayerStats;
	compact?: boolean; 
	isSkillModalOpen: boolean;
  onToggleSkillModal: () => void;
}

const StatusDisplay = ({ 
	player, 
	compact = false,
	isSkillModalOpen, 
  onToggleSkillModal 
}: StatusDisplayProps) => {

	const weaponAtk = player.weapon?.value || 0;
  const armorDef = player.armor?.value || 0;
  const weaponEnh = player.weapon ? ((player.weaponEnhanceLevels || {})[player.weapon.id] || 0) * 5 : 0;
  const armorEnh = player.armor ? ((player.armorEnhanceLevels || {})[player.armor.id] || 0) * 5 : 0;
  
	const { buffAtk, buffDef, totalAtk, totalDef } = useMemo(() => {
		let bAtk = 0;
		let bDef = 0; 

		const baseAtk = player.atk + weaponAtk + weaponEnh;
		let baseDef = player.def + armorDef + armorEnh;

		const activeBuffs = player.activeBuffs || [];
		const defBeforeBuffs = baseDef;

		activeBuffs.forEach((buff) => {
			if (buff.chargeAttackMultiplier && buff.chargeAttackMultiplier > 0) {
        bAtk += Math.floor(baseAtk * buff.chargeAttackMultiplier);
      }
      if (buff.defenseMultiplier !== undefined) {
        baseDef = Math.floor(baseDef * buff.defenseMultiplier);
      }
		});

		bDef = defBeforeBuffs - baseDef;

		const finalAtk = baseAtk + bAtk;
		const finalDef = Math.max(0, baseDef);

		return { buffAtk: bAtk, buffDef: bDef, totalAtk: finalAtk, totalDef: finalDef };
	}, [player, weaponAtk, weaponEnh, armorDef, armorEnh]);

	const learnedSkills = useMemo(() => {
		return allSkills.filter(s => (player.skills || []).includes(s.key));
	}, [player.skills]);

  // ==========================================
  // [전투 화면]
  // ==========================================
  if (compact) {
    return (
      // 🌟 font-mono 제거, font-sans 추가
      <div className="w-full h-full flex flex-col justify-center px-3 py-3 text-white font-sans tracking-tight relative">
        
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none"></div>

        <div className="flex flex-col gap-1 border-b border-indigo-500/20 pb-3 mb-4 relative z-10 shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-b from-white to-gray-300 drop-shadow-sm tracking-normal">
              {player.name}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-900/60 border border-indigo-500/30 text-[10px] font-semibold text-indigo-200 shadow-sm tracking-wide">
              {player.job}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-indigo-300/80 tracking-widest uppercase mt-0.5">
            Level {player.level}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-5 relative z-10 shrink-0">
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-bold text-emerald-400 tracking-widest drop-shadow-sm">HP</span>
            <span className="text-[17px] font-bold drop-shadow-sm font-mono tracking-tight">
              {player.hp} <span className="text-xs text-slate-500 font-sans font-medium">/ {player.maxHp}</span>
            </span>
          </div>
          <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] border border-slate-700/50 relative">
             <div 
               className="absolute top-0 left-0 h-full bg-linear-to-r from-emerald-500 to-green-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] transition-all duration-300" 
               style={{ width: `${Math.min(100, (player.hp / player.maxHp) * 100)}%` }}
             />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-1 relative z-10 shrink-0">
          <div className="flex flex-col bg-slate-800/40 rounded-lg p-2.5 border border-slate-600/30 shadow-inner backdrop-blur-sm transition-colors hover:bg-slate-800/60">
            <span className="text-[10px] text-orange-400/90 font-bold tracking-widest mb-1 uppercase">Attack</span>
            <span className="font-bold text-[15px] text-slate-100 font-mono tracking-tight">{totalAtk}</span>
          </div>
          <div className="flex flex-col bg-slate-800/40 rounded-lg p-2.5 border border-slate-600/30 shadow-inner backdrop-blur-sm transition-colors hover:bg-slate-800/60">
            <span className="text-[10px] text-blue-400/90 font-bold tracking-widest mb-1 uppercase">Defend</span>
            <span className="font-bold text-[15px] text-slate-100 font-mono tracking-tight">{totalDef}</span>
          </div>
        </div>

        {isSkillModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             {/* 상태창 모달은 기존과 동일 */}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // [홈 화면] 
  // ==========================================
  return (
    <div className="mt-8 w-full max-w-5xl mx-auto font-sans">
      <div className="rounded-2xl border border-gray-200/60 bg-white/95 p-6 relative overflow-hidden shadow-xl shadow-indigo-100/50 backdrop-blur-md">
        
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-linear-to-bl from-indigo-200 to-purple-200 blur-xl opacity-70 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-linear-to-tr from-blue-200 to-cyan-200 blur-xl opacity-50 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 text-3xl shadow-lg shadow-purple-200 text-white font-bold">
              {player.job === '전사' ? '⚔️' : player.job === '마법사' ? '🔮' : '🗡️'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight drop-shadow-sm">{player.name}</h2>
              <div className="flex items-center gap-2 text-sm font-medium mt-0.5">
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 border border-indigo-100 font-bold shadow-sm">{player.job}</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 rounded border border-yellow-200 text-yellow-700 font-bold shadow-sm">
                  🪙 {player.money.toLocaleString()} G
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-w-[200px] gap-1 bg-gray-50/80 p-2 rounded-xl border border-gray-100">
             <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-bold text-indigo-900">Lv.{player.level}</span>
                <span className="text-xs font-bold text-gray-500">EXP <span className="text-indigo-600">{player.exp}</span> / {player.goalExp}</span>
             </div>
             <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner">
                <div 
                  className="h-full bg-linear-to-r from-green-400 via-emerald-500 to-teal-500 transition-all duration-500 shadow-sm" 
                  style={{ width: `${Math.min(100, (player.exp / player.goalExp) * 100)}%` }}
                />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
          
          <div className="md:col-span-7 flex flex-col gap-5">
            <div className="rounded-xl bg-linear-to-br from-rose-50 to-red-50 p-4 border border-red-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-red-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  HP
                </span>
                <span className="font-mono font-bold text-red-700">{player.hp} / {player.maxHp}</span>
              </div>
              <ProgressBar current={player.hp} max={player.maxHp} colorClass="bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 h-2 shadow-sm" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-linear-to-br from-orange-50 to-red-50 p-3 text-center border border-orange-100 shadow-sm hover:border-orange-200 transition-colors">
                <div className="text-xs font-bold text-orange-400 mb-1">ATK</div>
                <div className="text-lg font-black text-orange-950 drop-shadow-sm">{totalAtk}</div>
                {(buffAtk > 0) && <div className="text-[10px] font-bold text-orange-600 mt-0.5 bg-orange-100/50 rounded-full inline-block px-1.5">+{buffAtk}</div>}
              </div>
              <div className="rounded-xl bg-linear-to-br from-blue-50 to-cyan-50 p-3 text-center border border-blue-100 shadow-sm hover:border-blue-200 transition-colors">
                <div className="text-xs font-bold text-blue-400 mb-1">DEF</div>
                <div className="text-lg font-black text-blue-950 drop-shadow-sm">{totalDef}</div>
                 {buffDef !== 0 && (
                    <div className={`text-[10px] font-bold mt-0.5 bg-white/50 rounded-full inline-block px-1.5 ${buffDef > 0 ? 'text-red-500' : 'text-blue-600'}`}>
                      {buffDef > 0 ? `-${buffDef}` : `+${Math.abs(buffDef)}`}
                    </div>
                  )}
              </div>
              <div className="rounded-xl bg-linear-to-br from-emerald-50 to-teal-50 p-3 text-center border border-emerald-100 shadow-sm hover:border-emerald-200 transition-colors">
                <div className="text-xs font-bold text-emerald-400 mb-1">LUK</div>
                <div className="text-lg font-black text-emerald-950 drop-shadow-sm">{player.luk}</div>
              </div>
            </div>

            <button 
              onClick={onToggleSkillModal}
              className="w-full rounded-xl bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 group border-none"
            >
              <span>📜 보유 스킬 확인</span>
            </button>
          </div>

          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex-1 rounded-xl border border-indigo-50 bg-linear-to-b from-indigo-50/30 to-white p-4 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.8)]"></span>
                Equipment
              </h3>
              <div className="space-y-3 text-sm bg-white p-3 rounded-lg border border-gray-100 shadow-inner">
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-500 font-bold flex items-center gap-2">⚔️ 무기</span>
                  <span className={`font-bold ${player.weapon ? getGradeColorClass(getItemGrade(player.weapon.price || 0)) : 'text-gray-400'}`}>
                    {player.weapon ? `${player.weapon.name}${weaponEnh > 0 ? ` (+${weaponEnh/5})` : ''}` : '장착 안됨'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-500 font-bold flex items-center gap-2">🛡️ 방어구</span>
                  <span className={`font-bold ${player.armor ? getGradeColorClass(getItemGrade(player.armor.price || 0)) : 'text-gray-400'}`}>
                    {player.armor ? `${player.armor.name}${armorEnh > 0 ? ` (+${armorEnh/5})` : ''}` : '장착 안됨'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold flex items-center gap-2">🐾 펫</span>
                  <span className={`font-bold ${player.pet ? 'text-gray-800' : 'text-gray-400'}`}>
                    {player.pet ? `${player.pet.icon} ${player.pet.name}` : '장착 안됨'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 py-1.5 px-2 text-center shadow-sm shadow-blue-200 text-white">
                <div className="text-[10px] text-blue-100 font-bold">WIN</div>
                <div className="font-black text-base drop-shadow-sm leading-tight">{player.vicCount}</div>
              </div>
              <div className="flex-1 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 py-1.5 px-2 text-center border border-gray-200 shadow-sm text-gray-700">
                <div className="text-[10px] text-gray-500 font-bold">LOSE</div>
                <div className="font-black text-base leading-tight">{player.defCount}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {isSkillModalOpen && (
        <div className="fixed inset-0 z-100 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold text-gray-800">📘 스킬 마법서</h3>
              <button onClick={onToggleSkillModal} className="rounded-full p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✖️</button>
            </div>
            
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
              {learnedSkills.length > 0 ? (
                learnedSkills.map((skill) => {
                  const level = (player.skillUpgradeLevels || {})[skill.key] || 0;
                  return (
                    <div key={skill.key} className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-indigo-700 flex items-center gap-2">
                          {skill.kind === 'attack' ? '⚔️' : skill.kind === 'heal' ? '💚' : '🛡️'} {skill.name}
                        </span>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100">
                          Lv.{level}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed pl-1">
                        {skill.description}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="text-4xl">📖</div>
                  <div className="text-gray-500 font-medium">아직 배운 스킬이 없습니다.</div>
                  <div className="text-xs text-gray-400">레벨업 후 스킬 포인트를 사용하여<br/>새로운 능력을 개방해보세요!</div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button onClick={onToggleSkillModal} className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDisplay;