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

  // 새 로그가 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // style.css의 #log
  return (
    <div
      id="log"
      className="mt-10 h-[300px] min-h-[200px] overflow-y-scroll border border-gray-400
                 bg-white p-5 font-log text-sm"
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