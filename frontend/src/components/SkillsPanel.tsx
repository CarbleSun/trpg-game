import type { PlayerStats, Skill } from '../game/types';

interface SkillsPanelProps {
  player: PlayerStats;
  skills: Skill[];
  onLearn: (key: Skill['key']) => void;
}

const SkillsPanel = ({ player, skills, onLearn }: SkillsPanelProps) => {
  const learned = new Set(player.skills || []);
  const canLearn = (s: Skill) => {
    if (learned.has(s.key)) return false;
    if (player.level < s.requiredLevel) return false;
    if ((player.skillPoints || 0) <= 0) return false;
    return true;
  };

  // 레벨별 그룹화
  const grouped = skills.reduce<Record<number, Skill[]>>((acc, s) => {
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
                  return (
                    <div key={s.key} className="flex items-center justify-between rounded border border-gray-200 p-3">
                      <div>
                        <div className="font-bold">{s.name}</div>
                        <div className="text-sm text-gray-700">{s.description}</div>
                        {isLearned && <div className="text-xs text-green-700">습득됨</div>}
                      </div>
                      <button
                        onClick={() => onLearn(s.key)}
                        disabled={!eligible}
                        className="rounded border border-gray-700 px-3 py-1 text-sm font-stat enabled:hover:bg-green-600 enabled:hover:text-white disabled:opacity-50"
                      >
                        {isLearned ? '완료' : eligible ? '배우기' : '불가'}
                      </button>
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


