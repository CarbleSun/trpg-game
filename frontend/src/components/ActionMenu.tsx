import type { GameState, SkillKey, Skill } from "../game/types";

interface ActionMenuProps {
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
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  hotkey: string;
  className?: string;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative m-1 rounded border border-gray-700 px-4 py-2 font-stat text-sm text-gray-800 outline-none
                 transition-colors duration-200 hover:border-blue-700 hover:bg-blue-700 hover:text-white
                 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
      {hotkey && (
        <span className="absolute -top-2 -right-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs font-bold text-white opacity-70">
          {hotkey}
        </span>
      )}
    </button>
  );
};

const ActionMenu = ({
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
  const nameOf = (key: SkillKey) =>
    skills.find((s) => s.key === key)?.name || key;

  return (
    <div className="relative flex h-14 justify-center my-10">
      {/* 던전 메뉴 */}
      {gameState === "dungeon" && (
        <div className="flex justify-center">
          <ActionButton
            onClick={onOpenDungeonSelect}
            disabled={isProcessing}
            hotkey="S"
          >
            던전 탐험
          </ActionButton>
          <ActionButton
            onClick={onOpenBossSelect}
            disabled={isProcessing}
            hotkey="B"
          >
            보스 던전
          </ActionButton>
          <ActionButton
            onClick={onDungeonRecover}
            disabled={isProcessing}
            hotkey="R"
          >
            휴식
          </ActionButton>
          <ActionButton
            onClick={onEnterShop}
            disabled={isProcessing}
            hotkey="H"
          >
            상점
          </ActionButton>
          <ActionButton
            onClick={onOpenSkills}
            disabled={isProcessing}
            hotkey="K"
          >
            스킬
          </ActionButton>
          <ActionButton
            onClick={onOpenWeaponEnhance}
            disabled={isProcessing}
            hotkey="W"
          >
            강화소
          </ActionButton>
          <ActionButton
            onClick={onOpenScarecrow}
            disabled={isProcessing}
            hotkey="T"
          >
            허수아비
          </ActionButton>
        </div>
      )}

      {/* 전투 메뉴 */}
      {gameState === "battle" && (
        <div className="flex flex-wrap justify-center items-end">
          {showBattleChoice ? (
            <>
              <ActionButton
                onClick={onContinueBattle}
                disabled={isProcessing}
                hotkey="C"
              >
                계속 싸우기
              </ActionButton>
              <ActionButton
                onClick={onExitDungeon}
                disabled={isProcessing}
                hotkey="X"
              >
                던전 나가기
              </ActionButton>
            </>
          ) : (
            <>
              {/* 스킬 목록 팝업 (스킬 메뉴가 열렸을 때만 표시) */}
              {isBattleSkillOpen && (
                <div className="absolute bottom-full mb-4 flex flex-col gap-1 rounded-lg border border-gray-400 bg-white p-3 shadow-lg z-10 min-w-[200px]">
                  <div className="mb-2 text-center font-bold text-gray-700 border-b pb-1">
                    스킬 목록
                  </div>
                  {learnedSkills.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-2">
                      배운 스킬이 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {learnedSkills.map((key, index) => {
                        const cd =
                          (
                            skillCooldowns as Record<
                              SkillKey,
                              number | undefined
                            >
                          )[key] || 0;
                        const disabled = !canAct || cd > 0;
                        // 단축키 1~9
                        const hotkey = index < 9 ? `${index + 1}` : "";

                        return (
                          <button
                            key={key}
                            onClick={() => {
                              onUseSkill(key);
                              onToggleBattleSkills();
                            }}
                            disabled={disabled}
                            className="relative flex items-center justify-between rounded border border-gray-300 px-3 py-2 text-left text-sm hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-white"
                          >
                            <span
                              className={
                                disabled ? "text-gray-400" : "text-gray-800"
                              }
                            >
                              {nameOf(key)}
                            </span>
                            {cd > 0 ? (
                              <span className="text-xs text-red-500 font-bold">
                                ({cd})
                              </span>
                            ) : (
                              hotkey && (
                                <span className="ml-2 rounded bg-gray-200 px-1 text-[10px] font-bold text-gray-600">
                                  {hotkey}
                                </span>
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <ActionButton onClick={onAttack} disabled={!canAct} hotkey="A">
                공격
              </ActionButton>

              {/* 스킬 버튼 (개별 스킬 버튼 대신 토글 버튼 사용) */}
              <ActionButton
                onClick={onToggleBattleSkills}
                disabled={!canAct}
                hotkey="K"
                className={
                  isBattleSkillOpen
                    ? "border-blue-700 bg-blue-100 text-blue-900"
                    : ""
                }
              >
                스킬
              </ActionButton>

              <ActionButton onClick={onDefend} disabled={!canAct} hotkey="D">
                방어
              </ActionButton>
              <ActionButton onClick={onRecover} disabled={!canAct} hotkey="E">
                회복 ({recoveryCharges})
              </ActionButton>

              {isScarecrowBattle && onExitScarecrowBattle ? (
                <ActionButton
                  onClick={onExitScarecrowBattle}
                  disabled={isProcessing}
                  hotkey="Q"
                >
                  나가기
                </ActionButton>
              ) : (
                <ActionButton onClick={onEscape} disabled={!canAct} hotkey="Q">
                  도망
                </ActionButton>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
