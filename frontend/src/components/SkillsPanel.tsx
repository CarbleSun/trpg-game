import type { PlayerStats, Skill } from '../game/types';

interface SkillsPanelProps {
  player: PlayerStats;
  skills: Skill[];
  onLearn: (key: Skill['key']) => void;
}

const SkillsPanel = ({ player, skills, onLearn }: SkillsPanelProps) => {
  const learned = new Set(player.skills || []);
  const canLearn = (s: Skill) => {
    if (player.level < s.requiredLevel) return false;
    if ((player.skillPoints || 0) <= 0) return false;
    // 이미 배운 스킬이면 레벨 체크
    const currentLevel = (player.skillUpgradeLevels || {})[s.key] || 0;
    if (currentLevel >= 5) return false; // 최대 레벨 도달
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
        ⬆️ 배울 때마다 효과가 강해집니다 (최대 5번)
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
                  const currentLevel = (player.skillUpgradeLevels || {})[s.key] || 0;
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
                              <span className="text-green-700">배움 Lv.{currentLevel}/5</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => onLearn(s.key)}
                            disabled={!eligible}
                            className="rounded border border-gray-700 px-3 py-1 text-sm font-stat enabled:hover:bg-green-600 enabled:hover:text-white disabled:opacity-50"
                          >
                            {currentLevel >= 5 ? '최대' : eligible ? (isLearned ? `배우기 (${currentLevel}/5)` : '배우기') : '불가'}
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