import type { PlayerStats, Skill } from '../game/types';
import SkillsPanel from './SkillsPanel';

interface SkillsScreenProps {
  player: PlayerStats;
  skills: Skill[];
  onClose: () => void;
  onLearn: (key: Skill['key']) => void;
  // 사용은 전투창 버튼으로만 처리
}

const SkillsScreen = ({ player, skills, onClose, onLearn }: SkillsScreenProps) => {
  return (
    <>
      {/* 배경 */}
      <div 
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* 모달 */}
      <div 
				className="fixed inset-0 z-50 flex items-center justify-center p-4" 
				onClick={onClose}
			>
        <div 
					className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl font-stat" 
					onClick={(e) => e.stopPropagation()}
				>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">📘 스킬 수련장</h1>
            <div className="text-sm">보유 포인트: <span className="font-bold">{player.skillPoints}</span></div>
          </div>

					{/* 스킬 패널 스크롤 */}
					<div className='max-h-[60vh] overflow-y-auto pr-2'>
						<SkillsPanel player={player} skills={skills} onLearn={onLearn} />
					</div>
          
          {/* 전투 사용은 전투창 버튼으로 제공 */}
          <div className="mt-4 border-t pt-4 text-right">
            <button 
							onClick={onClose} 
							className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white"
						>
							닫기 (K / Q)
						</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SkillsScreen;


