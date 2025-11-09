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

// 장비 아이템 타입
export interface EquipmentItem {
  id: string;
  name: string;
  type: "weapon" | "armor";
  value: number; // (공격력 또는 방어력)
  price: number;
  allowedJobs?: Job[]; // <--  JOB 제한
}

// 플레이어 스탯 (캐릭터 확장)
export interface PlayerStats extends CharacterStats {
  exp: number;
  job: Job;
  money: number;
  goalExp: number;
  vicCount: number;
  defCount: number;
}

// 장비 아이템 타입 추가
export interface EquipmentItem {
  id: string;
  name: string;
  type: "weapon" | "armor";
  value: number; // (공격력 또는 방어력)
  price: number;
}

// PlayerStats에 장비 칸 추가 (atk, def, luk는 '기본 스탯'이 됨)
export interface PlayerStats extends CharacterStats {
  exp: number;
  job: Job;
  money: number;
  goalExp: number;
  vicCount: number;
  defCount: number;
  weapon: EquipmentItem | null; // 무기
  armor: EquipmentItem | null; // 방어구

  // 펫 시스템
  pet?: Pet | null;

  // 강화 시스템
  weaponUpgradeLevel?: number; // [deprecated] 전역 무기 강화 레벨
  petPowerBonus?: number; // [deprecated] 전역 펫 보너스
  weaponEnhanceLevels?: Record<string, number>; // 무기별 강화 레벨
  armorEnhanceLevels?: Record<string, number>; // 방어구별 강화 레벨
  petEnhanceLevels?: Record<string, number>; // 펫별 강화 레벨

  // 보유 목록
  ownedWeaponIds?: string[];
  ownedArmorIds?: string[];
  ownedPetIds?: string[];

  // 스킬 시스템
  skillPoints: number; // 보유 스킬 포인트
  skills: SkillKey[]; // 습득한 스킬 키 목록
  skillUpgradeLevels?: Partial<Record<SkillKey, number>>; // 스킬별 업그레이드 레벨 (최대 5)
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
  }>; // 임시 버프
  skillCooldowns?: Partial<Record<SkillKey, number>>; // 남은 쿨다운 턴
  monsterStunnedTurns?: number;
}

// 펫 타입
export interface Pet {
  id: string;
  name: string;
  icon: string; // 이모지 등 간단 표현
  kind: "attack" | "heal";
  // 공격형: 플레이어 유효 ATK의 비율로 피해, 치유형: 최대 HP 비율로 회복
  power: number; // 예) 0.2 => 20%
  description: string;
}

// 스킬 키 및 스킬 타입 (전부 액티브)
export type SkillKey =
  // 마법사
  | "hex"
  | "manaShield"
  | "IceAge"
  | "arcaneSurge"
  | "phantomStrike"
  | "vampiricAura"
  | "drainingCurse"
  | "THEWORLD"

  // 전사
  | "ironWill"
  | "arcaneBarrier"
  | "battleCryWar"
  | "cleave"
  | "crushingRoar"
  | "warSmash"
  | "berserkRush"

  // 도적
  | "shadowVeil"
  | "bladeFlurry"
  | "smokeBomb"
  | "assassinatePrep"
  | "flurry"
  | "nerveStrike"
  | "shadowBind";

export interface Skill {
  key: SkillKey;
  name: string; // 표시명
  requiredLevel: number; // 배울 수 있는 최소 레벨
  description: string;
  allowedJobs?: Job[]; // 배울 수 있는 직업 제한 (없으면 전직업)
  kind: "attack" | "buff";
  cooldown: number; // 재사용 대기 (플레이어 턴 기준)
  // kind === 'buff'
  duration?: number; // 지속 턴 수 (플레이어 턴 기준)
  bonuses?: { atk?: number; def?: number; luk?: number };
  // kind === 'attack'
  attackBonusMultiplier?: number; // 추가 데미지 배율 (예: 0.5 => +50%)
  guaranteedCrit?: boolean; // 크리티컬 보장
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

// 로그 종류 (style.css의 .msg-*** 클래스 매핑)
export type LogType =
  | "normal"
  | "atk"
  | "cri"
  | "vic"
  | "def"
  | "lvup"
  | "fail"
  | "appear"
  | "gainExp"
  | "gainMoney"
  | "tryToAtk";

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
  skillCooldowns?: Partial<Record<SkillKey, number>>; // 보스 스킬 쿨다운
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
  }>; // 보스 버프
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

// 게임 상태
export type GameState =
  | "setup"
  | "dungeonSelect"
  | "bossSelect"
  | "dungeon"
  | "battle"
  | "shop"
  | "petEnhance"
  | "weaponEnhance";

// 전투 액션 결과 타입
export type BattleResult = {
  logs: Omit<LogMessage, "id">[];
  attacker: CharacterStats;
  defender: CharacterStats;
  isBattleOver: boolean;
};
