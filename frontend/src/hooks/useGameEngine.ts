// src/hooks/useGameEngine.ts

import { useState } from "react";
import type {
  PlayerStats,
  CharacterStats,
  Job,
  GameState,
  LogMessage,
  LogType,
  EquipmentItem,
  Dungeon,
  BossStats,
  SkillKey,
  BossReward,
} from "../game/types";
// 상수 임포트
import {
  skills as allSkills,
  dungeons,
  petShopList,
  bossDungeons,
  createBoss,
} from "../game/constants";
import { weaponShopList, armorShopList } from "../game/shopItems";
import { STARTER_CLUB, bossRewardPool, normalDropPool } from "../game/engineConstants";
// 유틸리티 임포트
import { getRandom } from "../game/utils";
// 분리된 로직 임포트
import {
  createNewPlayer,
  checkLevelUp,
  getEffectivePlayerStats,
} from "../game/playerLogic";
import { makeMonster } from "../game/monsterLogic";
import { calculateAttack } from "../game/battleLogic";
import { tickSkills, canLearnSkill } from "../game/skillLogic";
import { applyPetStartOfTurn } from "../game/petLogic";

// --- 메인 커스텀 훅 ---

export const useGameEngine = () => {
  const [player, setPlayer] = useState<PlayerStats | null>(null);
  const [monster, setMonster] = useState<CharacterStats | null>(null);
  const [boss, setBoss] = useState<BossStats | null>(null); // 보스 상태
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [gameState, setGameState] = useState<GameState>("setup");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // 몬스터 턴 등 처리 중 플래그
  const [consecutiveMisses, setConsecutiveMisses] = useState(0); // 연속 빗나감 횟수
  const [recoveryCharges, setRecoveryCharges] = useState(5); // 회복 횟수 추가
  const [isSkillsOpen, setIsSkillsOpen] = useState(false); // 스킬 창 모달
	const [isBattleSkillOpen, setIsBattleSkillOpen] = useState(false); // 전투 중 스킬 메뉴 상태
  const [currentDungeonId, setCurrentDungeonId] = useState<string | null>(null); // 현재 던전 ID
  const [currentBossDungeonId, setCurrentBossDungeonId] = useState<
    string | null
  >(null); // 현재 보스 던전 ID
  const [showBattleChoice, setShowBattleChoice] = useState(false); // 전투 후 선택 화면 표시 여부
  const [bossCooldowns, setBossCooldowns] = useState<Record<string, number>>(
    () => {
      const stored = localStorage.getItem("bossCooldowns");
      return stored ? JSON.parse(stored) : {};
    }
  );
  const [dungeonKillCounts, setDungeonKillCounts] = useState<
    Record<string, number>
  >(() => {
    const stored = localStorage.getItem("dungeonKillCounts");
    return stored ? JSON.parse(stored) : {};
  });
  const [bossReward, setBossReward] = useState<BossReward | null>(null);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isScarecrowBattle, setIsScarecrowBattle] = useState(false); // 허수아비 전투 플래그
  const [scarecrowConfig, setScarecrowConfig] = useState<{
    maxHp: number;
    atk: number;
    def: number;
    luk: number;
  } | null>(null); // 허수아비 설정 저장

  // Electron API 타입 정의
  type ElectronAPI = {
    saveGameState: (
      slot: number,
      gameState: any
    ) => Promise<{ success: boolean; path?: string; error?: string }>;
    loadGameState: (
      slot: number
    ) => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteGameSlot: (
      slot: number
    ) => Promise<{ success: boolean; error?: string }>;
    getSaveSlotInfo: (
      slot: number
    ) => Promise<{ success: boolean; info?: any; error?: string }>;
  };

  const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;
  const isElectron = !!electronAPI;

  /**
   * 개발자 모드 활성화
   */
  const enableDeveloperMode = () => {
    setIsDeveloperMode(true);
    addLog("🔧 개발자 모드가 활성화되었습니다.", "normal");
  };

  /**
   * 게임 상태 저장 (슬롯 번호 지정) - 프로젝트 saves 폴더에 저장
   */
  const saveGameState = async (slot: number = 1) => {
    if (!player) {
      addLog("🚫 저장할 게임 상태가 없습니다.", "fail");
      return;
    }

    const gameStateToSave = {
      player,
      bossCooldowns,
      dungeonKillCounts,
      logMessages: logMessages.slice(-50), // 최근 50개 로그만 저장
      timestamp: Date.now(),
      slot,
    };

    if (isElectron && electronAPI) {
      // Electron 환경: 파일 시스템에 직접 저장
      try {
        const result = await electronAPI.saveGameState(slot, gameStateToSave);
        if (result.success) {
          addLog(
            `💾 슬롯 ${slot}에 게임 상태가 저장되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 저장 실패: ${result.error}`, "fail");
        }
      } catch (error) {
        addLog(`🚫 저장 중 오류가 발생했습니다.`, "fail");
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 저장
      try {
        const response = await fetch("/api/save-game-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot, gameState: gameStateToSave }),
        });
        const result = await response.json();
        if (result.success) {
          addLog(
            `💾 슬롯 ${slot}에 게임 상태가 저장되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 저장 실패: ${result.error}`, "fail");
        }
      } catch (error) {
        addLog(`🚫 저장 중 오류가 발생했습니다.`, "fail");
      }
    }
  };

  /**
   * 게임 상태 로드 (슬롯 번호 지정) - 프로젝트 saves 폴더에서 로드
   */
  const loadGameState = async (slot: number = 1) => {
    if (isElectron && electronAPI) {
      // Electron 환경: 파일 시스템에서 직접 로드
      try {
        const result = await electronAPI.loadGameState(slot);
        if (result.success && result.data) {
          const gameState = result.data;
          setPlayer(gameState.player);
          setBossCooldowns(gameState.bossCooldowns || {});
          setDungeonKillCounts(gameState.dungeonKillCounts || {});
          if (gameState.logMessages) {
            setLogMessages(gameState.logMessages);
          }
          setGameState("dungeon");
          setMonster(null);
          setBoss(null);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          addLog(
            `📂 슬롯 ${slot}에서 게임 상태가 로드되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 게임 상태가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 게임 상태 로드에 실패했습니다.", "fail");
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 로드
      try {
        const response = await fetch(`/api/load-game-state?slot=${slot}`);
        const result = await response.json();
        if (result.success && result.data) {
          const gameState = result.data;
          setPlayer(gameState.player);
          setBossCooldowns(gameState.bossCooldowns || {});
          setDungeonKillCounts(gameState.dungeonKillCounts || {});
          if (gameState.logMessages) {
            setLogMessages(gameState.logMessages);
          }
          setGameState("dungeon");
          setMonster(null);
          setBoss(null);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          addLog(
            `📂 슬롯 ${slot}에서 게임 상태가 로드되었습니다. (프로젝트 saves 폴더)`,
            "vic"
          );
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 게임 상태가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 게임 상태 로드에 실패했습니다.", "fail");
      }
    }
  };

  /**
   * 파일에서 게임 상태 로드 - 프로젝트 saves 폴더에 저장
   */
  const loadGameStateFromFile = (file: File, slot: number) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const gameState = JSON.parse(e.target?.result as string);
        if (isElectron && electronAPI) {
          // Electron 환경: 파일 시스템에 저장
          const result = await electronAPI.saveGameState(slot, gameState);
          if (result.success) {
            addLog(
              `📂 슬롯 ${slot}에 파일이 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
              "vic"
            );
          } else {
            addLog(`🚫 파일 저장 실패: ${result.error}`, "fail");
          }
        } else {
          // 브라우저 환경: 개발 서버 API를 통해 저장
          try {
            const response = await fetch("/api/save-game-state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slot, gameState }),
            });
            const result = await response.json();
            if (result.success) {
              addLog(
                `📂 슬롯 ${slot}에 파일이 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
                "vic"
              );
            } else {
              addLog(`🚫 파일 저장 실패: ${result.error}`, "fail");
            }
          } catch (error) {
            addLog("🚫 파일 저장 중 오류가 발생했습니다.", "fail");
          }
        }
      } catch (error) {
        addLog("🚫 파일 형식이 올바르지 않습니다.", "fail");
      }
    };
    reader.readAsText(file);
  };

  /**
   * 텍스트에서 게임 상태 로드 - 프로젝트 saves 폴더에 저장
   */
  const loadGameStateFromText = async (text: string, slot: number) => {
    try {
      const gameState = JSON.parse(text);
      if (isElectron && electronAPI) {
        // Electron 환경: 파일 시스템에 저장
        const result = await electronAPI.saveGameState(slot, gameState);
        if (result.success) {
          addLog(
            `📂 슬롯 ${slot}에 텍스트가 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
            "vic"
          );
        } else {
          addLog(`🚫 텍스트 저장 실패: ${result.error}`, "fail");
        }
      } else {
        // 브라우저 환경: 개발 서버 API를 통해 저장
        try {
          const response = await fetch("/api/save-game-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slot, gameState }),
          });
          const result = await response.json();
          if (result.success) {
            addLog(
              `📂 슬롯 ${slot}에 텍스트가 로드되었습니다. "로드" 버튼을 눌러 게임 상태를 적용하세요.`,
              "vic"
            );
          } else {
            addLog(`🚫 텍스트 저장 실패: ${result.error}`, "fail");
          }
        } catch (error) {
          addLog("🚫 텍스트 저장 중 오류가 발생했습니다.", "fail");
        }
      }
    } catch (error) {
      addLog("🚫 텍스트 형식이 올바르지 않습니다.", "fail");
    }
  };

  /**
   * 특정 슬롯의 저장 상태 확인 - 프로젝트 saves 폴더에서 확인
   */
  const getSaveSlotInfo = async (slot: number) => {
    if (isElectron && electronAPI) {
      try {
        const result = await electronAPI.getSaveSlotInfo(slot);
        if (result.success) {
          return result.info;
        }
        return null;
      } catch (error) {
        return null;
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 확인
      try {
        const response = await fetch(`/api/get-save-slot-info?slot=${slot}`);
        const result = await response.json();
        if (result.success) {
          return result.info;
        }
        return null;
      } catch (error) {
        return null;
      }
    }
  };

  /**
   * 특정 슬롯의 저장 데이터 삭제 - 프로젝트 saves 폴더에서 삭제
   */
  const deleteGameSlot = async (slot: number) => {
    if (isElectron && electronAPI) {
      try {
        const result = await electronAPI.deleteGameSlot(slot);
        if (result.success) {
          addLog(`🗑️ 슬롯 ${slot}의 저장 데이터가 삭제되었습니다.`, "normal");
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 데이터가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 삭제 중 오류가 발생했습니다.", "fail");
      }
    } else {
      // 브라우저 환경: 개발 서버 API를 통해 삭제
      try {
        const response = await fetch(`/api/delete-game-slot?slot=${slot}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.success) {
          addLog(`🗑️ 슬롯 ${slot}의 저장 데이터가 삭제되었습니다.`, "normal");
        } else {
          addLog(`🚫 슬롯 ${slot}에 저장된 데이터가 없습니다.`, "fail");
        }
      } catch (error) {
        addLog("🚫 삭제 중 오류가 발생했습니다.", "fail");
      }
    }
  };

  /**
   * 모든 보스 타이머 초기화
   */
  const resetAllBossCooldowns = () => {
    setBossCooldowns({});
    localStorage.setItem("bossCooldowns", JSON.stringify({}));
    addLog("⏰ 모든 보스 타이머가 초기화되었습니다.", "normal");
  };

  /**
   * 로그 추가 유틸리티
   */
  const addLog = (msg: string, type: LogType = "normal") => {
    const id = Date.now() + getRandom(1, 1000);
    setLogMessages((prev) => [...prev, { id, msg, type }]);
  };

  const addLogs = (logs: Omit<LogMessage, "id">[]) => {
    const newLogs = logs.map((log, i) => ({
      ...log,
      id: Date.now() + i + getRandom(1, 1000),
    }));
    setLogMessages((prev) => [...prev, ...newLogs]);
  };

  /**
   * 스킬 배우기 (State 변경)
   */
  const learnSkill = (key: SkillKey) => {
    if (!player) return;
    if (!canLearnSkill(player, key)) {
      // 순수 로직 호출
      addLog("🚫 스킬을 배울 수 없습니다.", "fail");
      return;
    }
    const skill = allSkills.find((s) => s.key === key)!;
    const currentLevel = (player.skillUpgradeLevels || {})[key] || 0;
    const newLevel = currentLevel + 1;

    const updatedSkills = player.skills.includes(key)
      ? player.skills
      : [...player.skills, key];

    const updated = {
      ...player,
      skillPoints: (player.skillPoints || 0) - 1,
      skills: updatedSkills,
      skillUpgradeLevels: {
        ...(player.skillUpgradeLevels || {}),
        [key]: newLevel,
      },
    };
    setPlayer(updated);

    if (currentLevel === 0) {
      addLog(`📘 "${skill.name}" 스킬을 배웠다! (Lv.${newLevel}/5)`, "normal");
    } else {
      addLog(
        `📘 "${skill.name}" 스킬을 더 배웠다! (Lv.${newLevel}/5)`,
        "normal"
      );
    }
  };

  /**
   * 몬스터 턴 실행 (State 변경)
   */
  const runMonsterTurn = (
    currentPlayer: PlayerStats,
    currentMonster: CharacterStats
  ) => {
    setIsProcessing(true);

    setTimeout(() => {
      // 턴 시작 시점에 플레이어가 없으면(예: 페이지 새로고침) 중단
      if (!player) {
        setIsProcessing(false);
        return;
      }

      addLog(`--- 몬스터의 턴 ---`, "normal");

      // 몬스터 기절 체크
      if ((currentPlayer.monsterStunnedTurns || 0) > 0) {
        addLog(`💫 적이 기절하여 행동할 수 없다!`, "fail");
        const nextPlayer = {
          ...currentPlayer,
          monsterStunnedTurns: (currentPlayer.monsterStunnedTurns || 0) - 1,
        };

        // 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(nextPlayer); // 순수 로직
        // 펫 로직 호출 (순수 로직)
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(
          ticked,
          currentMonster,
          getEffectivePlayerStats
        );
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setMonster(monsterAfterPet);

        // 허수아비 전투인 경우 체력 무한 (자동 회복)
        if (isScarecrowBattle && monsterAfterPet && monsterAfterPet.hp <= 0) {
          addLog(
            `🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`,
            "vic"
          );
          const restoredScarecrow: CharacterStats = {
            ...monsterAfterPet,
            hp: scarecrowConfig?.maxHp || monsterAfterPet.maxHp,
          };
          setMonster(restoredScarecrow);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          return;
        }

        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBattleEnd("victory", playerAfterPet, monsterAfterPet);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }

      // 배리어 체크
      const barrierIdx = (currentPlayer.activeBuffs || []).findIndex(
        (b) => b.barrier
      );
      if (barrierIdx >= 0) {
        const skillName = currentPlayer.activeBuffs![barrierIdx].key;
        addLog(`🛡️ [${skillName}] 스킬이 몬스터의 공격을 무효화했다!`, "vic");
        const nextBuffs = [...(currentPlayer.activeBuffs || [])];
        nextBuffs.splice(barrierIdx, 1);
        const updatedAfterBarrier = {
          ...currentPlayer,
          activeBuffs: nextBuffs,
        };

        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(updatedAfterBarrier);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(
          ticked,
          currentMonster,
          getEffectivePlayerStats
        );
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setMonster(monsterAfterPet);

        // 허수아비 전투인 경우 체력 무한 (자동 회복)
        if (isScarecrowBattle && monsterAfterPet && monsterAfterPet.hp <= 0) {
          addLog(
            `🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`,
            "vic"
          );
          const restoredScarecrow: CharacterStats = {
            ...monsterAfterPet,
            hp: scarecrowConfig?.maxHp || monsterAfterPet.maxHp,
          };
          setMonster(restoredScarecrow);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          return;
        }

        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBattleEnd("victory", playerAfterPet, monsterAfterPet);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }

      // 회피 체크
      const hasEvade = (currentPlayer.activeBuffs || []).some(
        (b) => b.evadeAll
      );
      if (hasEvade) {
        addLog(`🍃 스킬 효과로 몬스터의 공격을 회피했다!`, "vic");
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(currentPlayer);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(
          ticked,
          currentMonster,
          getEffectivePlayerStats
        );
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setMonster(monsterAfterPet);

        // 허수아비 전투인 경우 체력 무한 (자동 회복)
        if (isScarecrowBattle && monsterAfterPet && monsterAfterPet.hp <= 0) {
          addLog(
            `🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`,
            "vic"
          );
          const restoredScarecrow: CharacterStats = {
            ...monsterAfterPet,
            hp: scarecrowConfig?.maxHp || monsterAfterPet.maxHp,
          };
          setMonster(restoredScarecrow);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          return;
        }

        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBattleEnd("victory", playerAfterPet, monsterAfterPet);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }

      // 약화(weaken) 적용
      const weaken =
        (currentPlayer.activeBuffs || []).find(
          (b) => (b.weakenPercent || 0) > 0
        )?.weakenPercent || 0;
      const attackerForTurn =
        weaken > 0
          ? {
              ...currentMonster,
              atk: Math.max(1, Math.floor(currentMonster.atk * (1 - weaken))),
            }
          : currentMonster;

      const effectivePlayer = getEffectivePlayerStats(currentPlayer); // 순수 로직
      const result = calculateAttack(attackerForTurn, effectivePlayer); // 순수 로직
      addLogs(result.logs);

      let updatedPlayer = {
        ...currentPlayer,
        hp: result.defender.hp,
        isDefending: false,
      }; // 방어 상태 해제

      // 반사/카운터 처리
      const reflect =
        (currentPlayer.activeBuffs || []).find(
          (b) => (b.reflectPercent || 0) > 0
        )?.reflectPercent || 0;
      let updatedMonster = { ...currentMonster };
      const last = result.logs[result.logs.length - 1];
      const match = last?.msg.match(/(\d+)의 데미지를/);
      const dealt = match ? parseInt(match[1], 10) : 0;
      if (reflect > 0 && dealt > 0) {
        const reflectDmg = Math.floor(dealt * reflect);
        updatedMonster.hp = Math.max(0, updatedMonster.hp - reflectDmg);
        addLog(
          `🔄 스킬 효과로 ${reflectDmg}의 피해를 반사! (적 HP: ${updatedMonster.hp})`,
          "vic"
        );
        setMonster(updatedMonster);
      }
      // ... (카운터 로직) ...

      if (result.isBattleOver) {
        handleBattleEnd("defeat", updatedPlayer, currentMonster);
      } else {
        // 턴 종료, 플레이어 턴 시작
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(updatedPlayer); // 순수 로직
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(
          ticked,
          updatedMonster,
          getEffectivePlayerStats
        ); // 순수 로직
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setMonster(monsterAfterPet);

        // 허수아비 전투인 경우 체력 무한 (자동 회복)
        if (isScarecrowBattle && monsterAfterPet && monsterAfterPet.hp <= 0) {
          addLog(
            `🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`,
            "vic"
          );
          const restoredScarecrow: CharacterStats = {
            ...monsterAfterPet,
            hp: scarecrowConfig?.maxHp || monsterAfterPet.maxHp,
          };
          setMonster(restoredScarecrow);
          setIsPlayerTurn(true);
          setIsProcessing(false);
          return;
        }

        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBattleEnd("victory", playerAfterPet, monsterAfterPet);
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
      }
    }, 1500);
  };

  /**
   * 보스 턴 실행 (State 변경)
   */
  const runBossTurn = (currentPlayer: PlayerStats, currentBoss: BossStats) => {
    setIsProcessing(true);

    setTimeout(() => {
      if (!currentPlayer) {
        setIsProcessing(false);
        return;
      }

      addLog(`--- 몬스터의 턴 ---`, "normal");

      // 0. 보스 턴 시작 시, 보스 자신의 버프/쿨다운 틱
      let updatedBoss = tickSkills(currentBoss); // (tickSkills는 PlayerStats | BossStats 둘 다 처리 가능)

      // 1. 플레이어 상태 체크 (기절, 배리어, 회피)
      if ((currentPlayer.monsterStunnedTurns || 0) > 0) {
        addLog(`💫 적이 기절하여 행동할 수 없다!`, "fail");
        const nextPlayer = {
          ...currentPlayer,
          monsterStunnedTurns: (currentPlayer.monsterStunnedTurns || 0) - 1,
        };
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(nextPlayer);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(ticked, updatedBoss, getEffectivePlayerStats);
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setBoss(monsterAfterPet as BossStats);
        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBossBattleEnd(
            "victory",
            playerAfterPet,
            monsterAfterPet as BossStats
          );
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }
      const barrierIdx = (currentPlayer.activeBuffs || []).findIndex(
        (b) => b.barrier
      );
      if (barrierIdx >= 0) {
        const skillName = currentPlayer.activeBuffs![barrierIdx].key;
        addLog(`🛡️ [${skillName}] 스킬이 보스의 공격을 무효화했다!`, "vic");
        const nextBuffs = [...(currentPlayer.activeBuffs || [])];
        nextBuffs.splice(barrierIdx, 1);
        const updatedAfterBarrier = {
          ...currentPlayer,
          activeBuffs: nextBuffs,
        };
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(updatedAfterBarrier);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(ticked, updatedBoss, getEffectivePlayerStats);
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setBoss(monsterAfterPet as BossStats);
        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBossBattleEnd(
            "victory",
            playerAfterPet,
            monsterAfterPet as BossStats
          );
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }
      const hasEvade = (currentPlayer.activeBuffs || []).some(
        (b) => b.evadeAll
      );
      if (hasEvade) {
        addLog(`🍃 스킬 효과로 보스의 공격을 회피했다!`, "vic");
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(currentPlayer);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(ticked, updatedBoss, getEffectivePlayerStats);
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setBoss(monsterAfterPet as BossStats);
        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBossBattleEnd(
            "victory",
            playerAfterPet,
            monsterAfterPet as BossStats
          );
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }

      // 2. 보스 스킬 사용 결정
      // 실제 존재하는 스킬만 필터링
      const availableSkillKeys = new Set(allSkills.map((s) => s.key));
      // 보스 스킬 배열을 정리하여 유효한 스킬만 남김
      const validBossSkills = (updatedBoss.skills || []).filter((key) => {
        if (typeof key !== "string") return false;
        return availableSkillKeys.has(key as SkillKey);
      });
      // 유효한 스킬이 없으면 빈 배열로 설정
      if (
        validBossSkills.length === 0 &&
        (updatedBoss.skills || []).length > 0
      ) {
        addLog(
          `⚠️ 보스의 스킬 목록에 유효하지 않은 스킬이 있어 제거되었습니다.`,
          "fail"
        );
        updatedBoss.skills = [];
      } else if (validBossSkills.length !== (updatedBoss.skills || []).length) {
        updatedBoss.skills = validBossSkills;
      }

      const availableSkills = validBossSkills.filter(
        (key) => ((updatedBoss.skillCooldowns || {})[key] || 0) <= 0
      );
      const SKILL_CHANCE = 50; // 50% 확률
      // let playerStunnedThisTurn = 0;
      let usedSkillKey: SkillKey | null = null;

      if (availableSkills.length > 0 && getRandom(1, 100) <= SKILL_CHANCE) {
        // --- 스킬 사용 ---
        const skillKey =
          availableSkills[getRandom(0, availableSkills.length - 1)];
        const skill = allSkills.find((s) => s.key === skillKey);
        if (!skill) {
          addLog(
            `⚠️ 보스가 알 수 없는 스킬을 사용하려고 했습니다: ${skillKey}`,
            "fail"
          );
          setIsProcessing(false);
          return;
        }
        usedSkillKey = skillKey;
        addLog(`👹 ${currentBoss.name}의 스킬! [${skill.name}]!`, "cri");

        // 쿨다운 설정
        updatedBoss.skillCooldowns = {
          ...(updatedBoss.skillCooldowns || {}),
          [skillKey]: skill.cooldown,
        };

        if (skill.kind === "buff") {
          const newBuff = {
            key: skill.key,
            remainingTurns: skill.duration || 1,
            bonuses: skill.bonuses || {},
            // (이하 모든 버프 효과)
            evadeAll: skill.effect?.type === "evade",
            reflectPercent:
              skill.effect?.type === "reflect" ? skill.effect.value : 0,
            barrier: skill.effect?.type === "barrier",
            chargeAttackMultiplier:
              skill.effect?.type === "charge" ? skill.effect.value : 0,
            counterDamage:
              skill.effect?.type === "counter" ? skill.effect.value : 0,
            lifeStealPercent:
              skill.effect?.type === "lifesteal" ? skill.effect.value : 0,
            weakenPercent:
              skill.effect?.type === "weaken" ? skill.effect.value : 0,
            multiStrikeNext: skill.effect?.type === "multiStrike",
            trueStrikeNext: skill.effect?.type === "trueStrike",
          };
          // 보스 자신에게 버프 적용
          updatedBoss.activeBuffs = [
            ...(updatedBoss.activeBuffs || []),
            newBuff,
          ];
        }

        if (skill.effect?.type === "timeStop") {
          if (skill && skill.name) {
            addLog(
              `⏰ [${skill.name}] 효과! 보스가 추가 턴을 얻습니다!`,
              "vic"
            );
          } else {
            addLog(`⏰ 스킬 효과! 보스가 추가 턴을 얻습니다!`, "vic");
          }
          // 보스 상태 업데이트 후 재귀 호출
          setBoss(updatedBoss);
          setIsProcessing(false); // 현재 턴 종료 처리
          runBossTurn(currentPlayer, updatedBoss); // 즉시 턴 다시 실행
          return; // 현재 턴 종료
        }

        if (skill.effect?.type === "stun") {
          // 'monsterStunnedTurns'는 플레이어가 몬스터를 기절시킨 턴수
          // 보스가 플레이어를 기절시키는 로직은 현재 PlayerStats에 없음.
          if (skill && skill.name) {
            addLog(
              `💫 [${skill.name}] 효과! 플레이어가 기절...했어야 하지만 스턴 효과가 구현되지 않았습니다!`,
              "fail"
            );
          } else {
            addLog(
              `💫 스킬 효과! 플레이어가 기절...했어야 하지만 스턴 효과가 구현되지 않았습니다!`,
              "fail"
            );
          }
          // playerStunnedThisTurn = skill.effect.value; // (나중에 PlayerStats에 isStunnedTurns 추가 시 사용)
        }
      }

      // 3. 스킬 사용 후 또는 일반 공격
      // (스킬이 공격 스킬이 아니었거나(버프), 스킬을 사용하지 않았을 경우)
      // (단, 'THEWORLD' 스킬은 위에서 return 되어 이 로직을 실행하지 않음)
      const weaken =
        (currentPlayer.activeBuffs || []).find(
          (b) => (b.weakenPercent || 0) > 0
        )?.weakenPercent || 0;

      // 보스의 차지/트루스트라이크 등 버프 적용
      const charge =
        (updatedBoss.activeBuffs || []).find(
          (b) => (b.chargeAttackMultiplier || 0) > 0
        )?.chargeAttackMultiplier || 0;
      const trueStrike = (updatedBoss.activeBuffs || []).some(
        (b) => b.trueStrikeNext
      );

      let attackerForTurn = {
        ...updatedBoss,
        atk: Math.max(1, Math.floor(updatedBoss.atk * (1 - weaken))),
      };
      if (charge > 0) {
        attackerForTurn.atk = Math.floor(attackerForTurn.atk * (1 + charge));
        addLog(`👹 [${usedSkillKey}] 효과! 보스의 공격력 증폭!`, "cri");
      }

      let effectivePlayer = getEffectivePlayerStats(currentPlayer);
      if (trueStrike) {
        effectivePlayer.def = 0; // 방어 무시
        addLog(
          `🎯 [${usedSkillKey}] 효과! 보스의 공격이 방어를 무시합니다!`,
          "cri"
        );
      }

      // 공격 실행
      const result = calculateAttack(attackerForTurn, effectivePlayer); // 순수 로직
      addLogs(result.logs);

      let updatedPlayer = {
        ...currentPlayer,
        hp: result.defender.hp,
        isDefending: false,
      }; // 방어 상태 해제
      // (만약 보스가 스턴 스킬을 썼다면) updatedPlayer.isStunnedTurns = playerStunnedThisTurn;

      // 버프 제거
      if (charge > 0) {
        const chargeIdx = (updatedBoss.activeBuffs || []).findIndex(
          (b) => b.chargeAttackMultiplier
        );
        if (chargeIdx >= 0) updatedBoss.activeBuffs!.splice(chargeIdx, 1);
      }
      if (trueStrike) {
        const trueStrikeIdx = (updatedBoss.activeBuffs || []).findIndex(
          (b) => b.trueStrikeNext
        );
        if (trueStrikeIdx >= 0)
          updatedBoss.activeBuffs!.splice(trueStrikeIdx, 1);
      }

      setPlayer(updatedPlayer);

      // 4. 반사/카운터 로직
      const reflect =
        (currentPlayer.activeBuffs || []).find(
          (b) => (b.reflectPercent || 0) > 0
        )?.reflectPercent || 0;
      const last = result.logs[result.logs.length - 1];
      const match = last?.msg.match(/(\d+)의 데미지를/);
      const dealt = match ? parseInt(match[1], 10) : 0;
      if (reflect > 0 && dealt > 0) {
        const reflectDmg = Math.floor(dealt * reflect);
        updatedBoss.hp = Math.max(0, updatedBoss.hp - reflectDmg);
        addLog(
          `🔄 스킬 효과로 ${reflectDmg}의 피해를 반사! (적 HP: ${updatedBoss.hp})`,
          "vic"
        );
      }
      setBoss(updatedBoss); // 보스 상태 최종 업데이트

      // 5. 전투 종료 확인
      if (result.isBattleOver) {
        handleBossBattleEnd("defeat", updatedPlayer, currentBoss);
      } else {
        // 6. 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(updatedPlayer); // 순수 로직
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(ticked, updatedBoss, getEffectivePlayerStats); // 순수 로직
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setBoss(monsterAfterPet as BossStats);

        if (monsterAfterPet && monsterAfterPet.hp <= 0) {
          handleBossBattleEnd(
            "victory",
            playerAfterPet,
            monsterAfterPet as BossStats
          );
          setIsProcessing(false);
          return;
        }
        setIsPlayerTurn(true);
        setIsProcessing(false);
      }
    }, 1500);
  };

  /**
   * 보스 전투 종료 처리
   */
  const handleBossBattleEnd = (
    type: "victory" | "defeat" | "escape",
    updatedPlayer: PlayerStats,
    targetBoss?: BossStats
  ) => {
    setConsecutiveMisses(0);
    setRecoveryCharges(5);
    let playerAfterBattle = { ...updatedPlayer };
    const logs: Omit<LogMessage, "id">[] = [];
    let didDropItem = false; // 아이템 드롭 여부 플래그

    if (type === "victory" && targetBoss && currentBossDungeonId) {
      logs.push({
        msg: `🎉 보스 전투에서 승리했다! ${targetBoss.name}을(를) 물리쳤다.`,
        type: "vic",
      });
      playerAfterBattle.vicCount += 1;

      // 보스 보상 (일반 몬스터보다 훨씬 많음)
      const gainedExp = getRandom(100, 300) + targetBoss.level * 200;
      const gainedGold = getRandom(200, 500) + targetBoss.level * 100;

      playerAfterBattle.exp += gainedExp;
      playerAfterBattle.money += gainedGold;
      logs.push({ msg: `👑 ${gainedExp} Exp를 획득했다.`, type: "gainExp" });
      logs.push({
        msg: `💰 ${gainedGold} Gold를 획득했다.`,
        type: "gainMoney",
      });

      // 레벨업 체크 (보상 지급 후에)
      const levelUpResult = checkLevelUp(playerAfterBattle); // 순수 로직
      playerAfterBattle = levelUpResult.newPlayer;
      logs.push(...levelUpResult.logs);

      // 보스 드롭 로직
      const DROP_CHANCE = 30; // 30% 확률
      if (getRandom(1, 100) <= DROP_CHANCE && bossRewardPool.length > 0) {
        didDropItem = true;
        const rewardItem =
          bossRewardPool[getRandom(0, bossRewardPool.length - 1)];

        const ownedList =
          rewardItem.type === "weapon"
            ? playerAfterBattle.ownedWeaponIds || []
            : playerAfterBattle.ownedArmorIds || [];
        const isDuplicate = ownedList.includes(rewardItem.id);

				// 직업 제한, 레벨 제한 로직
        const isUsable =
          (!rewardItem.allowedJobs || rewardItem.allowedJobs.includes(playerAfterBattle.job)) &&
          (!rewardItem.requiredLevel || playerAfterBattle.level >= rewardItem.requiredLevel);

        const sellPrice = Math.floor(rewardItem.price * 0.5); // 판매 시 정가 50%

        setBossReward({ item: rewardItem, isDuplicate, isUsable, sellPrice });
        setGameState("bossReward"); // 모달 상태로 전환
        setShowBattleChoice(false); // 전투 후 선택지 숨김
        logs.push({
          msg: `🎁 [보스 드롭] ${rewardItem.name} 획득!`,
          type: "lvup",
        });
      } else {
        logs.push({
          msg: `💨 아쉽지만, 특별한 아이템은 나오지 않았습니다...`,
          type: "fail",
        });
      }

      // 보스 던전 쿨타임 설정
      const newCooldowns = {
        ...bossCooldowns,
        [currentBossDungeonId]: Date.now() + 60 * 60 * 1000, // 1시간
      };
      setBossCooldowns(newCooldowns);
      localStorage.setItem("bossCooldowns", JSON.stringify(newCooldowns));
    } else if (type === "defeat") {
      logs.push({ msg: `☠️ 보스 전투에서 패배했다...`, type: "def" });
      playerAfterBattle.defCount += 1;
      playerAfterBattle.exp = Math.floor(playerAfterBattle.exp * 0.7);
      playerAfterBattle.hp = playerAfterBattle.maxHp;
      logs.push({
        msg: `😥 잠시 쉬고 일어나 체력을 모두 회복했다.`,
        type: "normal",
      });
    } else if (type === "escape") {
      logs.push({ msg: `💨 보스 전투에서 도망쳤다...`, type: "fail" });
    }

    addLogs(logs);
    setPlayer(playerAfterBattle);
    setBoss(null);
    setMonster(null);
    setIsProcessing(false);
    setIsPlayerTurn(true);

    // 보스 던전 전투 종료 시 항상 홈(던전 화면)으로 복귀
    if (type === "victory" && !didDropItem) {
      // 승리 && 아이템 드롭 안됨 -> 홈으로 복귀
      setShowBattleChoice(false);
      setGameState("dungeon");
      setCurrentBossDungeonId(null);
    } else if (type !== "victory") {
      // 패배 || 도망 -> 홈으로 복귀
      setShowBattleChoice(false);
      setGameState("dungeon");
      setCurrentBossDungeonId(null);
    }
    // (승리 && 아이템 드롭 시: GameState는 'bossReward'가 됨, handleBossRewardAction에서 처리)
  };

  /**
   * 전투 종료 처리 (일반)
   */
  const handleBattleEnd = (
    type: "victory" | "defeat" | "escape",
    updatedPlayer: PlayerStats,
    targetMonster?: CharacterStats
  ) => {
    // 허수아비 전투인 경우 특별 처리
    if (isScarecrowBattle && targetMonster) {
      if (type === "victory") {
        addLog(`🎯 허수아비를 물리쳤습니다!`, "vic");
        // 허수아비 HP 회복
        const restoredScarecrow: CharacterStats = {
          ...targetMonster,
          hp: scarecrowConfig?.maxHp || targetMonster.maxHp,
        };
        setMonster(restoredScarecrow);
        // 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(updatedPlayer);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(
          ticked,
          restoredScarecrow,
          getEffectivePlayerStats
        );
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setMonster(monsterAfterPet);
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      } else if (type === "defeat") {
        addLog(`😊 허수아비에게 패배했습니다. 체력이 회복됩니다.`, "normal");
        const recoveredPlayer = { ...updatedPlayer, hp: updatedPlayer.maxHp };
        setPlayer(recoveredPlayer);
        // 허수아비 HP 회복
        const restoredScarecrow: CharacterStats = {
          ...targetMonster,
          hp: scarecrowConfig?.maxHp || targetMonster.maxHp,
        };
        setMonster(restoredScarecrow);
        setIsPlayerTurn(true);
        setIsProcessing(false);
        return;
      }
    }

    setConsecutiveMisses(0);
    setRecoveryCharges(5);
    let playerAfterBattle = { ...updatedPlayer };
    const logs: Omit<LogMessage, "id">[] = [];

		let didDropItem = false;

    if (type === "victory" && targetMonster) {
      logs.push({
        msg: `🎉 전투에서 승리했다! ${targetMonster.name}을(를) 물리쳤다.`,
        type: "vic",
      });
      playerAfterBattle.vicCount += 1;

			// 일반 몬스터 아이템 드롭
			const DROP_CHANCE = 5; 
      
      if (getRandom(1, 100) <= DROP_CHANCE && normalDropPool.length > 0) {
        didDropItem = true;
        const rewardItem = normalDropPool[getRandom(0, normalDropPool.length - 1)];

        const ownedList = rewardItem.type === "weapon"
            ? playerAfterBattle.ownedWeaponIds || []
            : playerAfterBattle.ownedArmorIds || [];
        const isDuplicate = ownedList.includes(rewardItem.id);

        const isUsable = 
					(!rewardItem.allowedJobs || rewardItem.allowedJobs.includes(playerAfterBattle.job)) &&
          (!rewardItem.requiredLevel || playerAfterBattle.level >= rewardItem.requiredLevel);

        const sellPrice = Math.floor(rewardItem.price * 0.5);

        // 데이터는 bossReward 상태를 재사용하지만,
        setBossReward({ item: rewardItem, isDuplicate, isUsable, sellPrice });
        
        // 🚨 상태는 'normalDrop'으로 설정하여 다른 모달을 띄웁니다!
        setGameState("normalDrop"); 
        
        setShowBattleChoice(false);
        
        logs.push({
          msg: `🎁 몬스터가 [${rewardItem.name}]을(를) 떨어뜨렸습니다!`,
          type: "lvup",
        });
      }

      // 처치 횟수 갱신
      if (currentDungeonId) {
        const newCount = (dungeonKillCounts[currentDungeonId] || 0) + 1;
        setDungeonKillCounts((prev) => ({
          ...prev,
          [currentDungeonId!]: newCount,
        }));
        localStorage.setItem(
          "dungeonKillCounts",
          JSON.stringify({ ...dungeonKillCounts, [currentDungeonId]: newCount })
        );
      }

      const gainedExp = getRandom(5, 30) + targetMonster.level * 60;
      const gainedGold = getRandom(10, 50) + targetMonster.level * 30;

      playerAfterBattle.exp += gainedExp;
      playerAfterBattle.money += gainedGold;
      logs.push({ msg: `👑 ${gainedExp} Exp를 획득했다.`, type: "gainExp" });
      logs.push({
        msg: `💰 ${gainedGold} Gold를 획득했다.`,
        type: "gainMoney",
      });

      const levelUpResult = checkLevelUp(playerAfterBattle); // 순수 로직
      playerAfterBattle = levelUpResult.newPlayer;
      logs.push(...levelUpResult.logs);
    } else if (type === "defeat") {
      logs.push({ msg: `☠️ 전투에서 패배했다...`, type: "def" });
      playerAfterBattle.defCount += 1;
      playerAfterBattle.exp = Math.floor(playerAfterBattle.exp * 0.7);
      playerAfterBattle.hp = playerAfterBattle.maxHp;
      logs.push({
        msg: `😥 잠시 쉬고 일어나 체력을 모두 회복했다.`,
        type: "normal",
      });
    } else if (type === "escape") {
      logs.push({ msg: `💨 전투에서 도망쳤다...`, type: "fail" });
    }
    addLogs(logs);
    setPlayer(playerAfterBattle);
    setMonster(null);
    setBoss(null);
    setIsProcessing(false);
    setIsPlayerTurn(true);

    // 승리 시에만 계속/나가기 선택 표시, 패배/도망 시에는 던전으로 복귀
    if (type === "victory") {
      setShowBattleChoice(true);
    } else {
      setGameState("dungeon");
      setCurrentDungeonId(null);
    }
  };

  const handleContinueBattle = () => {
    setShowBattleChoice(false);
    handleNextDungeon(); // 현재 던전 ID (currentDungeonId) 기준으로 다음 몬스터
  };

  const handleExitDungeon = () => {
    setShowBattleChoice(false);
    setGameState("dungeon"); // 던전 선택 화면으로
    setCurrentDungeonId(null);
    setCurrentBossDungeonId(null);
    addLog("던전에서 퇴장했습니다.", "normal");
  };

  // 게임 시작
  const gameStart = (name: string, job: Job) => {
    const newPlayer = createNewPlayer(name, job); // 순수 로직
    setPlayer(newPlayer);
    setGameState("dungeon");
    addLog(`🥾 ${newPlayer.name} (${newPlayer.job}) (이)가 모험을 시작했다...`);
  };

  // 던전 선택 및 액션
  const handleSelectDungeon = (dungeonId: string) => {
    const dungeon = dungeons.find((d) => d.id === dungeonId); // ⚠️ 누락된 변수 정의
    if (!player || !dungeon) return;
    if (player.level < dungeon.requiredLevel) {
      addLog(
        `🚫 레벨이 부족하여 입장할 수 없습니다. (필요 레벨: ${dungeon.requiredLevel})`,
        "fail"
      );
      return;
    }
    setCurrentDungeonId(dungeonId);
    setGameState("dungeon");
    addLog(`--- ${dungeon.icon} ${dungeon.name} ---`, "normal");
    handleNextDungeon(dungeon);
  };

  const handleSelectBossDungeon = (bossDungeonId: string) => {
    const bossDungeon = bossDungeons.find((b) => b.id === bossDungeonId); // ⚠️ 누락된 변수 정의
    if (!player || !bossDungeon) return;
    const cooldown = bossCooldowns[bossDungeonId] || 0;
    if (cooldown > Date.now()) {
      addLog(`🚫 쿨타임이 남아 입장할 수 없습니다.`, "fail");
      return;
    }
    if (player.level < bossDungeon.requiredLevel) {
      addLog(
        `🚫 레벨이 부족하여 입장할 수 없습니다. (필요 레벨: ${bossDungeon.requiredLevel})`,
        "fail"
      );
      return;
    }
    setCurrentBossDungeonId(bossDungeonId);
    setGameState("battle");
    addLog(`--- ${bossDungeon.icon} 보스 [${bossDungeon.name}] ---`, "appear");

    const newBoss = createBoss(bossDungeon.bossLevel); // 순수 로직 (constants.ts에서)
    setBoss(newBoss);
    setMonster(null); // 일반 몬스터 제거

    // 선공 판정
    setIsPlayerTurn(false); // 보스 선공
    addLog(`보스의 기운에 압도당했습니다. 보스가 먼저 행동합니다.`, "fail");
    runBossTurn(player, newBoss);
  };

  const handleOpenDungeonSelect = () => setGameState("dungeonSelect");
  const handleCloseDungeonSelect = () => setGameState("dungeon");
  const handleOpenBossSelect = () => setGameState("bossSelect");
  const handleCloseBossSelect = () => setGameState("dungeon");

  const handleNextDungeon = (selectedDungeon?: Dungeon) => {
    if (isProcessing || !player) return;

    const dungeon =
      selectedDungeon || dungeons.find((d) => d.id === currentDungeonId); // ⚠️ 누락된 변수 정의
    if (!dungeon) {
      addLog("🚫 입장할 던전을 찾을 수 없습니다.", "fail");
      setGameState("dungeonSelect");
      return;
    }

    addLog("🧭 던전 안을 향해 들어가본다...");
    setIsProcessing(true);
    setGameState("battle"); // 전투 상태로 변경
    setShowBattleChoice(false); // 선택지 숨김

    const killCount = dungeonKillCounts[dungeon.id] || 0; // ⚠️ 누락된 변수 정의
    const shouldSpawnNamedMonster = killCount > 0 && killCount % 5 === 0; // ⚠️ 누락된 변수 정의

    setTimeout(() => {
      let newMonster: CharacterStats;
      if (shouldSpawnNamedMonster) {
        const baseMonster = makeMonster(dungeon.monsterLevelOffset); // 순수 로직

        newMonster = {
          ...baseMonster,
          name: `[네임드] ${baseMonster.name}`,
          hp: Math.floor(baseMonster.hp * 1.5),
          maxHp: Math.floor(baseMonster.hp * 1.5),
          atk: Math.floor(baseMonster.atk * 1.2),
          def: Math.floor(baseMonster.def * 1.2),
        };
        addLog(`✨ [${newMonster.name}] (이)가 나타났다!`, "appear");
      } else {
        newMonster = makeMonster(dungeon.monsterLevelOffset); // 순수 로직
        addLog(`👻 ${newMonster.name} (이)가 나타났다!`, "appear");
      }
      setMonster(newMonster);
      setBoss(null); // 보스 제거

      // 선공 판정
      if (getRandom(1, 100) <= 50) {
        addLog(`😁 선빵필승! 먼저 공격합니다.`, "normal");
        setIsPlayerTurn(true);
        setIsProcessing(false);
      } else {
        addLog(`😰 칫! 기습인가? 몬스터가 먼저 공격합니다.`, "fail");
        setIsPlayerTurn(false);
        runMonsterTurn(player, newMonster);
      }
    }, 1000);
  };

  const handleDungeonRecovery = () => {
    if (isProcessing || !player) return;

    let newHp = player.hp + Math.floor(player.maxHp * 0.4); // 최대 체력의 40% 회복
    if (newHp > player.maxHp) {
      newHp = player.maxHp;
    }

    if (player.hp === newHp) {
      addLog(`😊 이미 체력이 가득 찼다. (HP: ${newHp})`, "normal");
      return;
    }

    setPlayer({ ...player, hp: newHp });
    addLog(`😊 체력을 회복했다. (HP: ${newHp})`, "normal");
  };

  // 전투 액션
  const handleAttack = () => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;
    setIsPlayerTurn(false);
    setIsProcessing(true);

    const effectivePlayer = getEffectivePlayerStats(player); // 순수 로직
    const defenderStats = boss
      ? (boss as CharacterStats)
      : (monster as CharacterStats);

    let defenderBuffs = boss ? boss.activeBuffs || [] : []; // 몬스터는 버프 없음

    const isBonusAttack = consecutiveMisses >= 3;

    // 차지/트루 스트라이크 버프 처리
    let chargedStats = { ...effectivePlayer };
    let logs: Omit<LogMessage, "id">[] = [];

    const chargeIdx = (player.activeBuffs || []).findIndex(
      (b) => b.chargeAttackMultiplier
    );
    if (chargeIdx >= 0) {
      const buff = player.activeBuffs![chargeIdx];
      chargedStats.atk = Math.floor(
        chargedStats.atk * (1 + buff.chargeAttackMultiplier!)
      );
      logs.push({
        msg: `🔥 [${buff.key}] 스킬 효과! 공격력 증폭!`,
        type: "vic",
      });
    }
    const trueStrikeIdx = (player.activeBuffs || []).findIndex(
      (b) => b.trueStrikeNext
    );
    if (trueStrikeIdx >= 0) {
      defenderStats.def = 0; // 방어 무시
      logs.push({
        msg: `🎯 [${
          player.activeBuffs![trueStrikeIdx].key
        }] 스킬 효과! 방어 무시!`,
        type: "vic",
      });
    }

    addLogs(logs); // 차지/트루 스트라이크 로그 먼저 출력

    if (boss) {
      const barrierIdx = defenderBuffs.findIndex((b) => b.barrier);
      if (barrierIdx >= 0) {
        const skillName = defenderBuffs[barrierIdx].key;
        addLog(`🛡️ 몬스터의 [${skillName}] 스킬이 공격을 무효화했다!`, "fail");
        const nextBuffs = [...defenderBuffs];
        nextBuffs.splice(barrierIdx, 1);

        // 1. 새로운 boss 객체를 변수로 생성
        const updatedBoss = { ...boss, activeBuffs: nextBuffs };

        // 2. setBoss와 runBossTurn에 *동일한* 새 객체를 전달
        setBoss(updatedBoss);
        runBossTurn(player, updatedBoss); // 턴 넘김
        return;
      }

      const hasEvade = defenderBuffs.some((b) => b.evadeAll);
      if (hasEvade) {
        addLog(`🍃 몬스터가 스킬 효과로 공격을 회피했다!`, "fail");
        runBossTurn(player, boss); // (이 코드는 보스 상태 변경이 없으므로 그대로 둬도 됩니다)
        return;
      }
    }

    let result = calculateAttack(chargedStats, defenderStats, isBonusAttack); // 순수 로직
    addLogs(result.logs);

    const updatedDefender = result.defender;
    // const updatedAttacker = result.attacker; // (현재는 변경사항 없음)

    if (boss) {
      setBoss(updatedDefender as BossStats);
    } else {
      setMonster(updatedDefender);
    }

    // 빗나감 카운터
    if (result.didHit) {
      setConsecutiveMisses(0);
    } else {
      const newMissCount = consecutiveMisses + 1;
      setConsecutiveMisses(newMissCount);
      if (newMissCount >= 3) {
        addLog(
          `😡 집중력이 한계에 달했다. 다음 공격은 반드시 명중한다!`,
          "cri"
        );
      }
    }

    // 버프 제거
    let playerAfterAttack = { ...player };
    if (chargeIdx >= 0) {
      const nextBuffs = [...(playerAfterAttack.activeBuffs || [])];
      nextBuffs.splice(chargeIdx, 1);
      playerAfterAttack.activeBuffs = nextBuffs;
    }
    if (trueStrikeIdx >= 0) {
      const nextBuffs = [...(playerAfterAttack.activeBuffs || [])];
      nextBuffs.splice(trueStrikeIdx, 1);
      playerAfterAttack.activeBuffs = nextBuffs;
    }
    setPlayer(playerAfterAttack); // (중요) 턴 넘기기 전에 버프 제거된 플레이어 상태 반영

    if (result.isBattleOver) {
      // 허수아비 전투인 경우 체력 무한 (자동 회복)
      if (isScarecrowBattle && !boss) {
        addLog(
          `🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`,
          "vic"
        );
        const restoredScarecrow: CharacterStats = {
          ...updatedDefender,
          hp: scarecrowConfig?.maxHp || updatedDefender.maxHp,
        };
        setMonster(restoredScarecrow);
        // 플레이어 턴으로 전환
        addLog(`--- 플레이어의 턴 ---`, "normal");
        const ticked = tickSkills(playerAfterAttack);
        const {
          player: playerAfterPet,
          monster: monsterAfterPet,
          logs: petLogs,
        } = applyPetStartOfTurn(
          ticked,
          restoredScarecrow,
          getEffectivePlayerStats
        );
        addLogs(petLogs);
        setPlayer(playerAfterPet);
        setMonster(monsterAfterPet);
        setIsPlayerTurn(true);
        setIsProcessing(false);
      } else if (boss) {
        handleBossBattleEnd(
          "victory",
          playerAfterAttack,
          updatedDefender as BossStats
        );
      } else {
        handleBattleEnd("victory", playerAfterAttack, updatedDefender);
      }
      setIsProcessing(false);
    } else {
      if (boss) {
        runBossTurn(playerAfterAttack, updatedDefender as BossStats);
      } else {
        runMonsterTurn(playerAfterAttack, updatedDefender);
      }
    }
  };

  const handleDefend = () => {
    if (isProcessing || !isPlayerTurn || !player) return;
    setIsPlayerTurn(false);
    setIsProcessing(true);
    addLog(`🛡️ 방어 태세를 취합니다. 받는 데미지가 50% 감소합니다.`, "normal");

    const defendedPlayer = { ...player, isDefending: true };
    setPlayer(defendedPlayer);

    if (boss) {
      runBossTurn(defendedPlayer, boss);
    } else if (monster) {
      runMonsterTurn(defendedPlayer, monster);
    }
  };

  const handleRecovery = () => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;

    if (recoveryCharges <= 0) {
      addLog(`🚫 회복 횟수를 모두 사용했다! (남은 횟수: 0)`, "fail");
      return;
    }

    setIsPlayerTurn(false); // 턴 종료
    setIsProcessing(true);

    let newHp = player.hp + Math.floor(player.maxHp * 0.6); // 60% 회복
    if (newHp > player.maxHp) {
      newHp = player.maxHp;
    }

    const newCharges = recoveryCharges - 1;
    setRecoveryCharges(newCharges); // 횟수 차감

    if (player.hp === newHp) {
      addLog(
        `😊 이미 체력이 가득 찼다. (HP: ${newHp}, 남은 횟수: ${newCharges})`,
        "normal"
      );
    } else {
      addLog(
        `😊 체력을 회복했다. (HP: ${newHp}, 남은 횟수: ${newCharges})`,
        "normal"
      );
    }

    const recoveredPlayer = { ...player, hp: newHp };
    setPlayer(recoveredPlayer);

    if (boss) {
      runBossTurn(recoveredPlayer, boss);
    } else if (monster) {
      runMonsterTurn(recoveredPlayer, monster);
    }
  };

  const handleUseSkill = (key: SkillKey) => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;
    const skill = allSkills.find((s) => s.key === key);
    if (!skill) return;

    const cd = (player.skillCooldowns || {})[key] || 0;
    if (cd > 0) {
      addLog(
        `🚫 [${skill.name}] 스킬은 쿨타임 중입니다. (${cd}턴 남음)`,
        "fail"
      );
      return;
    }

    setIsPlayerTurn(false);
    setIsProcessing(true);
    addLog(`✨ [${skill.name}] 스킬 사용!`, "vic");

    let updatedPlayer = { ...player };
    let updatedDefender = boss
      ? ({ ...boss } as BossStats)
      : ({ ...monster } as CharacterStats);
    let logs: Omit<LogMessage, "id">[] = [];

    // 쿨다운 설정
    const newCooldowns = {
      ...(updatedPlayer.skillCooldowns || {}),
      [key]: skill.cooldown,
    };
    updatedPlayer.skillCooldowns = newCooldowns;

    // 스킬 효과 적용
    if (skill.kind === "buff") {
      const newBuff = {
        key: skill.key,
        remainingTurns: skill.duration || 1,
        bonuses: skill.bonuses || {},
        evadeAll: skill.effect?.type === "evade",
        reflectPercent:
          skill.effect?.type === "reflect" ? skill.effect.value : 0,
        barrier: skill.effect?.type === "barrier",
        chargeAttackMultiplier:
          skill.effect?.type === "charge" ? skill.effect.value : 0,
        counterDamage:
          skill.effect?.type === "counter" ? skill.effect.value : 0,
        lifeStealPercent:
          skill.effect?.type === "lifesteal" ? skill.effect.value : 0,
        weakenPercent: skill.effect?.type === "weaken" ? skill.effect.value : 0,
        multiStrikeNext: skill.effect?.type === "multiStrike",
        trueStrikeNext: skill.effect?.type === "trueStrike",
      };
      updatedPlayer.activeBuffs = [
        ...(updatedPlayer.activeBuffs || []),
        newBuff,
      ];
    }

    if (skill.effect?.type === "timeStop") {
      addLog(
        `⏰ 시간이 멈췄습니다! 플레이어 턴을 즉시 다시 시작합니다.`,
        "vic"
      );
      const ticked = tickSkills(updatedPlayer);
      const {
        player: playerAfterPet,
        monster: monsterAfterPet,
        logs: petLogs,
      } = applyPetStartOfTurn(ticked, updatedDefender, getEffectivePlayerStats);
      addLogs(petLogs);
      setPlayer(playerAfterPet);
      if (boss) setBoss(monsterAfterPet as BossStats);
      else setMonster(monsterAfterPet);

      setIsPlayerTurn(true);
      setIsProcessing(false);
      return;
    }

    if (skill.effect?.type === "stun") {
      logs.push({
        msg: `💫 [${skill.name}] 스킬 효과! 적이 ${skill.effect.value}턴간 기절합니다!`,
        type: "vic",
      });
      updatedPlayer.monsterStunnedTurns =
        (updatedPlayer.monsterStunnedTurns || 0) + skill.effect.value;
    }

    // 공격형 스킬 처리
    if (skill.kind === "attack" && skill.effect?.type !== "stun") {
      const effectivePlayer = getEffectivePlayerStats(updatedPlayer);
      const result = calculateAttack(
        effectivePlayer,
        updatedDefender,
        skill.guaranteedCrit
      );
      logs.push(...result.logs);
      updatedDefender = result.defender;
      if (result.isBattleOver) {
        addLogs(logs);
        setPlayer(updatedPlayer);
        // 허수아비 전투인 경우 체력 무한 (자동 회복)
        if (isScarecrowBattle && !boss) {
          addLog(
            `🎯 허수아비를 쓰러뜨렸지만, 허수아비는 즉시 회복됩니다!`,
            "vic"
          );
          const restoredScarecrow: CharacterStats = {
            ...updatedDefender,
            hp: scarecrowConfig?.maxHp || updatedDefender.maxHp,
          };
          setMonster(restoredScarecrow);
          // 플레이어 턴으로 전환
          addLog(`--- 플레이어의 턴 ---`, "normal");
          const ticked = tickSkills(updatedPlayer);
          const {
            player: playerAfterPet,
            monster: monsterAfterPet,
            logs: petLogs,
          } = applyPetStartOfTurn(
            ticked,
            restoredScarecrow,
            getEffectivePlayerStats
          );
          addLogs(petLogs);
          setPlayer(playerAfterPet);
          setMonster(monsterAfterPet);
          setIsPlayerTurn(true);
          setIsProcessing(false);
        } else if (boss) {
          setBoss(updatedDefender as BossStats);
          handleBossBattleEnd(
            "victory",
            updatedPlayer,
            updatedDefender as BossStats
          );
        } else {
          setMonster(updatedDefender);
          handleBattleEnd("victory", updatedPlayer, updatedDefender);
        }
        setIsProcessing(false);
        return;
      }
    }

    addLogs(logs);
    setPlayer(updatedPlayer);
    if (boss) setBoss(updatedDefender as BossStats);
    else setMonster(updatedDefender);

    // 턴 종료
    if (boss) {
      runBossTurn(updatedPlayer, updatedDefender as BossStats);
    } else {
      runMonsterTurn(updatedPlayer, updatedDefender);
    }
  };

  const handleEscape = () => {
    if (isProcessing || !isPlayerTurn || !player || !(monster || boss)) return;
    setIsPlayerTurn(false);
    setIsProcessing(true);
    addLog(`🤫 도망을 시도합니다...`, "normal");

    const effectivePlayer = getEffectivePlayerStats(player); // 순수 로직
    const defender = boss
      ? (boss as CharacterStats)
      : (monster as CharacterStats);

    let escapeRate = 50;
    if (effectivePlayer.luk >= defender.luk * 2) {
      escapeRate = 100;
    }

    setTimeout(() => {
      if (getRandom(1, 100) <= escapeRate) {
        if (boss) handleBossBattleEnd("escape", player);
        else handleBattleEnd("escape", player);
      } else {
        addLog(`😥 도망치는 데 실패했다...`, "fail");
        if (boss) runBossTurn(player, boss);
        else runMonsterTurn(player, monster!);
      }
    }, 1000);
  };

  // 상점/스킬/강화소 액션
  const handleEnterShop = () => setGameState("shop");
  const handleExitShop = () => setGameState("dungeon");
  const handleOpenSkills = () => setIsSkillsOpen(true);
  const handleCloseSkills = () => setIsSkillsOpen(false);

  const handleBuyItem = (item: EquipmentItem) => {
    if (!player) return;
    if (player.money < item.price) {
      addLog(`💰 골드가 부족합니다. (필요: ${item.price} G)`, "fail");
      return;
    }

		// 레벨 제한 확인
    if (item.requiredLevel && player.level < item.requiredLevel) {
      addLog(`🚫 레벨이 부족하여 구매할 수 없습니다. (필요 Lv.${item.requiredLevel})`, 'fail');
      return;
    }

    const jobCanUse =
      !item.allowedJobs || item.allowedJobs.includes(player.job);
    if (!jobCanUse) {
      addLog(`🚫 직업 제한으로 구매할 수 없습니다.`, "fail");
      return;
    }

    const newPlayer = { ...player, money: player.money - item.price };
    if (item.type === "weapon") {
      newPlayer.ownedWeaponIds = [...(newPlayer.ownedWeaponIds || []), item.id];
    } else {
      newPlayer.ownedArmorIds = [...(newPlayer.ownedArmorIds || []), item.id];
    }
    setPlayer(newPlayer);
    addLog(`✨ ${item.name}을(를) 구매했습니다!`, "gainMoney");
  };

  const handleBuyPet = (petId: string) => {
    if (!player) return;
    const pet = petShopList.find((p) => p.id === petId);
    if (!pet) return;
    if (player.money < pet.price) {
      addLog(`💰 골드가 부족합니다. (필요: ${pet.price} G)`, "fail");
      return;
    }
    setPlayer({
      ...player,
      money: player.money - pet.price,
      ownedPetIds: [...(player.ownedPetIds || []), pet.id],
    });
    addLog(`✨ ${pet.icon} ${pet.name}을(를) 구매했습니다!`, "gainMoney");
  };

  const handleEquipWeapon = (id: string) => {
    if (!player) return;
    const item =
      weaponShopList.find((w) => w.id === id) ||
      (id === STARTER_CLUB.id ? STARTER_CLUB : null);

    if (!item) return;

		// 레벨 제한 확인
    if (item.requiredLevel && player.level < item.requiredLevel) {
      addLog(`🚫 레벨이 부족하여 장착할 수 없습니다. (필요 Lv.${item.requiredLevel})`, 'fail');
      return;
    }

    const jobCanUse =
      !item.allowedJobs || item.allowedJobs.includes(player.job);
    if (!jobCanUse) {
      addLog(`🚫 직업 제한으로 장착할 수 없습니다.`, "fail");
      return;
    }
    setPlayer({ ...player, weapon: item });
    addLog(`⚔️ ${item.name}을(를) 장착했습니다.`, "normal");
  };

  const handleEquipArmor = (id: string) => {
    if (!player) return;
    const item = armorShopList.find((a) => a.id === id);

    if (!item) return;

		// 레벨 제한 확인
    if (item.requiredLevel && player.level < item.requiredLevel) {
      addLog(`🚫 레벨이 부족하여 장착할 수 없습니다. (필요 Lv.${item.requiredLevel})`, 'fail');
      return;
    }

    const jobCanUse =
      !item.allowedJobs || item.allowedJobs.includes(player.job);
    if (!jobCanUse) {
      addLog(`🚫 직업 제한으로 장착할 수 없습니다.`, "fail");
      return;
    }
    setPlayer({ ...player, armor: item });
    addLog(`🛡️ ${item.name}을(를) 장착했습니다.`, "normal");
  };

  const handleEquipPet = (id: string) => {
    if (!player) return;
    const pet = petShopList.find((p) => p.id === id);
    if (!pet) return;
    setPlayer({ ...player, pet: pet });
    addLog(`🐾 ${pet.icon} ${pet.name}을(를) 장착했습니다.`, "normal");
  };

  const handleUnequipWeapon = () => {
    if (!player) return;
    setPlayer({ ...player, weapon: null });
    addLog(`⚔️ 무기를 해제했습니다.`, "normal");
  };

  const handleUnequipArmor = () => {
    if (!player) return;
    setPlayer({ ...player, armor: null });
    addLog(`🛡️ 방어구를 해제했습니다.`, "normal");
  };

  const handleUnequipPet = () => {
    if (!player) return;
    setPlayer({ ...player, pet: null });
    addLog(`🐾 펫을 해제했습니다.`, "normal");
  };

  const handleOpenPetEnhance = () => setGameState("weaponEnhance");
  const handleOpenWeaponEnhance = () => setGameState("weaponEnhance");
  const handleCloseEnhance = () => setGameState("dungeon");
  const handleOpenScarecrow = () => {
    setGameState("scarecrow");
    setIsScarecrowBattle(false);
  };
  const handleCloseScarecrow = () => {
    setGameState("dungeon");
    setIsScarecrowBattle(false);
    setScarecrowConfig(null);
    setMonster(null);
    setBoss(null);
  };

  // 허수아비 전투 시작
  const handleStartScarecrowBattle = (config: {
    atk: number;
    def: number;
    luk: number;
  }) => {
    if (!player) return;
    // 허수아비는 체력이 무한이므로 maxHp를 큰 값으로 설정
    const maxHp = 999999;
    setScarecrowConfig({ maxHp, ...config });
    setIsScarecrowBattle(true);

    const scarecrow: CharacterStats = {
      name: "허수아비",
      level: 1,
      hp: maxHp,
      maxHp: maxHp,
      atk: config.atk,
      def: config.def,
      luk: config.luk,
    };

    setMonster(scarecrow);
    setBoss(null);
    setGameState("battle");
    setIsPlayerTurn(true);
    setIsProcessing(false);
    setConsecutiveMisses(0);
    setRecoveryCharges(5);
    addLog(`🎯 허수아비 훈련장에 입장했습니다.`, "normal");
    addLog(`--- 플레이어의 턴 ---`, "normal");
  };

  // 허수아비 전투 종료 (나가기)
  const handleExitScarecrowBattle = () => {
    if (!player) return;
    // 플레이어 HP 회복
    const recoveredPlayer = { ...player, hp: player.maxHp };
    setPlayer(recoveredPlayer);
    addLog(
      `😊 허수아비 훈련장에서 나왔습니다. 체력이 모두 회복되었습니다.`,
      "normal"
    );

    setIsScarecrowBattle(false);
    setScarecrowConfig(null);
    setMonster(null);
    setBoss(null);
    setGameState("dungeon"); // 던전 화면으로 돌아감
    setIsPlayerTurn(true);
    setIsProcessing(false);
  };

	// 전투 스킬 메뉴 토글 함수
	const handleToggleBattleSkills = () => {
    setIsBattleSkillOpen(prev => !prev);
  };

  const getPetEnhanceCost = (level: number) => 100 + level * 100;
  const handleEnhancePet = () => {
    if (!player || !player.pet) {
      addLog("🚫 강화할 펫을 먼저 장착해주세요.", "fail");
      return;
    }
    const level = (player.petEnhanceLevels || {})[player.pet.id] || 0;
    const cost = getPetEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, "fail");
      return;
    }
    const newLevel = level + 1;
    setPlayer({
      ...player,
      money: player.money - cost,
      petEnhanceLevels: {
        ...(player.petEnhanceLevels || {}),
        [player.pet.id]: newLevel,
      },
    });
    addLog(
      `✨ ${player.pet.icon} ${player.pet.name} 강화 성공! [${newLevel}강]`,
      "vic"
    );
  };

  const getArmorEnhanceCost = (level: number) => 150 + level * 150;
  const handleEnhanceArmor = () => {
    if (!player || !player.armor) {
      addLog("🚫 강화할 방어구를 먼저 장착해주세요.", "fail");
      return;
    }
    const level = (player.armorEnhanceLevels || {})[player.armor.id] || 0;
    const cost = getArmorEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, "fail");
      return;
    }
    const newLevel = level + 1;
    setPlayer({
      ...player,
      money: player.money - cost,
      armorEnhanceLevels: {
        ...(player.armorEnhanceLevels || {}),
        [player.armor.id]: newLevel,
      },
    });
    addLog(`✨ ${player.armor.name} 강화 성공! [${newLevel}강]`, "vic");
  };

  const getWeaponEnhanceCost = (level: number) => 150 + level * 150;
  const handleEnhanceWeapon = () => {
    if (!player || !player.weapon) {
      addLog("🚫 강화할 무기를 먼저 장착해주세요.", "fail");
      return;
    }
    const level = (player.weaponEnhanceLevels || {})[player.weapon.id] || 0;
    const cost = getWeaponEnhanceCost(level);
    if (player.money < cost) {
      addLog(`💰 골드가 부족합니다. (필요: ${cost} G)`, "fail");
      return;
    }
    const newLevel = level + 1;
    setPlayer({
      ...player,
      money: player.money - cost,
      weaponEnhanceLevels: {
        ...(player.weaponEnhanceLevels || {}),
        [player.weapon.id]: newLevel,
      },
    });
    addLog(`✨ ${player.weapon.name} 강화 성공! [${newLevel}강]`, "vic");
  };

  // 보스 보상 액션
  const handleBossRewardAction = (
    action: "equip" | "sell" | "ignore",
    reward: BossReward
  ) => {
    if (!player) return;
    let updatedPlayer = { ...player };
    const logs: Omit<LogMessage, "id">[] = [];

    // 아이템 소유권 처리 헬퍼
    const grantOwnership = (
      p: PlayerStats,
      item: EquipmentItem
    ): PlayerStats => {
      if (item.type === "weapon") {
        if (!(p.ownedWeaponIds || []).includes(item.id)) {
          p.ownedWeaponIds = [...(p.ownedWeaponIds || []), item.id];
        }
      } else if (item.type === "armor") {
        if (!(p.ownedArmorIds || []).includes(item.id)) {
          p.ownedArmorIds = [...(p.ownedArmorIds || []), item.id];
        }
      }
      return p;
    };

    if (action === "equip") {
      logs.push({
        msg: `✨ ${reward.item.name}을(를) 장착했습니다!`,
        type: "vic",
      });

      // 기존 장비가 '나무 몽둥이'가 아닐 경우에만 판매
      const oldItem =
        reward.item.type === "weapon"
          ? updatedPlayer.weapon
          : updatedPlayer.armor;
      if (oldItem && oldItem.id !== STARTER_CLUB.id) {
        const oldItemSellPrice = Math.floor(oldItem.price * 0.5);
        logs.push({
          msg: `🛡️ 기존 장비 ${oldItem.name}을(를) 판매하여 ${oldItemSellPrice} G를 획득했습니다.`,
          type: "gainMoney",
        });
        updatedPlayer.money += oldItemSellPrice;
      }

      // 새 아이템 장착 및 소유
      updatedPlayer = grantOwnership(updatedPlayer, reward.item);
      if (reward.item.type === "weapon") {
        updatedPlayer.weapon = reward.item;
      } else if (reward.item.type === "armor") {
        updatedPlayer.armor = reward.item;
      }
    } else if (action === "sell") {
      logs.push({
        msg: `💰 ${reward.item.name}을(를) ${reward.sellPrice} G에 판매했습니다.`,
        type: "gainMoney",
      });
      updatedPlayer.money += reward.sellPrice;
      // 판매 시에는 소유권 목록에 추가하지 않음 (다시 드롭될 수 있음)
    } else if (action === "ignore") {
      logs.push({
        msg: `아이템 ${reward.item.name}을(를) 무시했습니다. (소유 목록에 추가)`,
        type: "fail",
      });
      // 무시할 경우 소유권 목록에 추가 (중복 드롭 방지)
      updatedPlayer = grantOwnership(updatedPlayer, reward.item);
    }

    addLogs(logs);
    setPlayer(updatedPlayer);
    setBossReward(null);
    setShowBattleChoice(false);
    setGameState("dungeon");
    setCurrentBossDungeonId(null); // 보스 던전 ID 초기화하여 홈으로 복귀
  };

  const handleKeyDown = (key: string) => {
    if (isProcessing) return;

    if (isSkillsOpen) {
      if (key === "k" || key === "q") handleCloseSkills();
      return; // 모달이 열려있으면 다른 키 입력 무시
    }

    if (gameState === "dungeon") {
      if (!showBattleChoice) {
        if (key === "s") handleOpenDungeonSelect(); // 던전 탐험
        if (key === "b") handleOpenBossSelect(); // 보스 던전
        if (key === "r") handleDungeonRecovery(); // 휴식
        if (key === "h") handleEnterShop(); // 상점 (h)
        if (key === "k") handleOpenSkills(); // 스킬
        if (key === "p") handleOpenPetEnhance(); // 펫 강화 (강화소로 통합)
        if (key === "w") handleOpenWeaponEnhance(); // 강화소
        if (key === "t") handleOpenScarecrow(); // 허수아비 (Training dummy)
      }
    } else if (gameState === "battle") {
      if (showBattleChoice) {
        // 전투 후 선택지 (C, X)
        if (key === "c") handleContinueBattle();
        if (key === "x") handleExitDungeon();
      } else if (isPlayerTurn) {
        // 3-1. 스킬 메뉴가 열려있을 때 (숫자키 입력)
        if (isBattleSkillOpen) {
          const num = parseInt(key);
          // 숫자 1~9 키 입력 확인
          if (!isNaN(num) && num >= 1 && num <= 9) {
            const skillIndex = num - 1;
            // 현재 플레이어가 배운 스킬 목록
            const playerSkills = player?.skills || [];
            if (skillIndex < playerSkills.length) {
              // 해당 슬롯의 스킬 사용
              handleUseSkill(playerSkills[skillIndex]);
              // 스킬 사용 후 메뉴 닫기
              setIsBattleSkillOpen(false); 
            }
          }
          // 메뉴 닫기 (K, Q, ESC)
          if (key === 'k' || key === 'q' || key === 'escape') {
            setIsBattleSkillOpen(false);
          }
        } 
        // 3-2. 스킬 메뉴가 닫혀있을 때 (기본 단축키)
        else {
          if (key === "a") handleAttack();
          if (key === "d") handleDefend();
          if (key === "e") handleRecovery();
          if (key === "q") {
            if (isScarecrowBattle) {
              handleExitScarecrowBattle();
            } else {
              handleEscape();
            }
          }
          // 스킬 메뉴 열기 (K)
          if (key === "k") handleToggleBattleSkills();
        }
      }
    } else if (gameState === "shop") {
      if (key === "h" || key === "q") handleExitShop();
    } else if (gameState === "petEnhance" || gameState === "weaponEnhance") {
      if (key === "q") handleCloseEnhance();
    } else if (gameState === "scarecrow") {
      if (key === "q") handleCloseScarecrow();
    } else if (gameState === "dungeonSelect") {
      if (key === "q") handleCloseDungeonSelect();
    } else if (gameState === "bossSelect") {
      if (key === "q") handleCloseBossSelect();
    }
    // 보상 모달은 키보드 입력을 막습니다 (버튼 클릭만 허용)
  };

  return {
    player,
    monster: boss || monster,
    logMessages,
    gameState,
    isPlayerTurn,
    isProcessing,
    recoveryCharges,
    consecutiveMisses,
    skills: allSkills,
    isSkillsOpen,
    currentDungeonId,
    showBattleChoice,
    dungeons,
    bossDungeons,
    bossCooldowns,
    shopLists: {
      weapons: weaponShopList,
      armors: armorShopList,
      pets: petShopList,
    },
    bossReward,
    isDeveloperMode,
    isScarecrowBattle,
		isBattleSkillOpen,
    actions: {
      gameStart,
      handleSelectDungeon,
      handleSelectBossDungeon,
      handleOpenDungeonSelect,
      handleCloseDungeonSelect,
      handleOpenBossSelect,
      handleCloseBossSelect,
      handleNextDungeon,
      handleDungeonRecovery,
      handleAttack,
      handleDefend,
      handleRecovery,
      handleEscape,
      handleKeyDown,
      handleEnterShop,
      handleExitShop,
      handleBuyItem,
      handleBuyPet,
      handleEquipWeapon,
      handleEquipArmor,
      handleEquipPet,
      handleUnequipWeapon,
      handleUnequipArmor,
      handleUnequipPet,
      handleOpenPetEnhance,
      handleOpenWeaponEnhance,
      handleEnhanceArmor,
      handleCloseEnhance,
      handleEnhancePet,
      handleEnhanceWeapon,
      handleOpenScarecrow,
      handleCloseScarecrow,
      handleStartScarecrowBattle,
      handleExitScarecrowBattle,
      handleOpenSkills,
      handleCloseSkills,
      handleUseSkill,
      learnSkill,
      handleContinueBattle,
      handleExitDungeon,
      handleBossRewardAction,
      enableDeveloperMode,
      saveGameState,
      loadGameState,
      getSaveSlotInfo,
      deleteGameSlot,
      loadGameStateFromFile,
      loadGameStateFromText,
      resetAllBossCooldowns,
			handleToggleBattleSkills,
    },
  };
};
