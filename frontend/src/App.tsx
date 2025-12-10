import { useEffect } from "react";
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

  // 단축키 이벤트 리스너 (rpg.js의 keydown 리스너)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      actions.handleKeyDown(event.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actions]); // actions는 메모이제이션되어 있다고 가정 (useCallback 사용 시)
  // *참고: useGameEngine에서 actions 객체를 useCallback으로 감싸면 더 최적화할 수 있습니다.

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

  // 2-1. 보스 던전 선택 화면
  if (gameState === "bossSelect") {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-5 pb-10 md:px-8">
          <StatusDisplay player={player} />
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

        {/* 씬 (VS) */}
        <Scene
          player={player}
          monster={monster}
          isPlayerTurn={isPlayerTurn && gameState === "battle"}
        />

        {/* 게임 로그 */}
        <GameLog messages={logMessages} />
      </main>

      {/* 상점 모달 조건부 렌더링 (화면 위에 겹침) */}
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

      {/* 강화소 (무기, 방어구, 펫) */}
      {gameState === "weaponEnhance" && (
        <EquipmentEnhanceScreen
          player={player}
          onClose={actions.handleCloseEnhance}
          onEnhanceWeapon={actions.handleEnhanceWeapon}
          onEnhanceArmor={actions.handleEnhanceArmor}
          onEnhancePet={actions.handleEnhancePet}
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

      {/* 보스 보상 모달 렌더링 */}
      {gameState === "bossReward" && bossReward && (
        <BossRewardModal
          player={player}
          reward={bossReward}
          onAction={actions.handleBossRewardAction}
        />
      )}

      {/* 2. 일반 드롭 모달 렌더링 */}
      {gameState === "normalDrop" && bossReward && (
        <NormalDropModal
          player={player}
          reward={bossReward} // 데이터는 bossReward state를 공유
          onAction={actions.handleBossRewardAction} // 액션 핸들러도 재사용 (장착/판매 로직 동일)
        />
      )}

      {/* 허수아비 화면 */}
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
