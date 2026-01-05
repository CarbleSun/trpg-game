import { useMemo } from 'react';
import type { PlayerStats } from '../game/types';
import { skills as allSkills } from '../game/constants'; // 스킬 정보 로드
import ProgressBar from './ProgressBar';

interface StatusDisplayProps {
  player: PlayerStats;
	compact?: boolean; // 전투 화면용 축소 모드
	isSkillModalOpen: boolean;
  onToggleSkillModal: () => void;
}

const StatusDisplay = ({ 
	player, 
	compact = false,
	isSkillModalOpen, 
  onToggleSkillModal 
}: StatusDisplayProps) => {

	// 유효 스탯 계산
  const weaponAtk = player.weapon?.value || 0;
  const armorDef = player.armor?.value || 0;
  const weaponEnh = player.weapon ? ((player.weaponEnhanceLevels || {})[player.weapon.id] || 0) * 5 : 0;
  const armorEnh = player.armor ? ((player.armorEnhanceLevels || {})[player.armor.id] || 0) * 5 : 0;
  
	// 버프 스탯 계산
	const { buffAtk, buffDef, totalAtk, totalDef } = useMemo(() => {
		let bAtk = 0;
		let bDef = 0;  // 방어력 '감소량'을 저장할 변수

		// 유효 스탯 계산 (캐릭터 + 장비 + 강화)
		const baseAtk = player.atk + weaponAtk + weaponEnh;
		let baseDef = player.def + armorDef + armorEnh;

		// activeBuffs는 객체 배열
		const activeBuffs = player.activeBuffs || [];

		// 방어력 배율 적용 전 방어력 저장 (감소량 계산용)
		const defBeforeBuffs = baseDef;

		activeBuffs.forEach((buff) => {
			// constants의 skills를 찾지 않고, buff 객체에 저장된 실시간 수치를 사용
      // 공격력 증가 계산 (charge, trade_off 등 모든 공격 배율)
      // useGameEngine에서 이미 레벨업이 반영된 수치를 넣어둠
			if (buff.chargeAttackMultiplier && buff.chargeAttackMultiplier > 0) {
        bAtk += Math.floor(baseAtk * buff.chargeAttackMultiplier);
      }

			// 방어력 배율 적용 (감소 또는 증가)
      if (buff.defenseMultiplier !== undefined) {
        baseDef = Math.floor(baseDef * buff.defenseMultiplier);
      }
		});

		// 방어력 변동량 계산 (원본 - 현재)
    // 예: 원본 100 -> 버프후 70 => 차이 30 (이 값을 UI에 마이너스로 표시)
		bDef = defBeforeBuffs - baseDef;

		// 최종 스탯 계산
		const finalAtk = baseAtk + bAtk;
		const finalDef = Math.max(0, baseDef); // 음수 방지

		return { buffAtk: bAtk, buffDef: bDef, totalAtk: finalAtk, totalDef: finalDef };
	}, [player, weaponAtk, weaponEnh, armorDef, armorEnh]);

	// 보유 스킬 목록 필터링
	const learnedSkills = useMemo(() => {
		return allSkills.filter(s => (player.skills || []).includes(s.key));
	}, [player.skills]);

	// 축소 모드 (전투 화면용) 렌더링
  if (compact) {
    return (
      <div className="w-full font-sans flex flex-col">
        <div className="flex-1 rounded-xl border border-gray-300 bg-white/95 backdrop-blur shadow-sm p-3 flex flex-col gap-2 overflow-hidden">
          
          {/* 헤더 */}
          <div className="flex justify-between items-start shrink-0">
            <div>
               <div className="flex items-center gap-1.5">
                 <span className="text-base font-bold text-gray-800 truncate max-w-[100px]">{player.name}</span>
                 <span className="px-1.5 py-px rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                   Lv.{player.level}
                 </span>
               </div>
               <div className="text-[10px] text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                 <span className="bg-gray-100 px-1 rounded">{player.job}</span>
                 <span className="text-yellow-600 font-bold">🪙 {player.money.toLocaleString()}</span>
               </div>
            </div>
            {/* 아이콘 크기 축소 */}
            <div className="text-2xl filter drop-shadow-sm">
              {player.job === '전사' ? '⚔️' : player.job === '마법사' ? '🔮' : '🗡️'}
            </div>
          </div>

          {/* 게이지 */}
          <div className="flex flex-col gap-1 shrink-0">
             {/* HP */}
             <div>
                <div className="flex justify-between text-[10px] font-bold text-red-700 mb-0.5">
                  <span>HP</span>
                  <span className="font-mono">{player.hp}/{player.maxHp}</span>
                </div>
                <ProgressBar current={player.hp} max={player.maxHp} colorClass="bg-red-500 h-1.5" />
             </div>
             {/* EXP */}
             <div>
                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden mt-1">
                   <div 
                     className="h-full bg-green-500 transition-all duration-300" 
                     style={{ width: `${Math.min(100, (player.exp / player.goalExp) * 100)}%` }}
                   />
                </div>
             </div>
          </div>

          <div className="border-t border-gray-100 shrink-0"></div>

          {/* 스탯 */}
          <div className="grid grid-cols-3 gap-1.5 shrink-0">
             <div className="bg-gray-50 p-1.5 rounded border border-gray-200 text-center">
                <div className="text-[9px] text-gray-400 font-bold">ATK</div>
                <div className="font-black text-gray-800 text-xs">
                  {totalAtk}
                  {buffAtk > 0 && <span className="text-[8px] text-purple-600 ml-0.5">+{buffAtk}</span>}
                </div>
             </div>
             <div className="bg-gray-50 p-1.5 rounded border border-gray-200 text-center">
                <div className="text-[9px] text-gray-400 font-bold">DEF</div>
                <div className="font-black text-gray-800 text-xs">
                  {totalDef}
                  {buffDef !== 0 && (
                    <span className={`text-[8px] ml-0.5 ${buffDef > 0 ? 'text-purple-600' : 'text-blue-600'}`}>
                      {buffDef > 0 ? `-${buffDef}` : `+${Math.abs(buffDef)}`}
                    </span>
                  )}
                </div>
             </div>
             <div className="bg-gray-50 p-1.5 rounded border border-gray-200 text-center">
                <div className="text-[9px] text-gray-400 font-bold">LUK</div>
                <div className="font-black text-gray-800 text-xs">{player.luk}</div>
             </div>
          </div>

          {/* 장비 */}
          <div className="text-[10px] space-y-1 bg-gray-50/50 p-2 rounded-lg border border-gray-100 shrink-0">
             <div className="flex justify-between items-center">
               <span className="text-gray-400 font-bold w-8">무기</span>
               <span className={`font-medium truncate flex-1 text-right ${player.weapon ? 'text-gray-700' : 'text-gray-300'}`}>
                 {player.weapon ? `${player.weapon.name}${weaponEnh > 0 ? ` (+${weaponEnh/5})` : ''}` : '-'}
               </span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-gray-400 font-bold w-8">방어</span>
               <span className={`font-medium truncate flex-1 text-right ${player.armor ? 'text-gray-700' : 'text-gray-300'}`}>
                 {player.armor ? `${player.armor.name}${armorEnh > 0 ? ` (+${armorEnh/5})` : ''}` : '-'}
               </span>
             </div>
             {player.pet && (
               <div className="flex justify-between items-center">
                 <span className="text-gray-400 font-bold w-8">펫</span>
                 <span className="font-medium text-gray-700 truncate flex-1 text-right">{player.pet.name}</span>
               </div>
             )}
          </div>

          {/* 버튼 */}
          <button 
            onClick={onToggleSkillModal}
            className="w-full shrink-0 rounded border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            📜 스킬 확인
          </button>

        </div>
        
        {/* 모달 (기존 유지) */}
        {isSkillModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-in">
              <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xl font-bold text-gray-800">📘 보유 스킬 목록</h3>
                <button onClick={onToggleSkillModal} className="rounded-full p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✖️</button>
              </div>
              <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                {learnedSkills.length > 0 ? (
                  learnedSkills.map((skill) => {
                    const level = (player.skillUpgradeLevels || {})[skill.key] || 0;
                    return (
                      <div key={skill.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-indigo-700">{skill.name}</span>
                          <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">Lv.{level}</span>
                        </div>
                        <div className="text-sm text-gray-600">{skill.description}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-gray-500">배운 스킬이 없습니다.</div>
                )}
              </div>
              <div className="mt-6">
                <button onClick={onToggleSkillModal} className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800">닫기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 전체 모드 (홈 화면용) 렌더링
  return (
    <div className="mt-8 w-full max-w-5xl mx-auto font-sans">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-50 blur-xl opacity-70 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-3xl shadow-lg text-white font-bold">
              {player.job === '전사' ? '⚔️' : player.job === '마법사' ? '🔮' : '🗡️'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{player.name}</h2>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600 border border-gray-200">{player.job}</span>
                <span className="text-yellow-600 font-bold">🪙 {player.money.toLocaleString()} G</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-w-[200px] gap-1">
             <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-bold text-gray-400">Lv.{player.level}</span>
                <span className="text-xs text-gray-500">EXP {player.exp} / {player.goalExp}</span>
             </div>
             <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div 
                  className="h-full bg-linear-to-r from-green-400 to-emerald-500 transition-all duration-500" 
                  style={{ width: `${Math.min(100, (player.exp / player.goalExp) * 100)}%` }}
                />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 flex flex-col gap-5">
            <div className="rounded-xl bg-red-50 p-4 border border-red-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-red-800">HP</span>
                <span className="font-mono font-bold text-red-700">{player.hp} / {player.maxHp}</span>
              </div>
              <ProgressBar current={player.hp} max={player.maxHp} colorClass="bg-gradient-to-r from-red-500 to-rose-600" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 text-center border border-gray-100 hover:border-red-200 transition-colors">
                <div className="text-xs font-bold text-gray-400 mb-1">ATK</div>
                <div className="text-lg font-black text-gray-800">{totalAtk}</div>
                {(buffAtk > 0) && <div className="text-[10px] font-bold text-purple-600 animate-pulse">+{buffAtk}</div>}
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center border border-gray-100 hover:border-blue-200 transition-colors">
                <div className="text-xs font-bold text-gray-400 mb-1">DEF</div>
                <div className="text-lg font-black text-gray-800">{totalDef}</div>
                 {buffDef !== 0 && (
                    <div className={`text-[10px] font-bold ${buffDef > 0 ? 'text-purple-600' : 'text-blue-600'}`}>
                      {buffDef > 0 ? `-${buffDef}` : `+${Math.abs(buffDef)}`}
                    </div>
                  )}
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center border border-gray-100 hover:border-green-200 transition-colors">
                <div className="text-xs font-bold text-gray-400 mb-1">LUK</div>
                <div className="text-lg font-black text-gray-800">{player.luk}</div>
              </div>
            </div>

            <button 
              onClick={onToggleSkillModal}
              className="w-full rounded-xl border border-indigo-100 bg-indigo-50 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-100 hover:shadow-inner transition-all flex items-center justify-center gap-2"
            >
              <span>📜 보유 스킬 확인</span>
            </button>
          </div>

          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Equipment</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">⚔️ 무기</span>
                  <span className={`font-medium ${player.weapon ? 'text-gray-800' : 'text-gray-400'}`}>
                    {player.weapon ? `${player.weapon.name}${weaponEnh > 0 ? ` (+${weaponEnh/5})` : ''}` : '없음'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">🛡️ 방어구</span>
                  <span className={`font-medium ${player.armor ? 'text-gray-800' : 'text-gray-400'}`}>
                    {player.armor ? `${player.armor.name}${armorEnh > 0 ? ` (+${armorEnh/5})` : ''}` : '없음'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">🐾 펫</span>
                  <span className={`font-medium ${player.pet ? 'text-gray-800' : 'text-gray-400'}`}>
                    {player.pet ? `${player.pet.icon} ${player.pet.name}` : '없음'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-blue-50 p-3 text-center border border-blue-100">
                <div className="text-xs text-blue-400 font-bold">WIN</div>
                <div className="font-black text-blue-700">{player.vicCount}</div>
              </div>
              <div className="flex-1 rounded-xl bg-gray-100 p-3 text-center border border-gray-200">
                <div className="text-xs text-gray-400 font-bold">LOSE</div>
                <div className="font-black text-gray-600">{player.defCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
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
              <button
                onClick={onToggleSkillModal}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all"
              >
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