import { useEffect } from 'react';
import Header from './components/Header';
import SetupScreen from './components/SetupScreen';
import StatusDisplay from './components/StatusDisplay';
import ActionMenu from './components/ActionMenu';
import Scene from './components/Scene';
import GameLog from './components/GameLog';
import ShopScreen from './components/ShopScreen';
import SkillsScreen from './components/SkillsScreen';
import DungeonSelectionScreen from './components/DungeonSelectionScreen';
import { useGameEngine } from './hooks/useGameEngine';

function App() {
  const {
    player,
    monster,
    logMessages,
    gameState,
    isPlayerTurn,
    isProcessing,
		recoveryCharges, // 회복 횟수
		shopLists, // 상점 목록
    skills,
    isSkillsOpen,
    showBattleChoice,
    dungeons,
    actions,
  } = useGameEngine();

  // 단축키 이벤트 리스너 (rpg.js의 keydown 리스너)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      actions.handleKeyDown(event.key.toLowerCase());
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actions]); // actions는 메모이제이션되어 있다고 가정 (useCallback 사용 시)
  // *참고: useGameEngine에서 actions 객체를 useCallback으로 감싸면 더 최적화할 수 있습니다.

  // 1. 설정 화면 (캐릭터 생성)
  if (gameState === 'setup' || !player) {
    return <SetupScreen onGameStart={actions.gameStart} />;
  }

  // 2. 던전 선택 화면
  if (gameState === 'dungeonSelect') {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-5 pb-10 md:px-8">
          <StatusDisplay player={player} />
          <GameLog messages={logMessages} />
        </main>
        <DungeonSelectionScreen
          player={player}
          dungeons={dungeons}
          onSelectDungeon={actions.handleSelectDungeon}
          onExit={actions.handleCloseDungeonSelect}
        />
      </div>
    );
  }

  // 3. 메인 게임 화면
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      
      {/* style.css의 .wrap */}
      <main className="mx-auto w-full max-w-5xl px-5 pb-10 md:px-8">
        {/* 스탯 표시 */}
        <StatusDisplay player={player} />

        {/* 학습은 별도 스킬 모달에서 진행 */}
        
        {/* 액션 메뉴 */}
        <ActionMenu
          gameState={gameState}
          isPlayerTurn={isPlayerTurn}
          isProcessing={isProcessing}
					recoveryCharges={recoveryCharges} // <-- 2. ActionMenu로 전달
          learnedSkills={player.skills}
          skillCooldowns={player.skillCooldowns}
          skills={skills}
          onDungeonNext={actions.handleNextDungeon}
          onDungeonRecover={actions.handleDungeonRecovery}
          onAttack={actions.handleAttack}
          onDefend={actions.handleDefend}
          onRecover={actions.handleRecovery}
          onEscape={actions.handleEscape}
				onEnterShop={actions.handleEnterShop}
          onOpenSkills={actions.handleOpenSkills}
          onUseSkill={actions.handleUseSkill}
          onOpenDungeonSelect={actions.handleOpenDungeonSelect}
          showBattleChoice={showBattleChoice}
          onContinueBattle={actions.handleContinueBattle}
          onExitDungeon={actions.handleExitDungeon}
        />
        
        {/* 씬 (VS) */}
        <Scene
          player={player}
          monster={monster}
          isPlayerTurn={isPlayerTurn && gameState === 'battle'}
        />
        
        {/* 게임 로그 */}
        <GameLog messages={logMessages} />
      </main>

			{/* 상점 모달 조건부 렌더링 (화면 위에 겹침) */}
      {gameState === 'shop' && (
        <ShopScreen
          player={player}
          shopLists={shopLists}
          onExitShop={actions.handleExitShop}
          onBuyItem={actions.handleBuyItem}
        />
      )}

      {/* 스킬 모달 */}
      {isSkillsOpen && (
        <SkillsScreen
          player={player}
          skills={skills}
          onClose={actions.handleCloseSkills}
          onLearn={actions.learnSkill}
        />
      )}

    </div>
  );
}

export default App;