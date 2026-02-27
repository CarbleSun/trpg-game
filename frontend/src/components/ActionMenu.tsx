import type { GameState, SkillKey, Skill } from "../game/types";

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  isPlayerTurn: boolean;
  isProcessing: boolean;
  recoveryCharges: number;
  learnedSkills?: SkillKey[];
  skillCooldowns?: Partial<Record<SkillKey, number>>;
  skills?: Skill[];
  showBattleChoice?: boolean;
  isScarecrowBattle?: boolean;
  isBattleSkillOpen: boolean;
  onToggleBattleSkills: () => void;
  onDungeonNext: () => void;
  onDungeonRecover: () => void;
  onAttack: () => void;
  onDefend: () => void;
  onRecover: () => void;
  onEscape: () => void;
  onEnterShop: () => void;
  onOpenWeaponEnhance: () => void;
  onOpenScarecrow: () => void;
  onOpenSkills: () => void;
  onUseSkill: (key: SkillKey) => void;
  onOpenDungeonSelect: () => void;
  onOpenBossSelect: () => void;
  onContinueBattle: () => void;
  onExitDungeon: () => void;
  onExitScarecrowBattle?: () => void;
}

const ActionButton = ({
  onClick,
  disabled,
  children,
  hotkey,
  className = "",
  variant = "default",
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  hotkey: string;
  className?: string;
  variant?: "default" | "primary" | "danger" | "blue";
}) => {
  const baseStyle = "relative flex flex-col items-center justify-center rounded-xl border font-semibold shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:grayscale p-1 leading-tight aspect-square";
  
  let colorStyle = "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md";
  if (variant === "primary") {
    colorStyle = "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:shadow-md";
  } else if (variant === "danger") {
    colorStyle = "border-red-500 bg-white text-red-600 hover:bg-red-50 hover:border-red-600";
  } else if (variant === "blue") {
    colorStyle = "border-blue-500 bg-white text-blue-800 hover:bg-blue-100 hover:border-blue-300";
  }

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${colorStyle} ${className}`}>
      <span className="z-10 flex flex-col items-center gap-1 text-center">{children}</span>
      {hotkey && (
        <span className={`absolute top-1 right-1.5 opacity-70 font-sans ${variant === 'primary' ? 'text-indigo-200' : 'text-gray-400'} text-[10px]`}>
          {hotkey}
        </span>
      )}
    </button>
  );
};

const ActionMenu = ({
  isOpen,
  onClose,
  gameState,
  isPlayerTurn,
  isProcessing,
  recoveryCharges,
  onDungeonRecover,
  onAttack,
  onDefend,
  onRecover,
  onEscape,
  onEnterShop,
  onOpenSkills,
  onOpenWeaponEnhance,
  onOpenScarecrow,
  learnedSkills = [],
  skillCooldowns = {},
  skills = [],
  onUseSkill,
  onOpenDungeonSelect,
  onOpenBossSelect,
  showBattleChoice = false,
  onContinueBattle,
  onExitDungeon,
  isScarecrowBattle = false,
  onExitScarecrowBattle,
  isBattleSkillOpen,
  onToggleBattleSkills,
}: ActionMenuProps) => {
  const isBattle = gameState === "battle";
  const canAct = !isProcessing && (isBattle ? isPlayerTurn : true);

  if (isBattle) {
    return (
      // 🌟 font-mono 제거, font-semibold로 세련된 굵기 적용, 자간을 모던하게(tracking-wide) 조절
      <div className="h-full w-full flex flex-col justify-center px-3 pointer-events-auto font-semibold tracking-wide text-slate-200 relative">
        {showBattleChoice ? (
          <div className="flex flex-col gap-5 justify-center text-base md:text-lg">
            <button onClick={onContinueBattle} disabled={isProcessing} className="text-left hover:translate-x-2 transition-transform group hover:text-white">
              <span className="opacity-0 group-hover:opacity-100 mr-2 text-indigo-400 text-sm">▶</span>계속 싸우기
            </button>
            <button onClick={onExitDungeon} disabled={isProcessing} className="text-left hover:translate-x-2 transition-transform group hover:text-white">
              <span className="opacity-0 group-hover:opacity-100 mr-2 text-indigo-400 text-sm">▶</span>던전 나가기
            </button>
          </div>
        ) : (
          <div className="flex flex-col w-full relative">
            
            {isBattleSkillOpen && (
              <div className="absolute top-1/2 -translate-y-1/2 left-full ml-4 max-h-[110%] w-52 bg-slate-800/95 backdrop-blur-md border border-slate-600/80 rounded-lg shadow-2xl p-3 z-60 overflow-y-auto custom-scrollbar">
                <div className="text-[11px] text-indigo-300 mb-2 border-b border-slate-600/50 pb-1.5 uppercase tracking-widest font-bold">Magic & Skill</div>
                {learnedSkills.length === 0 ? (
                  <div className="text-sm text-slate-500 font-medium">없음</div>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    {learnedSkills.map((key) => {
                      const skill = skills.find((s) => s.key === key);
                      const cd = (skillCooldowns as Record<SkillKey, number | undefined>)[key] || 0;
                      const disabled = !canAct || cd > 0;
                      if (!skill) return null;
                      return (
                        <button
                          key={key}
                          onClick={() => { onUseSkill(key); onToggleBattleSkills(); }}
                          disabled={disabled}
                          className="text-left text-[15px] hover:translate-x-1 transition-transform group hover:text-white disabled:opacity-50 flex justify-between items-center font-medium"
                        >
                          <span><span className="opacity-0 group-hover:opacity-100 mr-1 text-indigo-400 text-xs">▶</span>{skill.name}</span>
                          {cd > 0 && <span className="text-rose-400 text-xs bg-rose-900/30 px-1.5 py-0.5 rounded font-bold">{cd}T</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button onClick={onToggleBattleSkills} className="mt-5 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors">
                  <span className="text-indigo-400">◀</span> 뒤로가기
                </button>
              </div>
            )}

            <div className="flex flex-col gap-4 text-[17px] md:text-[19px]">
              {/* 영어 부제목을 더 작고 얇게 만들어 세련미를 더함 */}
              <button onClick={onAttack} disabled={!canAct} className="text-left hover:translate-x-2 transition-transform group hover:text-white disabled:opacity-50 drop-shadow-sm flex items-center">
                <span className="opacity-0 group-hover:opacity-100 mr-2 text-indigo-400 text-sm">▶</span>공격 <span className="text-[11px] opacity-40 ml-2 font-normal tracking-wider text-slate-300 uppercase mt-0.5">Attack</span>
              </button>
              <button onClick={onToggleBattleSkills} disabled={!canAct} className="text-left hover:translate-x-2 transition-transform group hover:text-white disabled:opacity-50 drop-shadow-sm flex items-center">
                <span className="opacity-0 group-hover:opacity-100 mr-2 text-indigo-400 text-sm">▶</span>스킬 <span className="text-[11px] opacity-40 ml-2 font-normal tracking-wider text-slate-300 uppercase mt-0.5">Skill</span>
              </button>
              <button onClick={onDefend} disabled={!canAct} className="text-left hover:translate-x-2 transition-transform group hover:text-white disabled:opacity-50 drop-shadow-sm flex items-center">
                <span className="opacity-0 group-hover:opacity-100 mr-2 text-indigo-400 text-sm">▶</span>방어 <span className="text-[11px] opacity-40 ml-2 font-normal tracking-wider text-slate-300 uppercase mt-0.5">Defend</span>
              </button>
              <button onClick={onRecover} disabled={!canAct} className="text-left hover:translate-x-2 transition-transform group hover:text-white disabled:opacity-50 drop-shadow-sm flex items-center">
                <span className="opacity-0 group-hover:opacity-100 mr-2 text-indigo-400 text-sm">▶</span>아이템 <span className="text-[11px] opacity-40 ml-2 mr-2 font-normal tracking-wider text-slate-300 uppercase mt-0.5">Item</span> 
                <span className="text-[10px] text-emerald-300 bg-emerald-900/40 px-1.5 py-0.5 rounded-sm font-bold tracking-normal border border-emerald-700/50">x{recoveryCharges}</span>
              </button>
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-700/60 w-full text-[17px] md:text-[19px]">
              {isScarecrowBattle && onExitScarecrowBattle ? (
                <button onClick={onExitScarecrowBattle} disabled={isProcessing} className="text-left hover:translate-x-2 transition-transform group text-slate-400 hover:text-slate-200 flex items-center">
                  <span className="opacity-0 group-hover:opacity-100 mr-2 text-indigo-400 text-sm">▶</span>도망 <span className="text-[11px] opacity-40 ml-2 font-normal tracking-wider text-slate-300 uppercase mt-0.5">Run</span>
                </button>
              ) : (
                <button onClick={onEscape} disabled={!canAct} className="text-left hover:translate-x-2 transition-transform group text-slate-400 hover:text-rose-400 flex items-center">
                  <span className="opacity-0 group-hover:opacity-100 mr-2 text-rose-400 text-sm">▶</span>도망 <span className="text-[11px] opacity-40 ml-2 font-normal tracking-wider text-slate-300 uppercase mt-0.5">Run</span>
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    );
  }

  // [비전투 모드] 홈 화면 등
  return (
    <div 
      className={`fixed top-1/2 right-6 -translate-y-1/2 z-50 flex flex-col items-end gap-2 transition-all duration-300 ease-in-out ${
        isOpen 
          ? "opacity-100 translate-x-0 pointer-events-auto" 
          : "opacity-0 translate-x-8 pointer-events-none"
      }`}
    >
      <button 
        onClick={onClose} 
        className="mb-1 mr-1 bg-gray-800 text-white text-[10px] font-bold rounded-full px-3 py-1.5 shadow hover:bg-gray-700 transition-colors opacity-80 hover:opacity-100"
      >
        닫기 (ESC)
      </button>

      <div className="bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-2xl shadow-2xl flex flex-col gap-2">
        {gameState === "dungeon" && (
          <>
            <ActionButton onClick={onOpenDungeonSelect} disabled={isProcessing} hotkey="S" variant="blue" className="w-16 h-16 text-xs">
              ⚔️<br/>던전
            </ActionButton>
            <ActionButton onClick={onOpenBossSelect} disabled={isProcessing} hotkey="B" className="w-16 h-16 text-xs border-red-200 text-red-800 bg-red-50 hover:bg-red-100">
              👹<br/>보스
            </ActionButton>
            <div className="h-px bg-gray-300 w-full opacity-50 my-0.5"></div>
            <ActionButton onClick={onDungeonRecover} disabled={isProcessing} hotkey="R" className="w-16 h-16 text-xs">
              💤<br/>휴식
            </ActionButton>
            <ActionButton onClick={onEnterShop} disabled={isProcessing} hotkey="H" className="w-16 h-16 text-xs">
              💰<br/>상점
            </ActionButton>
            <ActionButton onClick={onOpenWeaponEnhance} disabled={isProcessing} hotkey="W" className="w-16 h-16 text-xs">
              ⚒️<br/>강화
            </ActionButton>
            <ActionButton onClick={onOpenSkills} disabled={isProcessing} hotkey="K" className="w-16 h-16 text-xs">
              📘<br/>스킬
            </ActionButton>
            <ActionButton onClick={onOpenScarecrow} disabled={isProcessing} hotkey="T" className="w-16 h-16 text-xs">
              🎯<br/>훈련
            </ActionButton>
          </>
        )}
      </div>
    </div>
  );
};

export default ActionMenu;