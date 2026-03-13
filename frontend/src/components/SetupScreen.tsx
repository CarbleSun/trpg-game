import { useState, useEffect } from 'react';
import type { Job } from '../game/types';
import { 
  playClickSound, 
  playStartSound, 
  playHoverSound, 
  playEnterWorldSound, 
  playTitleMusic, 
  stopTitleMusic,
  playCreationMusic,   // 🌟 새로 만든 재생 함수 추가
  stopCreationMusic    // 🌟 새로 만든 정지 함수 추가
} from '../game/sound';

interface SetupScreenProps {
  onGameStart: (name: string, job: Job) => void;
}

const jobs: Job[] = ['마법사', '전사', '도적'];
const jobIcons: Record<Job, string> = { '마법사': '🔮', '전사': '⚔️', '도적': '🗡️' };

const jobDescriptions: Record<Job, string> = {
  '전사': '높은 체력과 묵직한 물리 공격력으로 적을 분쇄합니다. 든든한 방어력을 갖춘 근접 전투의 스페셜리스트입니다.',
  '마법사': '강력한 마법으로 적의 약점을 찌릅니다. 체력은 낮지만, 압도적인 파괴력과 다양한 유틸리티를 자랑합니다.',
  '도적': '눈에 보이지 않는 빠른 속도와 치명타로 적을 유린합니다. 높은 회피율과 기습 공격이 특기입니다.'
};

