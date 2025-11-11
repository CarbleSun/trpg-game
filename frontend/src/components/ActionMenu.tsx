import type { GameState, SkillKey, Skill } from '../game/types';

interface ActionMenuProps {
  gameState: GameState;
  isPlayerTurn: boolean;
  isProcessing: boolean;
	recoveryCharges: number; // <-- 1. prop 타입 추가
  learnedSkills?: SkillKey[];
  skillCooldowns?: Partial<Record<SkillKey, number>>;
  skills?: Skill[];
  showBattleChoice?: boolean;
  isScarecrowBattle?: boolean;
  onDungeonNext: () => void;
  onDungeonRecover: () => void;
  onAttack: () => void;
  onDefend: () => void;
  onRecover: () => void;
  onEscape: () => void;
  onEnterShop: () => void;
  onOpenPetEnhance: () => void;
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

const ActionButton = ({ onClick, disabled, children, hotkey }: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  hotkey: string;
}) => {
  // style.css의 .menu button
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative m-1 rounded border border-gray-700 px-4 py-2 font-stat text-sm text-gray-800 outline-none
                 transition-colors duration-200 hover:border-blue-700 hover:bg-blue-700 hover:text-white
                 disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
      <span className="absolute -top-2 -right-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs font-bold text-white opacity-70">
        {hotkey}
      </span>
    </button>
  );
};

const ActionMenu = ({
  gameState,
  isPlayerTurn,
  isProcessing,
	recoveryCharges, // <-- 2. prop 받기
  onDungeonRecover,
  onAttack,
  onDefend,
  onRecover,
  onEscape,
  onEnterShop,
  onOpenSkills,
  onOpenPetEnhance,
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
}: ActionMenuProps) => {
  const isBattle = gameState === 'battle';
  const canAct = !isProcessing && (isBattle ? isPlayerTurn : true);
  const nameOf = (key: SkillKey) => skills.find(s => s.key === key)?.name || key;

  // style.css의 .menuPosition
  return (
    <div className="flex h-14 justify-center my-10">
      {/* 던전 메뉴 */}
      {gameState === 'dungeon' && (
        <div className="flex justify-center">
          <ActionButton onClick={onOpenDungeonSelect} disabled={isProcessing} hotkey="S">
            던전 탐험
          </ActionButton>
          <ActionButton onClick={onOpenBossSelect} disabled={isProcessing} hotkey="B">
            보스 던전
          </ActionButton>
          <ActionButton onClick={onDungeonRecover} disabled={isProcessing} hotkey="R">
            휴식
          </ActionButton>
					<ActionButton onClick={onEnterShop} disabled={isProcessing} hotkey="H">
            상점
          </ActionButton>
          <ActionButton onClick={onOpenSkills} disabled={isProcessing} hotkey="K">
            스킬
          </ActionButton>
          <ActionButton onClick={onOpenPetEnhance} disabled={isProcessing} hotkey="P">
            펫 강화소
          </ActionButton>
          <ActionButton onClick={onOpenWeaponEnhance} disabled={isProcessing} hotkey="W">
            무기 강화소
          </ActionButton>
          <ActionButton onClick={onOpenScarecrow} disabled={isProcessing} hotkey="T">
            허수아비
          </ActionButton>
        </div>
      )}

      {/* 전투 메뉴 */}
      {gameState === 'battle' && (
        <div className="flex flex-wrap justify-center">
          {showBattleChoice ? (
            // 전투 승리 후 선택 메뉴
            <>
              <ActionButton onClick={onContinueBattle} disabled={isProcessing} hotkey="C">
                계속 싸우기
              </ActionButton>
              <ActionButton onClick={onExitDungeon} disabled={isProcessing} hotkey="X">
                던전 나가기
              </ActionButton>
            </>
          ) : (
            // 일반 전투 메뉴
            <>
              <ActionButton onClick={onAttack} disabled={!canAct} hotkey="A">
                공격
              </ActionButton>
              <ActionButton onClick={onDefend} disabled={!canAct} hotkey="D">
                방어
              </ActionButton>
              <ActionButton onClick={onRecover} disabled={!canAct} hotkey="E">
                회복 ({recoveryCharges})
              </ActionButton>
              {isScarecrowBattle && onExitScarecrowBattle ? (
                <ActionButton onClick={onExitScarecrowBattle} disabled={isProcessing} hotkey="Q">
                  나가기
                </ActionButton>
              ) : (
                <ActionButton onClick={onEscape} disabled={!canAct} hotkey="Q">
                  도망
                </ActionButton>
              )}
              {/* 배운 스킬 버튼들 */}
              {learnedSkills.map((key) => {
                const cd = (skillCooldowns as Record<SkillKey, number | undefined>)[key] || 0;
                const disabled = !canAct || cd > 0;
                return (
                  <ActionButton
                    key={key}
                    onClick={() => onUseSkill(key)}
                    disabled={disabled}
                    hotkey={cd > 0 ? `${cd}` : ''}
                  >
                    {nameOf(key)}
                  </ActionButton>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;