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
  variant?: "default" | "primary" | "danger";
}) => {
  const baseStyle = "relative flex flex-col items-center justify-center rounded-xl border font-bold shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:grayscale p-1 leading-tight aspect-square";
  
  let colorStyle = "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md";
  if (variant === "primary") {
    colorStyle = "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:shadow-md";
  } else if (variant === "danger") {
    colorStyle = "border-red-500 bg-white text-red-600 hover:bg-red-50 hover:border-red-600";
  }

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${colorStyle} ${className}`}>
      <span className="z-10 flex flex-col items-center gap-1 text-center">{children}</span>
      {hotkey && (
        <span className={`absolute top-1 right-1.5 opacity-70 font-mono ${variant === 'primary' ? 'text-indigo-200' : 'text-gray-400'} text-[10px]`}>
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

  // ============================================================
  // [전투 모드] : 하단 가로형, 항상 보임
  // ============================================================
  if (isBattle) {
    return (
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center gap-2 pointer-events-auto animate-slide-up">
        {showBattleChoice ? (
          <>
            <ActionButton onClick={onContinueBattle} disabled={isProcessing} hotkey="C" variant="primary" className="w-16 h-16 text-xs">
              계속<br/>싸우기
            </ActionButton>
            <ActionButton onClick={onExitDungeon} disabled={isProcessing} hotkey="X" variant="danger" className="w-16 h-16 text-xs">
              던전<br/>나가기
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton onClick={onAttack} disabled={!canAct} hotkey="A" variant="primary" className="w-16 h-16 text-xs">
              ⚔️<br/>공격
            </ActionButton>
            
            <div className="relative">
              {isBattleSkillOpen && (
                <div className="absolute bottom-full left-0 mb-3 w-48 max-h-[300px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl p-2 custom-scrollbar z-60 animate-fade-in-up">
                    <div className="text-[11px] font-bold text-gray-400 mb-2 px-1 border-b pb-1">SKILL LIST</div>
                    <div className="flex flex-col gap-1">
                    {learnedSkills.length === 0 ? (
                      <div className="text-center text-[10px] text-gray-400 py-2">없음</div>
                    ) : (
                      learnedSkills.map((key, index) => {
                        const skill = skills.find((s) => s.key === key);
                        const cd = (skillCooldowns as Record<SkillKey, number | undefined>)[key] || 0;
                        const disabled = !canAct || cd > 0;
                        const hotkey = index < 9 ? `${index + 1}` : "";
                        if (!skill) return null;
                        return (
                          <button
                            key={key}
                            onClick={() => { onUseSkill(key); onToggleBattleSkills(); }}
                            disabled={disabled}
                            className="w-full text-left px-2 py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-100 rounded-lg text-xs font-bold transition-colors flex justify-between items-center group"
                          >
                            <span className="group-hover:text-indigo-700 transition-colors">{skill.name}</span>
                            {cd > 0 ? (
                              <span className="text-red-500 text-[9px]">{cd}턴</span>
                            ) : (
                              hotkey && <span className="text-gray-400 text-[8px] bg-white border px-1 rounded">[{hotkey}]</span>
                            )}
                          </button>
                        );
                      })
                    )}
                    </div>
                </div>
              )}
              <ActionButton
                onClick={onToggleBattleSkills}
                disabled={!canAct}
                hotkey="K"
                className={`w-16 h-16 text-xs ${isBattleSkillOpen ? "bg-indigo-100 border-indigo-300 text-indigo-800" : ""}`}
              >
                ⚡<br/>스킬
              </ActionButton>
            </div>

            <ActionButton onClick={onDefend} disabled={!canAct} hotkey="D" className="w-16 h-16 text-xs">
              🛡️<br/>방어
            </ActionButton>
            <ActionButton onClick={onRecover} disabled={!canAct} hotkey="E" className="w-16 h-16 text-xs">
              ❤️<br/>회복
              <span className="text-[9px] font-normal text-gray-500 mt-0.5">({recoveryCharges})</span>
            </ActionButton>

            <div className="w-px bg-gray-300 mx-1 h-10 self-center opacity-50"></div>

            {isScarecrowBattle && onExitScarecrowBattle ? (
              <ActionButton onClick={onExitScarecrowBattle} disabled={isProcessing} hotkey="Q" className="w-16 h-16 text-xs text-gray-500">
                나가기
              </ActionButton>
            ) : (
              <ActionButton onClick={onEscape} disabled={!canAct} hotkey="Q" className="w-16 h-16 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50">
                🏳️<br/>도망
              </ActionButton>
            )}
          </>
        )}
      </div>
    );
  }

  // ============================================================
  // [비전투 모드 (홈/던전)] : 우측 세로형, ESC 토글
  // ============================================================
  return (
    <div 
      className={`fixed top-1/2 right-6 -translate-y-1/2 z-50 flex flex-col items-end gap-2 transition-all duration-300 ease-in-out ${
        isOpen 
          ? "opacity-100 translate-x-0 pointer-events-auto" 
          : "opacity-0 translate-x-8 pointer-events-none"
      }`}
    >
      
      {/* 닫기 버튼 */}
      <button 
        onClick={onClose} 
        className="mb-1 mr-1 bg-gray-800 text-white text-[10px] font-bold rounded-full px-3 py-1.5 shadow hover:bg-gray-700 transition-colors opacity-80 hover:opacity-100"
      >
        닫기 (ESC)
      </button>

      {/* 메뉴 컨테이너 */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-2xl shadow-2xl flex flex-col gap-2">
        {gameState === "dungeon" && (
          <>
            <ActionButton onClick={onOpenDungeonSelect} disabled={isProcessing} hotkey="S" variant="primary" className="w-16 h-16 text-xs">
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