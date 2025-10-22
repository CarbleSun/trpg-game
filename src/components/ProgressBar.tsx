interface ProgressBarProps {
  current: number;
  max: number;
  colorClass: string; // e.g., "bg-red-500"
}

const ProgressBar = ({ current, max, colorClass }: ProgressBarProps) => {
  const percent = max > 0 ? Math.floor((current * 100) / max) : 0;
  
  // style.css의 .status-exp .bar, .status-hp .bar
  return (
    <div className="relative w-full">
      <div className="h-2 w-full bg-gray-200"> {/* .bar */}
        <div
          className={`h-full transition-all duration-300 ${colorClass}`} // .currentBar
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      {/* .expText */}
      <div className="mt-1 text-center text-xs text-gray-700"> 
        {current} / {max} ({percent}%)
      </div>
    </div>
  );
};

export default ProgressBar;