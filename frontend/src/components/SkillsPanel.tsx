import type { PlayerStats, Skill } from '../game/types';
import { getEffectivePlayerStats } from '../game/playerLogic';

interface SkillsPanelProps {
  player: PlayerStats;
  skills: Skill[];
  onLearn: (key: Skill['key']) => void;
}

const SkillsPanel = ({ player, skills, onLearn }: SkillsPanelProps) => {
  const learned = new Set(player.skills || []);

	// 스킬 비용 계산 함수 (현재 레벨 + 1)
	const getSkillCost = (currentLevel: number) => currentLevel + 1;

  const canLearn = (s: Skill) => {
 		const currentLevel = (player.skillUpgradeLevels || {})[s.key] || 0;

		// 마스터 레벨 체크 (데이터에 없으면 기본 5)
		const maxLevel = s.maxLevel || 5;
    if (currentLevel >= maxLevel) return false; // 최대 레벨 도달

		// 요구 레벨 체크
		if (player.level < s.requiredLevel) return false;

		// 포인트 체크 (비용 증가 반영)
		const cost = getSkillCost(currentLevel);
		if ((player.skillPoints || 0) < cost) return false;

    return true;
  };

  // 스킬 효과 설명 생성 (레벨별 효과 표시)
  const getSkillEffectDescription = (skill: Skill, currentLevel: number): string => {
    const cdText = skill.cooldown > 0 ? ` [⏳ 쿨타임: ${skill.cooldown}턴]` : ' [⚡ 즉시 발동]';
    
    if (skill.kind === 'attack') {
      const base = (skill.damageMultiplier || 1) * 100;
      const growth = (skill.growthPerLevel || 0) * 100;
      const currentPower = Math.floor(base + (currentLevel * growth));
      
      let text = `적에게 공격력의 ${currentPower}% 피해`;
      if (growth > 0) text += ` (Lv당 +${growth}%)`;
      return text + cdText;
    } 
    else if (skill.kind === 'heal') {
      const base = (skill.damageMultiplier || 1) * 100;
      const growth = (skill.growthPerLevel || 0) * 100;
      const currentPower = Math.floor(base + (currentLevel * growth));

      let text = `체력을 공격력의 ${currentPower}% 만큼 회복`;
      if (growth > 0) text += ` (Lv당 +${growth}%)`;
      return text + cdText;
    } 
    else if (skill.kind === 'buff') {
      let text = skill.description;

			// 버프 성장 수치 계산
      const baseValue = skill.effect?.value || 0;
      const growth = skill.growthPerLevel || 0;
      const currentValue = baseValue + (currentLevel * growth);
      
      // trade_off 타입일 때 구체적인 수치 표시
      if (skill.effect && skill.effect.type === 'trade_off') {
        const effectiveStats = getEffectivePlayerStats(player);

				// 현재 스탯 기준 증가량 계산 (성장치 반영)
        const atkIncrease = Math.floor(effectiveStats.atk * currentValue);
        const defDecrease = Math.floor(effectiveStats.def * skill.effect.penalty);
        
				text = `공격력 +${atkIncrease}, 방어력 -${defDecrease}`;
				if (growth > 0) text += ` (Lv당 +${growth * 100}%)`;
      }
      // charge 타입일 때
			else if (skill.effect && skill.effect.type === 'charge') {
         if (growth > 0) text += ` (효과: ${(currentValue * 100).toFixed(0)}%, Lv당 +${growth * 100}%)`;
      }
			
      if (skill.duration) text += ` (${skill.duration}턴 지속)`;
      return text + cdText;
    }
    return skill.description + cdText;
  };

  // 직업 필터 및 레벨별 그룹화
  const eligibleByJob = skills.filter(s => !s.allowedJobs || s.allowedJobs.includes(player.job));
  const grouped = eligibleByJob.reduce<Record<number, Skill[]>>((acc, s) => {
    if (!acc[s.requiredLevel]) acc[s.requiredLevel] = [];
    acc[s.requiredLevel].push(s);
    return acc;
  }, {});
  const levels = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <section className="mt-6 rounded border border-gray-300 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-stat text-lg font-bold">📘 스킬</h2>
        <div className="text-sm text-gray-700">보유 스킬 포인트: <span className="font-bold">{player.skillPoints}</span></div>
      </div>
      
      <div className="mb-4 rounded bg-blue-50 p-2 text-center text-xs text-blue-600">
        ⬆️ 스킬 레벨이 오를수록 효과와 필요 포인트가 증가합니다.
      </div>

      <div className="flex flex-col gap-6">
        {levels.map((lvl) => (
          <div key={lvl}>
            <div className="mb-2 border-l-4 border-gray-700 pl-2 font-stat text-base font-bold">Lv.{lvl}+</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {grouped[lvl]
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => {
                  const isLearned = learned.has(s.key);
                  const eligible = canLearn(s);

									// 현재 레벨, 최대 레벨, 비용 계산
                  const currentLevel = (player.skillUpgradeLevels || {})[s.key] || 0;
									const maxLevel = s.maxLevel || 5;
                  const cost = getSkillCost(currentLevel);

									// 버튼 텍스트 결정
                  let btnText = '불가';
                  if (currentLevel >= maxLevel) {
                    btnText = '최대';
                  } else if (eligible) {
                    // 배울 수 있음 (비용 표시)
                    btnText = isLearned ? `강화 (-${cost}P)` : `배우기 (-${cost}P)`;
                  } else {
                    // 배울 수 없음 (이유 표시)
                    if (player.level < s.requiredLevel) {
                       btnText = `Lv.${s.requiredLevel} 필요`;
                    } else if ((player.skillPoints || 0) < cost) {
                       btnText = `P 부족 (${cost})`;
                    }
                  }

                  return (
                    <div key={s.key} className="rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold">{s.name}</div>
                          <div className="text-sm text-gray-700">
                            {getSkillEffectDescription(s, currentLevel)}
                          </div>
                          {isLearned && (
                            <div className="mt-1 text-xs">
                              <span className="text-green-700">배움 Lv.{currentLevel}/{maxLevel}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => onLearn(s.key)}
                            disabled={!eligible}
                            className="rounded border border-gray-700 px-3 py-1 text-sm font-stat enabled:hover:bg-green-600 enabled:hover:text-white disabled:opacity-50"
                          >
                            {btnText}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkillsPanel;