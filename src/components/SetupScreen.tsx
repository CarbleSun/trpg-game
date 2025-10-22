import { useState } from 'react';
import type { Job } from '../game/types';

interface SetupScreenProps {
  onGameStart: (name: string, job: Job) => void;
}

const jobs: Job[] = ['마법사', '전사', '도적'];

const SetupScreen = ({ onGameStart }: SetupScreenProps) => {
  const [name, setName] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job>('마법사');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onGameStart(name.trim(), selectedJob);
    } else {
      alert('이름을 입력하세요.');
    }
  };

  // style.css의 .menu button 스타일을 차용
  const buttonStyle = "font-stat text-sm border border-gray-600 rounded px-4 py-2 text-gray-800 cursor-pointer hover:bg-blue-700 hover:border-blue-700 hover:text-white";
  const selectedButtonStyle = "bg-blue-700 border-blue-700 text-white";

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="text-center font-stat text-2xl font-bold">캐릭터 생성</h1>
        
        {/* 이름 입력 */}
        <div>
          <label htmlFor="name" className="mb-1 block font-stat text-sm font-medium">
            이름
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
            placeholder="용사의 이름을 입력하세요"
          />
        </div>

        {/* 직업 선택 */}
        <div>
          <label className="mb-1 block font-stat text-sm font-medium">직업</label>
          <div className="flex justify-around gap-2">
            {jobs.map((job) => (
              <button
                type="button"
                key={job}
                onClick={() => setSelectedJob(job)}
                className={`${buttonStyle} ${selectedJob === job ? selectedButtonStyle : ''}`}
              >
                {job}
              </button>
            ))}
          </div>
        </div>

        {/* 시작 버튼 */}
        <button
          type="submit"
          className={`${buttonStyle} ${selectedButtonStyle} mt-4 w-full`} // 항상 선택된 스타일
        >
          게임 시작
        </button>
      </form>
    </div>
  );
};

export default SetupScreen;