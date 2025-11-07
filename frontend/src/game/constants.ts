import type { MonsterList, Skill, Dungeon } from './types';

// 밸런스 컨트롤러
export const ctrl = {
  levUpVal: {
    hp: [50, 10], // (레벨*50) + (레벨*10)
    atk: 30, // (레벨*30) + 보정
    def: 40, // (레벨*40) + 보정
    luk: 10, // (레벨*10) + 보정
  },
  jobBonus: {
    // [atk, def, luk] 보너스 %
    "마법사": [10, 0, 5],
    "전사": [5, 10, 0],
    "도적": [0, 5, 10],
  },
};

// 몬스터 리스트
export const monsterList: MonsterList = {
  //이름, 레벨, HP, 공격력, 방어력, 행운
  0: [
    ['슬라임', 1, 40, 45, 10, 0],
    ['너구리', 2, 54, 52, 15, 20],
    ['여우', 2, 61, 50, 20, 11],
  ],
  1: [
    ['늑대', 2, 70, 81, 28, 18],
    ['고블린', 3, 75, 84, 39, 30],
    ['고블린 마법사', 3, 78, 91, 46, 30],
    ['고블린 전사', 3, 81, 88, 67, 30],
  ],
  2: [
    ['사나운 늑대', 3, 91, 92, 50, 20],
    ['그리즐리 베어', 4, 100, 100, 31, 14],
  ],
  // 레벨 3 몬스터 추가 (원본 코드의 레벨 계산 오류 방지용)
  3: [
    ['사나운 늑대', 3, 91, 92, 50, 20],
    ['그리즐리 베어', 4, 100, 100, 31, 14],
    ['오우거', 5, 150, 120, 80, 10],
  ]
};

