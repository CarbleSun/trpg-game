// src/game/types.ts

// 캐릭터 기본 스탯
export interface CharacterStats {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  luk: number;
  isDefending?: boolean; // 방어 상태 추가
}

// 직업 타입
export type Job = "마법사" | "전사" | "도적";

// 장비 아이템 타입 (중복 제거 및 'allowedJobs' 포함)
export interface EquipmentItem {
  id: string;
  name: string;
  type: "weapon" | "armor";
  value: number; // (공격력 또는 방어력)
  price: number;
  allowedJobs?: Job[]; // <-- JOB 제한
}

// 펫 타입
export interface Pet {
  id: string;
  name: string;
  icon: string; // 이모지 등 간단 표현
  kind: "attack" | "heal";
  power: number; // 예) 0.2 => 20%
  description: string;
}

// 스킬 키
export type SkillKey =
  // 마법사
  | "hex" | "manaShield" | "IceAge" | "arcaneSurge" | "phantomStrike" | "vampiricAura" | "drainingCurse" | "THEWORLD"
  // 전사
  | "ironWill" | "arcaneBarrier" | "battleCryWar" | "cleave" | "crushingRoar" | "warSmash" | "berserkRush"
  // 도적
  | "shadowVeil" | "bladeFlurry" | "smokeBomb" | "assassinatePrep" | "flurry" | "nerveStrike" | "shadowBind";

// 플레이어 스탯 (중복 제거 및 모든 속성 병합)
export interface PlayerStats extends CharacterStats {
  exp: number;
  job: Job;
  money: number;
  goalExp: number;
  vicCount: number;
  defCount: number;
  weapon: EquipmentItem | null; // 무기
  armor: EquipmentItem | null; // 방어구
  pet?: Pet | null;
  weaponEnhanceLevels?: Record<string, number>;
  armorEnhanceLevels?: Record<string, number>;
  petEnhanceLevels?: Record<string, number>;
  ownedWeaponIds?: string[];
  ownedArmorIds?: string[];
  ownedPetIds?: string[];
  skillPoints: number;
  skills: SkillKey[];
  skillUpgradeLevels?: Partial<Record<SkillKey, number>>;
  activeBuffs?: Array<{
    key: SkillKey;
    remainingTurns: number;
    bonuses: { atk?: number; def?: number; luk?: number };
    evadeAll?: boolean;
    reflectPercent?: number;
    barrier?: boolean;
    chargeAttackMultiplier?: number;
    counterDamage?: number;
    lifeStealPercent?: number;
    weakenPercent?: number;
    multiStrikeNext?: boolean;
    trueStrikeNext?: boolean;
  }>;
  skillCooldowns?: Partial<Record<SkillKey, number>>;
  monsterStunnedTurns?: number;
}

// 스킬 타입
export interface Skill {
  key: SkillKey;
  name: string; // 표시명
  requiredLevel: number; // 배울 수 있는 최소 레벨
  description: string;
  allowedJobs?: Job[]; // 배울 수 있는 직업 제한 (없으면 전직업)
  kind: "attack" | "buff";
  cooldown: number; // 재사용 대기 (플레이어 턴 기준)
  duration?: number; // 지속 턴 수 (플레이어 턴 기준)
  bonuses?: { atk?: number; def?: number; luk?: number };
  attackBonusMultiplier?: number;
  guaranteedCrit?: boolean;
  effect?:
    | { type: "evade"; value: number }
    | { type: "reflect"; value: number }
    | { type: "barrier"; value: number }
    | { type: "charge"; value: number }
    | { type: "timeStop"; value: number }
    | { type: "counter"; value: number }
    | { type: "lifesteal"; value: number }
    | { type: "weaken"; value: number }
    | { type: "multiStrike"; value: number }
    | { type: "trueStrike"; value: number }
    | { type: "stun"; value: number };
}

// 몬스터 리스트 타입
export type MonsterList = {
  [level: number]: (string | number)[][];
};

// 로그 메시지 타입
export type LogMessage = {
  id: number; // React key를 위한 ID
  msg: string;
  type: LogType;
};

// 로그 종류
export type LogType =
  | "normal" | "atk" | "cri" | "vic" | "def" | "lvup"
  | "fail" | "appear" | "gainExp" | "gainMoney" | "tryToAtk";

// 던전 타입
export interface Dungeon {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  monsterLevelOffset: number; // 플레이어 레벨에 더할 오프셋
  icon: string;
}

// 보스 타입 (스킬 사용 가능)
export interface BossStats extends CharacterStats {
  skills: SkillKey[]; // 보스가 사용할 수 있는 스킬 목록
  skillCooldowns?: Partial<Record<SkillKey, number>>;
  activeBuffs?: Array<{
    key: SkillKey;
    remainingTurns: number;
    bonuses: { atk?: number; def?: number; luk?: number };
    evadeAll?: boolean;
    reflectPercent?: number;
    barrier?: boolean;
    chargeAttackMultiplier?: number;
    counterDamage?: number;
    lifeStealPercent?: number;
    weakenPercent?: number;
    multiStrikeNext?: boolean;
    trueStrikeNext?: boolean;
  }>;
}

// 보스 던전 타입
export interface BossDungeon {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  bossLevel: number;
  icon: string;
}

export type GameState =
  | "setup"
  | "dungeonSelect"
  | "bossSelect"
  | "dungeon"
  | "battle"
  | "shop"
  | "petEnhance"
  | "weaponEnhance"
  | "bossReward"; // 보스 보상 처리 모달 상태

// 보스 보상 모달
export interface BossReward {
  item: EquipmentItem;
  isDuplicate: boolean; // 이미 가지고 있는 아이템인가?
  isUsable: boolean; // 현재 직업이 사용 가능한 아이템인가?
  sellPrice: number; // 판매 시 얻을 골드 (아이템 정가 * 0.5)
}

// 전투 액션 결과 타입
export type BattleResult = {
  logs: Omit<LogMessage, "id">[];
  attacker: CharacterStats;
  defender: CharacterStats;
  isBattleOver: boolean;
};