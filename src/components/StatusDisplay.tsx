import type { PlayerStats } from '../game/types';
import ProgressBar from './ProgressBar';

interface StatusDisplayProps {
  player: PlayerStats;
}

const StatusDisplay = ({ player }: StatusDisplayProps) => {
  // style.css의 .status, .info, .info-basic 등 변환
  return (
    <div className="mt-10 flex flex-wrap border-b border-gray-300 pb-6 font-stat text-gray-800 md:flex-nowrap">
      
      {/* 기본 정보 (style.css .info-basic) */}
      <div className="w-1/2 grow p-4 md:w-auto">
        <div className="text-xl font-bold">{player.name}</div>
        <div className="my-1">{player.job}</div>
        <div>{player.money} Gold</div>
      </div>

      {/* 레벨/경험치 (style.css .info-level) */}
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

      {/* HP (style.css .info-health) */}
      <div className="w-full grow p-4 md:w-auto md:flex-basis-1/3">
        <div className="relative">
          <strong className="text-md">HP</strong>
          <div className="mt-1">
             <ProgressBar current={player.hp} max={player.maxHp} colorClass="bg-red-500" />
          </div>
        </div>
      </div>

      {/* 승/패 (style.css .info-history) */}
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

    </div>
  );
};

export default StatusDisplay;