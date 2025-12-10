import { useState } from "react";
import type { PlayerStats } from "../game/types";

interface EquipmentEnhanceScreenProps {
  player: PlayerStats;
  onClose: () => void;
  onEnhanceWeapon: () => void;
  onEnhanceArmor: () => void;
  onEnhancePet: () => void;
}

const EquipmentEnhanceScreen = ({
  player,
  onClose,
  onEnhanceWeapon,
  onEnhanceArmor,
  onEnhancePet,
}: EquipmentEnhanceScreenProps) => {
  const [selectedTab, setSelectedTab] = useState<"weapon" | "armor" | "pet">("weapon");

  const weapon = player.weapon;
  const armor = player.armor;
  const pet = player.pet;

  const weaponLevel = weapon
    ? (player.weaponEnhanceLevels || {})[weapon.id] || 0
    : 0;
  const armorLevel = armor
    ? (player.armorEnhanceLevels || {})[armor.id] || 0
    : 0;
  const petLevel = pet ? (player.petEnhanceLevels || {})[pet.id] || 0 : 0;

  const weaponCost = 150 + weaponLevel * 150;
  const armorCost = 150 + armorLevel * 150;
  const petCost = 100 + petLevel * 100;

  const weaponNextLevel = weaponLevel + 1;
  const armorNextLevel = armorLevel + 1;
  const petNextBonusPct = (petLevel + 1) * 5;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl font-stat"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">🔧 강화소</h2>
            <div className="text-lg">💰 {player.money} G</div>
          </div>

          {/* 탭 버튼 */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setSelectedTab("weapon")}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedTab === "weapon"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              무기
            </button>
            <button
              onClick={() => setSelectedTab("armor")}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedTab === "armor"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              방어구
            </button>
            <button
              onClick={() => setSelectedTab("pet")}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedTab === "pet"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              펫
            </button>
          </div>

          {/* 무기 강화 탭 */}
          {selectedTab === "weapon" && (
            <>
              {weapon ? (
                <div>
                  <div className="mb-2 text-lg font-semibold">
                    현재 무기: {weapon.name}
                  </div>
                  <div className="text-sm text-gray-700 mb-4">
                    현재 강화: {weaponLevel}단 (추가 ATK +{weaponLevel * 5})
                  </div>
                  <div className="rounded border p-4">
                    <div className="mb-2 font-medium">다음 강화 효과</div>
                    <div className="text-sm">
                      ATK +5 (강화 {weaponNextLevel}단)
                    </div>
                    <div className="mt-3 text-sm">
                      필요 골드: {weaponCost} G
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      onClick={onClose}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white"
                    >
                      닫기
                    </button>
                    <button
                      onClick={onEnhanceWeapon}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-blue-700 hover:text-white"
                      disabled={player.money < weaponCost}
                    >
                      강화
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    강화할 무기가 없습니다. 상점에서 먼저 무기를 구매하세요.
                  </div>
                  <div className="text-right">
                    <button
                      onClick={onClose}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 방어구 강화 탭 */}
          {selectedTab === "armor" && (
            <>
              {armor ? (
                <div>
                  <div className="mb-2 text-lg font-semibold">
                    현재 방어구: {armor.name}
                  </div>
                  <div className="text-sm text-gray-700 mb-4">
                    현재 강화: {armorLevel}단 (추가 DEF +{armorLevel * 5})
                  </div>
                  <div className="rounded border p-4">
                    <div className="mb-2 font-medium">다음 강화 효과</div>
                    <div className="text-sm">
                      DEF +5 (강화 {armorNextLevel}단)
                    </div>
                    <div className="mt-3 text-sm">필요 골드: {armorCost} G</div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      onClick={onClose}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white"
                    >
                      닫기
                    </button>
                    <button
                      onClick={onEnhanceArmor}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-blue-700 hover:text-white"
                      disabled={player.money < armorCost}
                    >
                      강화
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    강화할 방어구가 없습니다. 상점에서 먼저 방어구를 구매하세요.
                  </div>
                  <div className="text-right">
                    <button
                      onClick={onClose}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 펫 강화 탭 */}
          {selectedTab === "pet" && (
            <>
              {pet ? (
                <div>
                  <div className="mb-2 text-lg font-semibold">
                    현재 펫: {pet.icon} {pet.name}
                  </div>
                  <div className="text-sm text-gray-700 mb-4">
                    현재 보너스: +{petLevel * 5}%
                  </div>
                  <div className="rounded border p-4">
                    <div className="mb-2 font-medium">다음 강화 효과</div>
                    <div className="text-sm">
                      펫 파워 +5% (누적 +{petNextBonusPct}%)
                    </div>
                    <div className="mt-3 text-sm">필요 골드: {petCost} G</div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      onClick={onClose}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white"
                    >
                      닫기
                    </button>
                    <button
                      onClick={onEnhancePet}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-blue-700 hover:text-white"
                      disabled={player.money < petCost}
                    >
                      강화
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    강화할 펫이 없습니다. 상점에서 먼저 펫을 구매하세요.
                  </div>
                  <div className="text-right">
                    <button
                      onClick={onClose}
                      className="rounded border border-gray-700 px-4 py-2 text-sm hover:bg-red-600 hover:text-white"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default EquipmentEnhanceScreen;
