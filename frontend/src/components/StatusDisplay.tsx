import { useMemo } from 'react';
import type { PlayerStats } from '../game/types';
import { skills } from '../game/constants';
import ProgressBar from './ProgressBar';

interface StatusDisplayProps {
  player: PlayerStats;
}

const StatusDisplay = ({ player }: StatusDisplayProps) => {
	// 유효 스탯 계산
  const weaponAtk = player.weapon?.value || 0;
  const armorDef = player.armor?.value || 0;
  const weaponEnh = player.weapon ? ((player.weaponEnhanceLevels || {})[player.weapon.id] || 0) * 5 : 0;
  const armorEnh = player.armor ? ((player.armorEnhanceLevels || {})[player.armor.id] || 0) * 5 : 0;
  
	// 버프 스탯 계산
	const { buffAtk, buffDef, totalAtk, totalDef } = useMemo(() => {
		let bAtk = 0;
		let bDef = 0;

		// 유효 스탯 계산 (장비 포함)
		const baseAtk = player.atk + weaponAtk + weaponEnh;
		let baseDef = player.def + armorDef + armorEnh;

		// activeBuffs는 객체 배열
		const activeBuffs = player.activeBuffs || [];

		// 방어력 배율 적용 전 방어력 저장 (감소량 계산용)
		const defBeforeBuffs = baseDef;

		activeBuffs.forEach((buff) => {
			const skillInfo = skills.find((s) => s.key === buff.key);

			if (skillInfo && skillInfo.effect) {
				if (skillInfo.effect.type === 'trade_off') {
					// 공격력 증가: 유효 공격력 * value
					if (skillInfo.effect.value) {
						bAtk += Math.floor(baseAtk * skillInfo.effect.value);
					}
				}
				// charge 타입도 공격력 증가
				else if (skillInfo.effect.type === 'charge' && skillInfo.effect.value) {
					bAtk += Math.floor(baseAtk * skillInfo.effect.value);
				}
			}

			// defenseMultiplier 적용 (곱셈)
			if (buff.defenseMultiplier !== undefined) {
				baseDef = Math.floor(baseDef * buff.defenseMultiplier);
			}
		});

		// 방어력 감소량 계산
		bDef = defBeforeBuffs - baseDef;

		// 최종 스탯 계산
		const finalAtk = baseAtk + bAtk;
		const finalDef = Math.max(0, baseDef); // 음수 방지

		return { buffAtk: bAtk, buffDef: bDef, totalAtk: finalAtk, totalDef: finalDef };
	}, [player, weaponAtk, weaponEnh, armorDef, armorEnh]);

  // style.css의 .status, .info, .info-basic 등 변환
  return (
    <div className="mt-10 flex flex-wrap border-b border-gray-300 pb-6 font-stat text-gray-800 md:flex-nowrap">
      
      {/* 기본 정보 */}
      <div className="w-1/2 grow p-4 md:w-auto">
        <div className="text-xl font-bold">{player.name}</div>
        <div className="my-1">{player.job}</div>
        <div>{player.money} Gold</div>
      </div>

      {/* 레벨/경험치  */}
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
						+ <span className="text-red-500">{weaponAtk}</span>
						{weaponEnh > 0 && <> + <span className="text-rose-600">{weaponEnh}</span></>}
						{/* 버프 수치 표시 (0이 아닌 경우에만) */}
						{buffAtk !== 0 && (
							<> + <span className='text-purple-600 font-bold'>Buff {buffAtk}</span></>
						)}
						)
					</div>
        </div>

				{/* 방어력 */}
        <div className="flex">
          <div className="mr-2 min-w-[30px] text-blue-600">DEF</div>
          <div className="text-gray-700">
						{totalDef} ( {player.def} 
						+ <span className="text-blue-500">{armorDef}</span>
						{armorEnh > 0 && <> + <span className="text-sky-700">{armorEnh}</span></>} 
						{buffDef > 0 && (
							<> - <span className='text-purple-600 font-bold'>Buff {buffDef}</span></>
						)}
						)
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
      <div className="w-1/2 grow p-4 text-sm md:w-auto">
        <div className="flex justify-end">
          <div className="mr-2 min-w-[30px]">승리</div>
          <div className="text-gray-700">{player.vicCount}회</div>
        </div>
        <div className="flex justify-end">
          <div className="mr-2 min-w-[30px]">패배</div>
          <div className="text-gray-700">{player.defCount}회</div>
        </div>
      </div>

      {/* 펫 표시는 상단 UI에서 숨김 */}

    </div>
  );
};

export default StatusDisplay;