// 스킬 목록
export const skills: Skill[] = [
  {
    key: 'shadowVeil',
    name: '섀도우 베일',
    requiredLevel: 2,
    description: '2턴 동안 모든 공격을 회피한다.',
    allowedJobs: ['도적'],
    kind: 'buff',
    cooldown: 5,
    duration: 2,
    effect: { type: 'evade', value: 1 },
  },
  {
    key: 'phantomStrike',
    name: '팬텀 스트라이크',
    requiredLevel: 3,
    description: '다음 공격이 방어를 무시한다.',
    allowedJobs: ['마법사'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'trueStrike', value: 1 },
  },
  {
    key: 'bladeFlurry',
    name: '블레이드 플러리',
    requiredLevel: 2,
    description: '다음 공격이 2회 적중(두 번째 타격은 60% 피해).',
    allowedJobs: ['도적'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'multiStrike', value: 0.6 },
  },
  {
    key: 'vampiricAura',
    name: '뱀피릭 오라',
    requiredLevel: 3,
    description: '3턴 동안 가한 피해의 30%만큼 회복한다.',
    allowedJobs: ['마법사'],
    kind: 'buff',
    cooldown: 6,
    duration: 3,
    effect: { type: 'lifesteal', value: 0.3 },
  },
  {
    key: 'hex',
    name: '헥스',
    requiredLevel: 2,
    description: '2턴 동안 적의 공격력이 30% 감소한다.',
    allowedJobs: ['마법사'],
    kind: 'buff',
    cooldown: 5,
    duration: 2,
    effect: { type: 'weaken', value: 0.3 },
  },
  {
    key: 'shadowBind',
    name: '섀도우 바인드',
    requiredLevel: 4,
    description: '적을 1턴 동안 기절시킨다.',
    allowedJobs: ['도적'],
    kind: 'attack',
    cooldown: 6,
    effect: { type: 'stun', value: 1 },
  },
  {
    key: 'arcaneBarrier',
    name: '아케인 배리어',
    requiredLevel: 2,
    description: '다음 1회의 적 공격을 완전히 무효화한다.',
    allowedJobs: ['전사'],
    kind: 'buff',
    cooldown: 4,
    duration: 3,
    effect: { type: 'barrier', value: 1 },
  },
  {
    key: 'timeStop',
    name: '타임 스톱',
    requiredLevel: 5,
    description: '시간을 멈추고 즉시 추가 턴을 얻는다.',
    allowedJobs: ['마법사'],
    kind: 'attack',
    cooldown: 6,
    effect: { type: 'timeStop', value: 0 },
  },
  // 마법사 추가 스킬
  {
    key: 'frostNova',
    name: '프로스트 노바',
    requiredLevel: 2,
    description: '적을 1턴 동안 얼려서 기절시킨다.',
    allowedJobs: ['마법사'],
    kind: 'attack',
    cooldown: 5,
    effect: { type: 'stun', value: 1 },
  },
  {
    key: 'arcaneSurge',
    name: '아케인 서지',
    requiredLevel: 3,
    description: '다음 공격 +80% 강화.',
    allowedJobs: ['마법사'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'charge', value: 0.8 },
  },
  {
    key: 'manaShield',
    name: '마나 실드',
    requiredLevel: 2,
    description: '다음 1회의 적 공격을 무효화.',
    allowedJobs: ['마법사'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'barrier', value: 1 },
  },
  {
    key: 'drainingCurse',
    name: '드레이닝 커스',
    requiredLevel: 4,
    description: '3턴 동안 가한 피해의 20% 흡혈.',
    allowedJobs: ['마법사'],
    kind: 'buff',
    cooldown: 6,
    duration: 3,
    effect: { type: 'lifesteal', value: 0.2 },
  },
  // 전사 추가 스킬
  {
    key: 'ironWill',
    name: '아이언 윌',
    requiredLevel: 2,
    description: '다음 1회의 적 공격을 무효화.',
    allowedJobs: ['전사'],
    kind: 'buff',
    cooldown: 4,
    duration: 3,
    effect: { type: 'barrier', value: 1 },
  },
  {
    key: 'berserkRush',
    name: '버서크 러시',
    requiredLevel: 4,
    description: '2턴 동안 가한 피해의 20% 흡혈.',
    allowedJobs: ['전사'],
    kind: 'buff',
    cooldown: 6,
    duration: 2,
    effect: { type: 'lifesteal', value: 0.2 },
  },
  {
    key: 'cleave',
    name: '가르기',
    requiredLevel: 3,
    description: '다음 공격 2연타(2타 50% 피해).',
    allowedJobs: ['전사'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'multiStrike', value: 0.5 },
  },
  {
    key: 'crushingRoar',
    name: '크러싱 로어',
    requiredLevel: 3,
    description: '2턴 동안 적 ATK -25%.',
    allowedJobs: ['전사'],
    kind: 'buff',
    cooldown: 5,
    duration: 2,
    effect: { type: 'weaken', value: 0.25 },
  },
  // 도적 추가 스킬
  {
    key: 'smokeBomb',
    name: '스모크 밤',
    requiredLevel: 2,
    description: '1턴 동안 모든 공격 회피.',
    allowedJobs: ['도적'],
    kind: 'buff',
    cooldown: 4,
    duration: 1,
    effect: { type: 'evade', value: 1 },
  },
  {
    key: 'assassinatePrep',
    name: '암살 준비',
    requiredLevel: 3,
    description: '다음 공격 방어 무시.',
    allowedJobs: ['도적'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'trueStrike', value: 1 },
  },
  {
    key: 'flurry',
    name: '플러리',
    requiredLevel: 3,
    description: '다음 공격 2연타(2타 70% 피해).',
    allowedJobs: ['도적'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'multiStrike', value: 0.7 },
  },
  {
    key: 'nerveStrike',
    name: '너브 스트라이크',
    requiredLevel: 4,
    description: '적 1턴 기절.',
    allowedJobs: ['도적'],
    kind: 'attack',
    cooldown: 6,
    effect: { type: 'stun', value: 1 },
  },
  // 전사용 스킬 추가
  {
    key: 'warSmash',
    name: '분쇄 일격',
    requiredLevel: 3,
    description: '다음 공격이 +120% 강화된다.',
    allowedJobs: ['전사'],
    kind: 'buff',
    cooldown: 5,
    duration: 3,
    effect: { type: 'charge', value: 1.2 },
  },
  {
    key: 'battleCryWar',
    name: '전장의 포효',
    requiredLevel: 2,
    description: '2턴 동안 적의 공격력이 30% 감소한다.',
    allowedJobs: ['전사'],
    kind: 'buff',
    cooldown: 5,
    duration: 2,
    effect: { type: 'weaken', value: 0.3 },
  },
];

// 던전 목록
export const dungeons: Dungeon[] = [
  {
    id: 'forest',
    name: '초원의 숲',
    description: '초보자용 던전. 약한 몬스터들이 서식한다.',
    requiredLevel: 1,
    monsterLevelOffset: 0, // 플레이어 레벨 - 1
    icon: '🌲',
  },
  {
    id: 'cave',
    name: '어둠의 동굴',
    description: '중급자용 던전. 고블린 무리들이 살고 있다.',
    requiredLevel: 3,
    monsterLevelOffset: 1, // 플레이어 레벨
    icon: '🕳️',
  },
  {
    id: 'mountain',
    name: '얼음 산맥',
    description: '고급자용 던전. 강력한 야수들이 출몰한다.',
    requiredLevel: 5,
    monsterLevelOffset: 2, // 플레이어 레벨 + 1
    icon: '⛰️',
  },
  {
    id: 'abyss',
    name: '심연의 나락',
    description: '최고급 던전. 최강의 몬스터들이 기다린다.',
    requiredLevel: 7,
    monsterLevelOffset: 3, // 플레이어 레벨 + 2
    icon: '🔥',
  },
];