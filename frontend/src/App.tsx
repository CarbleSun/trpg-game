import { useEffect, useState } from "react";
import Header from "./components/Header";
import SetupScreen from "./components/SetupScreen";
import StatusDisplay from "./components/StatusDisplay";
import ActionMenu from "./components/ActionMenu";
import Scene from "./components/Scene";
import GameLog from "./components/GameLog";
import ShopScreen from "./components/ShopScreen";
import EquipmentEnhanceScreen from "./components/WeaponEnhanceScreen";
import SkillsScreen from "./components/SkillsScreen";
import DungeonSelectionScreen from "./components/DungeonSelectionScreen";
import BossSelectionScreen from "./components/BossSelectionScreen";
import BossRewardModal from "./components/BossRewardModal";
import NormalDropModal from "./components/NormalDropModal";
import DeveloperPanel from "./components/DeveloperPanel";
import ScarecrowScreen from "./components/ScarecrowScreen";
import { useGameEngine } from "./hooks/useGameEngine";

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
    bossDungeons,
    bossCooldowns,
    bossReward,
    isDeveloperMode,
    isScarecrowBattle,
    isBattleSkillOpen,
    actions,
  } = useGameEngine();

	// 액션 메뉴 토글 추가
	const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

	// 상태창 스킬 모달 토글 (이게 true면 액션메뉴 숨김)
	const [isStatusSkillModalOpen, setIsStatusSkillModalOpen] = useState(false);

	// 상태창 스킬 모달 핸들러
  const handleToggleStatusSkillModal = () => {
    setIsStatusSkillModalOpen(prev => !prev);
  };

  // 단축키 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 키를 누르고 있을 때 이벤트가 반복 실행되는 것을 방지
      if (event.repeat) return;

      // ESC 키 입력 시 액션 메뉴 토글
      if (event.key === "Escape") {
        // 전투 중 스킬 창이 열려있다면 스킬 창만 닫기 (우선순위 처리)
        if (isBattleSkillOpen) {
           actions.handleToggleBattleSkills();
           return;
        }
        // 그 외의 경우 액션 메뉴 토글
        setIsActionMenuOpen((prev) => !prev); 
        // useState가 정상적으로 import 되었다면 prev는 boolean으로 자동 추론됩니다.
        return;
      }

      // 메뉴가 열려있을 때만 단축키 작동 (필요에 따라 조건 추가 가능)
      actions.handleKeyDown(event.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions, isBattleSkillOpen]);

  // 개발자 모드 콘솔 명령어 등록
  useEffect(() => {
    // 콘솔에서 직접 호출 가능한 함수
    // 사용법: enableDevMode() 또는 window.enableDevMode()
    // @ts-ignore
    window.enableDevMode = () => {
      actions.enableDeveloperMode();
    };

    // 개발자 코드 입력 감지
    let devCodeBuffer = "";
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+D로 개발자 모드 활성화
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        actions.enableDeveloperMode();
        return;
      }

      // "mamat1234" 입력 시 개발자 모드 활성화
      if (e.key.length === 1) {
        devCodeBuffer += e.key.toLowerCase();
        if (devCodeBuffer.length > 15) {
          devCodeBuffer = devCodeBuffer.slice(-15);
        }
        if (devCodeBuffer.includes("mamat1234")) {
          actions.enableDeveloperMode();
          devCodeBuffer = "";
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      // @ts-ignore
      delete window.enableDevMode;
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [actions]);

  // 1. 설정 화면 (캐릭터 생성)
  if (gameState === "setup" || !player) {
    return (
      <>
        <SetupScreen onGameStart={actions.gameStart} />
        {/* 개발자 모드 패널 (게임 시작 전에도 표시) */}
        {isDeveloperMode && (
          <DeveloperPanel
            onSave={actions.saveGameState}
            onLoad={actions.loadGameState}
            onDelete={actions.deleteGameSlot}
            onLoadFromFile={actions.loadGameStateFromFile}
            onLoadFromText={actions.loadGameStateFromText}
            getSaveSlotInfo={actions.getSaveSlotInfo}
            onResetAllBossCooldowns={actions.resetAllBossCooldowns}
          />
        )}
      </>
    );
  }

  // 2. 던전 선택 화면
  if (gameState === "dungeonSelect") {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-5 pb-10 md:px-8">
          <StatusDisplay 
						player={player}
						isSkillModalOpen={isStatusSkillModalOpen}
            onToggleSkillModal={handleToggleStatusSkillModal}
					/>
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

  // 2-1. 보스 던전 선택 화면
  if (gameState === "bossSelect") {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-5 pb-10 md:px-8">
          <StatusDisplay 
						player={player}
						isSkillModalOpen={isStatusSkillModalOpen}
            onToggleSkillModal={handleToggleStatusSkillModal}
					/>
          <GameLog messages={logMessages} />
        </main>
        <BossSelectionScreen
          player={player}
          bossDungeons={bossDungeons}
          bossCooldowns={bossCooldowns}
          onSelectBossDungeon={actions.handleSelectBossDungeon}
          onExit={actions.handleCloseBossSelect}
        />
      </div>
    );
  }

  // 3. 메인 게임 화면
  const isBattle = gameState === "battle";

  return (
    <div className="flex h-screen flex-col bg-gray-50 overflow-hidden">
      <Header />

			{isBattle ? (
				// ============================================================
        // [전투 화면]
        // ============================================================
      	<main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-20 pt-6">
          <div className="flex flex-col h-full pt-4 pb-4">
            
            {/* 상단 영역: 왼쪽(상태창) / 오른쪽(전투씬) */}
            <div className="flex flex-65 min-h-0 gap-4">

              {/* 왼쪽: 상태창 */}
              <div className="w-5/12 h-full pt-11">
                <StatusDisplay 
									player={player} 
									compact={isBattle}
									isSkillModalOpen={isStatusSkillModalOpen}
                  onToggleSkillModal={handleToggleStatusSkillModal}
								/>
              </div>

              {/* 오른쪽: 전투 씬 */}
              <div className="w-7/12 h-full flex items-center justify-center">
                <Scene
                  player={player}
                  monster={monster}
                  isPlayerTurn={isPlayerTurn}
                />
              </div>
            </div>

            {/* 하단 영역: 게임 로그 (GameLog 자체 높이 사용) */}
            <div className="shrink-0">
              <GameLog messages={logMessages} />
            </div>

            {/* 최하단: 액션 메뉴 */}
						{!isStatusSkillModalOpen && (
							<ActionMenu
								isOpen={isActionMenuOpen}
								onClose={() => setIsActionMenuOpen(false)}
								gameState={gameState}
								isPlayerTurn={isPlayerTurn}
								isProcessing={isProcessing}
								recoveryCharges={recoveryCharges}
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
								onOpenWeaponEnhance={actions.handleOpenWeaponEnhance}
								onOpenScarecrow={actions.handleOpenScarecrow}
								onOpenSkills={actions.handleOpenSkills}
								onUseSkill={actions.handleUseSkill}
								onOpenDungeonSelect={actions.handleOpenDungeonSelect}
								onOpenBossSelect={actions.handleOpenBossSelect}
								showBattleChoice={showBattleChoice}
								onContinueBattle={actions.handleContinueBattle}
								onExitDungeon={actions.handleExitDungeon}
								isScarecrowBattle={isScarecrowBattle}
								onExitScarecrowBattle={actions.handleExitScarecrowBattle}
								isBattleSkillOpen={isBattleSkillOpen}
								onToggleBattleSkills={actions.handleToggleBattleSkills}
							/>
						)}
          </div>
				</main>
      ) : (
				// ============================================================
        // [홈 화면]
        // ============================================================
				<main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-4 pb-2 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
          <div className="flex flex-col h-full overflow-y-auto pt-4 pb-20 overflow-hidden">
						
						{/* 상단: 상태창 (남는 공간 차지, 스크롤 가능) */}
						<div className="flex-1 overflow-hidden pr-2 min-h-0">
							<div className="-mt-8">
								<StatusDisplay 
									player={player}
									compact={false}
									isSkillModalOpen={isStatusSkillModalOpen}
              		onToggleSkillModal={handleToggleStatusSkillModal}
								/>
							</div>
						</div>

            {/* 하단: 게임 로그 (고정 높이 아님, 내용에 따라 적절히 배치) */}
						<div className="shrink-0 mt-4 relative z-10">
							<div className="-mt-6">
								<GameLog messages={logMessages} />
							</div>
						</div>
						
            <ActionMenu
							isOpen={isActionMenuOpen}
        			onClose={() => setIsActionMenuOpen(false)}
              gameState={gameState}
              isPlayerTurn={isPlayerTurn}
              isProcessing={isProcessing}
              recoveryCharges={recoveryCharges}
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
              onOpenWeaponEnhance={actions.handleOpenWeaponEnhance}
              onOpenScarecrow={actions.handleOpenScarecrow}
              onOpenSkills={actions.handleOpenSkills}
              onUseSkill={actions.handleUseSkill}
              onOpenDungeonSelect={actions.handleOpenDungeonSelect}
              onOpenBossSelect={actions.handleOpenBossSelect}
              showBattleChoice={showBattleChoice}
              onContinueBattle={actions.handleContinueBattle}
              onExitDungeon={actions.handleExitDungeon}
              isScarecrowBattle={isScarecrowBattle}
              onExitScarecrowBattle={actions.handleExitScarecrowBattle}
              isBattleSkillOpen={isBattleSkillOpen}
              onToggleBattleSkills={actions.handleToggleBattleSkills}
            />
          </div>
				</main>
      )}

      {/* --- 모달 및 오버레이 화면들 --- */}

      {/* 상점 */}
      {gameState === "shop" && (
        <ShopScreen
          player={player}
          shopLists={shopLists}
          onExitShop={actions.handleExitShop}
          onBuyItem={actions.handleBuyItem}
          onBuyPet={actions.handleBuyPet}
          onEquipWeapon={actions.handleEquipWeapon}
          onEquipArmor={actions.handleEquipArmor}
          onEquipPet={actions.handleEquipPet}
          onUnequipWeapon={actions.handleUnequipWeapon}
          onUnequipArmor={actions.handleUnequipArmor}
          onUnequipPet={actions.handleUnequipPet}
        />
      )}

      {/* 강화소 */}
      {gameState === "weaponEnhance" && (
        <EquipmentEnhanceScreen
          player={player}
          onClose={actions.handleCloseEnhance}
          onEnhanceWeapon={actions.handleEnhanceWeapon}
          onEnhanceArmor={actions.handleEnhanceArmor}
          onEnhancePet={actions.handleEnhancePet}
        />
      )}

      {/* 스킬 관리 모달 */}
      {isSkillsOpen && (
        <SkillsScreen
          player={player}
          skills={skills}
          onClose={actions.handleCloseSkills}
          onLearn={actions.learnSkill}
        />
      )}

      {/* 보스 보상 모달 */}
      {gameState === "bossReward" && bossReward && (
        <BossRewardModal
          player={player}
          reward={bossReward}
          onAction={actions.handleBossRewardAction}
        />
      )}

      {/* 일반 몬스터 드롭 모달 */}
      {gameState === "normalDrop" && bossReward && (
        <NormalDropModal
          player={player}
          reward={bossReward}
          onAction={actions.handleBossRewardAction}
        />
      )}

      {/* 허수아비 설정 화면 */}
      {gameState === "scarecrow" && (
        <ScarecrowScreen
          player={player}
          onClose={actions.handleCloseScarecrow}
          onStartBattle={actions.handleStartScarecrowBattle}
        />
      )}

      {/* 개발자 모드 패널 */}
      {isDeveloperMode && (
        <DeveloperPanel
          onSave={actions.saveGameState}
          onLoad={actions.loadGameState}
          onDelete={actions.deleteGameSlot}
          onLoadFromFile={actions.loadGameStateFromFile}
          onLoadFromText={actions.loadGameStateFromText}
          getSaveSlotInfo={actions.getSaveSlotInfo}
          onResetAllBossCooldowns={actions.resetAllBossCooldowns}
        />
      )}
    </div>
  );
}

export default App;
