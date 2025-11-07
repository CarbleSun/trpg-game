import { useEffect, useRef } from 'react';
import type { LogMessage, LogType } from '../game/types';

interface GameLogProps {
  messages: LogMessage[];
}

// style.css의 .msg-*** 클래스들을 Tailwind 클래스로 매핑
const getLogTypeClass = (type: LogType): string => {
  switch (type) {
    case 'atk': return 'text-red-700';
    case 'cri': return 'text-red-600 font-bold';
    case 'vic': return 'text-blue-800 font-bold';
    case 'def': return 'text-gray-900 font-bold';
    case 'lvup': return 'bg-yellow-100 p-1 rounded';
    case 'fail': return 'text-gray-500';
    case 'appear': return 'font-bold text-lg underline';
    case 'gainExp': return 'text-yellow-600';
    case 'gainMoney': return 'text-green-600';
    case 'tryToAtk': return 'text-red-400';
    default: return 'text-gray-800';
  }
};

const GameLog = ({ messages }: GameLogProps) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageIdsRef = useRef<Set<number>>(new Set());
  const isRestoringScrollRef = useRef<boolean>(false);

  // 마운트 시 이전 스크롤 위치 복원
  useEffect(() => {
    const saved = sessionStorage.getItem('gameLogScrollTop');
    if (saved && containerRef.current) {
      isRestoringScrollRef.current = true;
      const savedScrollTop = parseInt(saved, 10) || 0;
      // DOM 업데이트 후 스크롤 위치 복원
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = savedScrollTop;
          isRestoringScrollRef.current = false;
        }
      }, 0);
    }
    // 현재 메시지 ID들을 저장
    prevMessageIdsRef.current = new Set(messages.map(msg => msg.id));
  }, []);

  // 언마운트 전 스크롤 위치 저장 (화면 전환 시)
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        sessionStorage.setItem('gameLogScrollTop', String(containerRef.current.scrollTop));
      }
    };
  }, []);

  // 새 메시지가 추가되면 항상 맨 밑으로 스크롤 (스크롤 복원 중이 아닐 때만)
  useEffect(() => {
    if (isRestoringScrollRef.current) return;
    
    const currentMessageIds = new Set(messages.map(msg => msg.id));
    const hasNewMessages = messages.some(msg => !prevMessageIdsRef.current.has(msg.id));
    
    if (hasNewMessages) {
      // 새 메시지가 있으면 항상 맨 밑으로
      setTimeout(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
    
    prevMessageIdsRef.current = currentMessageIds;
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    // 스크롤 복원 중이 아닐 때만 저장
    if (!isRestoringScrollRef.current) {
      sessionStorage.setItem('gameLogScrollTop', String(el.scrollTop));
    }
  };

  // style.css의 #log
  return (
    <div
      id="log"
      className="mt-10 h-[300px] min-h-[200px] overflow-y-scroll border border-gray-400
                 bg-white p-5 font-log text-sm"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {messages.map((msg) => (
        <p
          key={msg.id}
          className={`leading-relaxed animate-msgShow ${getLogTypeClass(msg.type)}`}
        >
          {msg.msg}
        </p>
      ))}
      {/* 스크롤 타겟 */}
      <div ref={logEndRef} />
    </div>
  );
};

export default GameLog;