const SetupScreen = ({ onGameStart }: SetupScreenProps) => {
  const [step, setStep] = useState<'title' | 'creation'>('title');
  const [name, setName] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job>('전사'); 

  // 🌟 핵심 로직: step 상태에 따라 어떤 배경음악을 재생할지 결정
  useEffect(() => {
    if (step === 'title') {
      stopCreationMusic(); // 캐릭터 창에서 넘어왔을 수 있으니 정지
      playTitleMusic();
    } else if (step === 'creation') {
      stopTitleMusic();    // 타이틀 창에서 넘어오자마자 정지
      playCreationMusic(); // 조건 1: 캐릭터 생성 창 진입 시 재생
    }
  }, [step]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      // 🌟 조건 2: "세계로 진입" 버튼을 누르면 즉시 모든 노래 정지
      stopTitleMusic();
      stopCreationMusic(); 
      playEnterWorldSound();
      onGameStart(name.trim(), selectedJob);
    } else {
      alert('용사의 이름을 입력해주세요.');
    }
  };

  return (
    <div 
      onClick={() => step === 'title' && playTitleMusic()}
      className="relative flex h-screen w-full items-center justify-center bg-sky-50 text-slate-800 font-sans overflow-hidden"
    >
      
      {/* 배경 오라 레이어 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/40 blur-[100px] rounded-full mix-blend-multiply animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-sky-300/40 blur-[120px] rounded-full mix-blend-multiply"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-100/50 blur-[150px] rounded-full mix-blend-multiply"></div>
      </div>

      {/* 진한 커튼 햇살 애니메이션 레이어 */}
      <div className="absolute inset-0 z-1 overflow-hidden pointer-events-none mix-blend-overlay">
        <style>{`
          @keyframes curtainSway1 {
            0%, 100% { transform: scale(1.2) translateX(-2%) skewX(-20deg); opacity: 0.6; }
            50% { transform: scale(1.2) translateX(2%) skewX(-15deg); opacity: 0.95; }
          }
          @keyframes curtainSway2 {
            0%, 100% { transform: scale(1.2) translateX(2%) skewX(-18deg); opacity: 0.5; }
            50% { transform: scale(1.2) translateX(-3%) skewX(-22deg); opacity: 0.85; }
          }
        `}</style>
        
        <div 
          className="absolute top-[-20%] left-[-10%] w-[150%] h-[150%] origin-top"
          style={{ 
            background: 'repeating-linear-gradient(to right, transparent, transparent 60px, rgba(255,255,255,0.4) 120px, rgba(255,253,230,0.6) 180px, transparent 240px)',
            filter: 'blur(20px)',
            animation: 'curtainSway1 10s ease-in-out infinite',
          }}
        />
        
        <div 
          className="absolute top-[-20%] left-[0%] w-[150%] h-[150%] origin-top"
          style={{ 
            background: 'repeating-linear-gradient(to right, transparent, transparent 100px, rgba(255,255,255,0.3) 140px, rgba(255,253,230,0.45) 180px, transparent 250px)',
            filter: 'blur(30px)',
            animation: 'curtainSway2 14s ease-in-out infinite',
          }}
        />
      </div>

      {/* 콘텐츠 레이어 */}
      {step === 'title' ? (
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
          <style>{`
            @keyframes titleFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            .anim-title { animation: titleFloat 4s ease-in-out infinite; }
          `}</style>
          
          <div className="text-center anim-title flex flex-col items-center">
            <h1 className="text-6xl md:text-8xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-indigo-800 via-blue-600 to-sky-400 drop-shadow-lg">
              DUNGEON <br className="md:hidden" /> RPG
            </h1>
            <p className="text-indigo-600 font-bold tracking-[0.3em] mb-24 uppercase text-xs md:text-sm drop-shadow-sm">
              A Text-based Adventure
            </p>
            
            <button
              onMouseEnter={playHoverSound} 
              onClick={(e) => {
                e.stopPropagation(); 
                // 🌟 step이 'creation'으로 바뀌면서 useEffect가 작동해 새 노래가 재생됩니다.
                playStartSound(); 
                setStep('creation');
              }}
              className="text-lg md:text-xl font-bold tracking-widest text-indigo-700 animate-pulse hover:text-indigo-500 transition-all px-12 py-4 rounded-full border-2 border-transparent hover:border-indigo-300 hover:bg-white/50 focus:outline-none shadow-[0_0_30px_rgba(99,102,241,0.2)]"
            >
              ▶ PRESS START
            </button>
          </div>
        </div>

      ) : (
        <form
          onSubmit={handleSubmit}
          className="relative z-10 flex w-full max-w-md flex-col gap-5 rounded-3xl bg-white/60 backdrop-blur-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-white/80"
        >
          <div className="text-center mb-1">
            <h2 className="text-2xl font-black tracking-wider text-slate-800 drop-shadow-sm">용사 등록</h2>
            <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide">새로운 운명을 개척할 이름을 새겨주세요.</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-xs font-bold tracking-widest text-indigo-600 uppercase pl-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/80 p-3.5 text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 focus:outline-none transition-all shadow-inner"
              placeholder="이름을 입력하세요"
              autoFocus
              maxLength={10}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold tracking-widest text-indigo-600 uppercase pl-1">Class</label>
            <div className="grid grid-cols-3 gap-3">
              {jobs.map((job) => (
                <button
                  type="button"
                  key={job}
                  onMouseEnter={playHoverSound} 
                  onClick={() => {
                    playClickSound(); 
                    setSelectedJob(job)
                  }}
                  className={`flex flex-col items-center justify-center py-4 rounded-xl border transition-all duration-200 shadow-sm ${
                    selectedJob === job 
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]' 
                      : 'border-white/60 bg-white/50 text-slate-500 hover:border-indigo-200 hover:bg-white/80'
                  }`}
                >
                  <span className="text-3xl mb-1.5 drop-shadow-sm">{jobIcons[job]}</span>
                  <span className="text-sm font-bold tracking-wide">{job}</span>
                </button>
              ))}
            </div>

            <div className="h-16 mt-1 flex items-center justify-center transition-all duration-300">
              <div 
                key={selectedJob} 
                className="w-full p-3 bg-white/70 backdrop-blur-md rounded-xl border border-white/80 text-xs text-slate-700 shadow-sm leading-relaxed animate-in fade-in zoom-in-95 duration-200"
              >
                <span className="font-bold text-indigo-600 mr-1.5">[{selectedJob}]</span>
                {jobDescriptions[selectedJob]}
              </div>
            </div>

          </div>

          <div className="mt-2 flex flex-col gap-3">
            <button
              type="submit"
              onMouseEnter={playHoverSound}
              className="w-full rounded-xl bg-linear-to-r from-sky-500 to-indigo-600 py-4 text-base font-bold tracking-widest text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all border border-indigo-400/50"
            >
              세계로 진입하기
            </button>
            
            <button 
              type="button"
              onMouseEnter={playHoverSound}
              onClick={() => {
                playClickSound(); 
                setStep('title') // 🌟 'title'로 돌아가면 useEffect에 의해 생성 BGM은 멈추고 타이틀 BGM이 재생됩니다.
              }}
              className="text-xs font-medium tracking-wide text-slate-400 hover:text-indigo-600 transition-colors mt-1 py-2"
            >
              ◀ 타이틀로 돌아가기
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SetupScreen;