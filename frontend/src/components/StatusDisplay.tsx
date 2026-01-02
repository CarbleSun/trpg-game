import { useMemo, useState } from 'react';
import type { PlayerStats } from '../game/types';
import { skills as allSkills } from '../game/constants'; // 스킬 정보 로드
import ProgressBar from './ProgressBar';

interface StatusDisplayProps {
  player: PlayerStats;
}

const StatusDisplay = ({ player }: StatusDisplayProps) => {
	// 모달 상태 관리
	const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

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

			// 2. 방어력 배율 적용 (감소 또는 증가)
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

  // style.css의 .status, .info, .info-basic 등 변환
  return (
    <div className="mt-10 flex flex-wrap border-b border-gray-300 pb-6 font-stat text-gray-800 md:flex-nowrap">
      
      {/* 기본 정보 */}
      <div className="w-1/2 grow p-4 md:w-auto">
        <div className="text-xl font-bold">{player.name}</div>
        <div className="my-1">{player.job}</div>
        <div>{player.money} Gold</div>

				{/* 스킬 확인 버튼 */}
				<button 
					onClick={() => setIsSkillModalOpen(true)}
					className='mt-3 rounded bg-indigo-100 px-2 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-200 transition-colors'
				>
					📜 스킬 확인
				</button>
      </div>

      {/* 레벨 / 경험치 */}
      <div className="w-full grow p-4 md:w-auto md:flex-basis-1/4">
        <div className="flex items-end">
          <strong className="mr-3">LEVEL</strong>
          <div className="text-lg">{player.level}</div>
        </div>
        <div className="mt-1 flex items-center">
          <strong className="mr-3">EXP</strong>
          <ProgressBar current={player.exp} max={player.goalExp} colorClass="bg-gray-800" />
        </div>
      </div>

      {/* HP */}
      <div className="w-full grow p-4 md:w-auto md:flex-basis-1/3">
        <div className="relative">
          <strong className="text-md">HP</strong>
          <div className="mt-1">
             <ProgressBar current={player.hp} max={player.maxHp} colorClass="bg-red-500" />
          </div>
        </div>
      </div>

			{/* 스탯 및 장비 표시 */}
      <div className="w-full grow p-4 text-sm md:w-auto">

				{/* 공격력 */}
        <div className="flex">
          <div className="mr-2 min-w-[30px] text-red-600">ATK</div>
          <div className="text-gray-700">
						{totalAtk} ( {player.atk} 
						{' + '} 
						<span className="text-red-500"> {weaponAtk}</span>
						{weaponEnh > 0 && (
							<> 
								{' + '} 
								<span className="text-rose-600">{weaponEnh}</span>
							</>
						)}

						{/* 버프 수치 표시 (0이 아닌 경우에만) */}
						{buffAtk !== 0 && (
							<> 
								{' + '} 
								<span className='text-purple-600 font-bold'>Buff {buffAtk}</span>
							</>
						)}
						{' ) '}
					</div>
        </div>

				{/* 방어력 */}
        <div className="flex">
          <div className="mr-2 min-w-[30px] text-blue-600">DEF</div>
          <div className="text-gray-700">
						{totalDef} ( {player.def}
						{' + '}
						<span className="text-blue-500">{armorDef}</span>
						{armorEnh > 0 && ( 
							<>
								{' + '}
								<span className="text-sky-700">{armorEnh}</span>
							</>
						)}

						{/* 방어력 감소 시 마이너스로 표시, 증가 시 플러스로 표시 */}
						{buffDef > 0 ? (
							<>
								{' - '}
								<span className='text-purple-600 font-bold'>Buff {buffDef}</span>
							</>
						) : buffDef < 0 ? (
							<> 
								{' + '} 
								<span className='text-purple-600 font-bold'>Buff {buffDef}</span>
							</>
						) : null}
						{' ) '}
					</div>
        </div>

        <div className="flex">
          <div className="mr-2 min-w-[30px] text-green-600">LUK</div>
          <div className="text-gray-700">{player.luk}</div>
        </div>

        <div className="mt-2 border-t pt-2">
          <div className="text-xs text-gray-500">
            무기: {player.weapon ? `${player.weapon.name}${weaponEnh > 0 ? ` [${(player.weaponEnhanceLevels || {})[player.weapon.id] || 0}강]` : ''}` : '없음'}
          </div>
          <div className="text-xs text-gray-500">
            방어: {player.armor ? `${player.armor.name}${armorEnh > 0 ? ` [${(player.armorEnhanceLevels || {})[player.armor.id] || 0}강]` : ''}` : '없음'}
          </div>
          <div className="text-xs text-gray-500">
            펫: {player.pet ? `${player.pet.icon} ${player.pet.name}${(player.petEnhanceLevels || {})[player.pet.id] ? ` [${(player.petEnhanceLevels || {})[player.pet.id]}강]` : ''}` : '없음'}
          </div>
        </div>
      </div>

      {/* 승/패 */}
      <div className="w-full grow p-4 text-sm md:w-auto">
        <div className="flex">
          <div className="mr-2 min-w-[30px text-indigo-600 font-bold">승리</div>
          <div className="text-gray-700">{player.vicCount}회</div>
        </div>
        <div className="flex">
          <div className="mr-2 min-w-[30px] text-red-500 font-bold">패배</div>
          <div className="text-gray-700">{player.defCount}회</div>
        </div>
      </div>

      {/* 스킬 목록 모달 */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl animate-fade-in-up">
            <div className="mb-4 flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold text-gray-800">📘 보유 스킬 목록</h3>
              <button onClick={() => setIsSkillModalOpen(false)} className="text-gray-500 hover:text-black">✖️</button>
            </div>
            
            <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
              {learnedSkills.length > 0 ? (
                learnedSkills.map((skill) => {
                  const level = (player.skillUpgradeLevels || {})[skill.key] || 0;
                  return (
                    <div key={skill.key} className="rounded border bg-gray-50 p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-700">{skill.name}</span>
                        <span className="text-xs font-bold bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600">
                          Lv.{level}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600 leading-relaxed">
                        {skill.description}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-gray-500">
                  아직 배운 스킬이 없습니다.<br/>
                  <span className="text-xs">레벨업 후 스킬 포인트를 사용해보세요!</span>
                </div>
              )}
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setIsSkillModalOpen(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors"
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