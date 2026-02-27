import { useEffect, useRef } from 'react';
import type { LogMessage, LogType } from '../game/types';

interface GameLogProps {
  messages: LogMessage[];
  isBattle?: boolean;
}

const getLogTypeClass = (type: LogType): string => {
  switch (type) {
    case 'atk': return 'text-red-600';
    case 'cri': return 'text-red-700 font-extrabold text-[1.05em]';
    case 'vic': return 'text-blue-700 font-bold bg-blue-50 px-2 rounded -mx-2';
    case 'def': return 'text-gray-800 font-bold';
    case 'lvup': return 'text-yellow-700 font-bold bg-yellow-50 px-2 rounded -mx-2 border border-yellow-200';
    case 'fail': return 'text-gray-400 italic';
    case 'appear': return 'font-bold text-gray-900 border-b-2 border-gray-200 pb-1 mb-2 mt-2 block';
    case 'gainExp': return 'text-emerald-600 font-medium';
    case 'gainMoney': return 'text-amber-600 font-medium';
    case 'tryToAtk': return 'text-red-400';
    default: return 'text-gray-600';
  }
};

const getJrpgColorClass = (type: LogType): string => {
  switch (type) {
    case 'lvup': case 'vic': case 'gainExp': case 'gainMoney': return 'text-emerald-400 font-bold drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]';
    case 'cri': return 'text-yellow-400 font-black animate-pulse drop-shadow-[0_0_5px_rgba(250,204,21,0.6)]';
    case 'atk': case 'tryToAtk': return 'text-indigo-300';
    case 'appear': return 'text-rose-400 font-bold border-b border-rose-500/30 pb-1 mb-2 mt-2 block';
    case 'fail': return 'text-slate-500';
    default: return 'text-slate-200';
  }
};

const GameLog = ({ messages, isBattle = false }: GameLogProps) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageIdsRef = useRef<Set<number>>(new Set());
  const isRestoringScrollRef = useRef<boolean>(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('gameLogScrollTop');
    if (saved && containerRef.current) {
      isRestoringScrollRef.current = true;
      const savedScrollTop = parseInt(saved, 10) || 0;
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = savedScrollTop;
          isRestoringScrollRef.current = false;
        }
      }, 0);
    }
    prevMessageIdsRef.current = new Set(messages.map(msg => msg.id));
  }, []);

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        sessionStorage.setItem('gameLogScrollTop', String(containerRef.current.scrollTop));
      }
    };
  }, []);

  useEffect(() => {
    if (isRestoringScrollRef.current) return;
    const currentMessageIds = new Set(messages.map(msg => msg.id));
    const hasNewMessages = messages.some(msg => !prevMessageIdsRef.current.has(msg.id));
    
    if (hasNewMessages) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 0);
    }
    prevMessageIdsRef.current = currentMessageIds;
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || isRestoringScrollRef.current) return;
    sessionStorage.setItem('gameLogScrollTop', String(el.scrollTop));
  };

  const containerClassName = isBattle
    ? "h-full w-full overflow-y-scroll p-4 bg-transparent text-sm scrollbar-hide"
    : "mt-10 h-[250px] min-h-[200px] overflow-y-scroll border border-gray-400 bg-white p-5 text-sm";

  // 🌟 외부 폰트 없이 운영체제 내장 모던 폰트(애플 산돌고딕, 맑은 고딕 등)를 최우선으로 적용하는 스타일
  const modernSystemFontStyle = isBattle ? {
    fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif',
    lineHeight: '1.7',
    letterSpacing: '-0.02em',
    fontWeight: '500'
  } : {};

  return (
    <div
      id={isBattle ? "log-battle" : "log"}
      className={containerClassName}
      ref={containerRef}
      onScroll={handleScroll}
      style={isBattle ? { ...modernSystemFontStyle, msOverflowStyle: 'none', scrollbarWidth: 'none' } : {}}
    >
      {isBattle && (
        <style>{`
          #log-battle::-webkit-scrollbar { display: none; }
        `}</style>
      )}
      
      {messages.map((msg) => (
        <p
          key={msg.id}
          className={`animate-msgShow flex items-start ${
            isBattle ? getJrpgColorClass(msg.type) : getLogTypeClass(msg.type)
          }`}
          style={{ marginBottom: isBattle ? '6px' : '0' }}
        >
          {isBattle && (
             <span className="mr-2 opacity-50 text-indigo-400 select-none font-bold text-xs mt-[3px]">▶</span>
          )}
          <span className="flex-1 drop-shadow-sm">{msg.msg}</span>
        </p>
      ))}
      <div ref={logEndRef} />
    </div>
  );
};

export default GameLog;