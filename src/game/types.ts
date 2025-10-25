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
  type: 'weapon' | 'armor';
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
  | 'normal'
  | 'atk'
  | 'cri'
  | 'vic'
  | 'def'
  | 'lvup'
  | 'fail'
  | 'appear'
  | 'gainExp'
  | 'gainMoney'
  | 'tryToAtk';

// 게임 상태
export type GameState = 'setup' | 'dungeon' | 'battle' | 'shop';

// 전투 액션 결과 타입
export type BattleResult = {
  logs: Omit<LogMessage, 'id'>[];
  attacker: CharacterStats;
  defender: CharacterStats;
  isBattleOver: boolean;
};