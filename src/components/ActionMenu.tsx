import type { GameState } from '../game/types';

interface ActionMenuProps {
  gameState: GameState;
  isPlayerTurn: boolean;
  isProcessing: boolean;
	recoveryCharges: number; // <-- 1. prop 타입 추가
  onDungeonNext: () => void;
  onDungeonRecover: () => void;
  onAttack: () => void;
  onDefend: () => void;
  onRecover: () => void;
  onEscape: () => void;
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
  onDungeonNext,
  onDungeonRecover,
  onAttack,
  onDefend,
  onRecover,
  onEscape,
}: ActionMenuProps) => {
  const isBattle = gameState === 'battle';
  const canAct = !isProcessing && (isBattle ? isPlayerTurn : true);

  // style.css의 .menuPosition
  return (
    <div className="flex h-14 justify-center my-10">
      {/* 던전 메뉴 */}
      {gameState === 'dungeon' && (
        <div className="flex justify-center">
          <ActionButton onClick={onDungeonNext} disabled={isProcessing} hotkey="S">
            던전 탐험
          </ActionButton>
          <ActionButton onClick={onDungeonRecover} disabled={isProcessing} hotkey="R">
            휴식
          </ActionButton>
        </div>
      )}

      {/* 전투 메뉴 */}
      {gameState === 'battle' && (
        <div className="flex justify-center">
          <ActionButton onClick={onAttack} disabled={!canAct} hotkey="A">
            공격
          </ActionButton>
          <ActionButton onClick={onDefend} disabled={!canAct} hotkey="D">
            방어
          </ActionButton>
          <ActionButton onClick={onRecover} disabled={!canAct} hotkey="E">
            회복 ({recoveryCharges})
          </ActionButton>
          <ActionButton onClick={onEscape} disabled={!canAct} hotkey="Q">
            도망
          </ActionButton>
        </div>
      )}
    </div>
  );
};

export default ActionMenu;