import type {
  MonsterList,
  Skill,
  Dungeon,
  Pet,
  BossDungeon,
  BossStats,
  SkillKey,
} from "./types";

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
    마법사: [10, 5, 5],
    전사: [5, 10, 5],
    도적: [5, 5, 10],
  },
};

// 몬스터 리스트
export const monsterList: MonsterList = {
  //이름, 레벨, HP, 공격력, 방어력, 행운
  0: [ // 초원의 숲
    ["슬라임", 1, 40, 45, 10, 0],
		["작은 박쥐", 1, 38, 40, 8, 15],
		["초원 토끼", 1, 42, 44, 9, 12],
		["새싹 정령", 1, 48, 46, 12, 18],
    ["너구리", 2, 54, 52, 15, 20],
    ["여우", 2, 61, 50, 20, 11],
		["삵", 2, 55, 27, 14, 25],
		["큰 박쥐", 3, 70, 50, 15, 13],
		["헬창 토끼", 4, 100, 50, 25, 14],
		["킹 슬라임", 5, 100, 50, 20, 17],
  ],
  1: [ // 어둠의 동굴
		["동굴 박쥐", 11, 160, 150, 60, 40],
		["동굴 곰", 11, 300, 150, 70, 10],
		["코볼트 정찰병", 11, 200, 80, 50, 15],
		["코볼트 전사", 11, 200, 130, 100, 14],
    ["늑대", 12, 180, 160, 70, 25],
		["동굴 거미", 12, 170, 160, 80, 28],
    ["맹독 쥐", 12, 175, 165, 70, 32],
    ["고블린", 13, 200, 170, 85, 30],
    ["고블린 마법사", 13, 190, 185, 90, 30],
    ["고블린 전사", 13, 210, 175, 120, 30],
    ["고블린 주술사", 14, 250, 150, 100, 50],
		["고블린 돌격대장", 15, 300, 150, 160, 30],
  ],
  2: [ // 얼음 맥
		["언데드", 21, 500, 150, 200, 0],
		["설표", 21, 300, 250, 140, 24],
    ["사나운 늑대", 22, 320, 300, 150, 25],
    ["그리즐리 베어", 23, 380, 320, 180, 20],
    ["설원 늑대", 23, 340, 330, 170, 25],
    ["얼음 정령", 24, 360, 340, 190, 28],
    ["바위 무너미", 24, 400, 310, 220, 15],
  ],
  // 레벨 3 몬스터 추가 (원본 코드의 레벨 계산 오류 방지용)
  3: [ // 심연
    ["벨라투스", 31, 920, 650, 430, 26],
		["리바이우스", 31, 1000, 700, 500, 30],
		["팬텀", 31, 1200, 600, 650, 32],
		["에레보스", 32, 1500, 800, 500, 30],
    ["바실리스크", 32, 900, 700, 420, 30],
		["라미아", 33, 860, 680, 400, 35],
		["더 팻맨", 33, 2000, 700, 500, 30],
		["싸이클롭스", 34, 3000, 500, 700, 20],
		["미노타우로스", 34, 980, 720, 460, 24],
		["슬렌더맨", 35, 2000, 1000, 500, 70],
  ],
  4: [ // 지옥 입구
		["사탄", 41, 1300, 750, 630, 26],
		["하급 악마", 41, 1200, 700, 500, 30],
		["길잃은 영혼", 41, 1000, 600, 350, 51],
		["불의 정령", 42, 1700, 1200, 500, 32],
    ["중급 악마", 42, 1600, 1000, 620, 35],
		["악마 전사", 43, 2000, 1400, 700, 34],
		["악마 주술사", 43, 2200, 1000, 500, 54],
		["악마 오우거", 44, 4000, 2200, 1000, 20],
		["상급 악마", 44, 2500, 1520, 660, 44],
		["케르베로스", 45, 5000, 2700, 2300, 70],
  ],
  5: [ // 지옥성
		["라바", 51, 1100, 940, 520, 38],
		["지옥 사냥개", 54, 1100, 940, 520, 38],
    ["와이번", 55, 1200, 900, 540, 36],
    ["지옥불 거인", 56, 1400, 880, 600, 22],
    ["망령 기사", 57, 1150, 920, 580, 30],
		["헬 나이트", 60, 1600, 1000, 750, 35],
		["리치", 60, 1200, 2000, 600, 43],
  ],
};

// 스킬 목록
// 스킬 습득은 10레벨 단위로 설정
export const skills: Skill[] = [
  // --- 전사 스킬 ---
  {
    key: 'power_strike',
    name: '파워 스트라이크',
    kind: 'attack',
    description: '무기에 힘을 실어 적을 강타합니다.',
    cooldown: 1, 
    damageMultiplier: 1.2, // 공격력의 120%
    growthPerLevel: 0.1,   // 레벨당 +10%
    requiredLevel: 1,
    allowedJobs: ['전사'],
  },
  {
    key: 'slash',
    name: '가르기',
    kind: 'attack',
    description: '적의 급소를 노려 치명적인 피해를 줍니다.',
    cooldown: 3,
    damageMultiplier: 2.5, // 250%
    growthPerLevel: 0.2,   // +20%
    requiredLevel: 10,
    allowedJobs: ['전사'],
  },
  {
    key: 'iron_wall',
    name: '아이언 윌',
    kind: 'buff',
    description: '3턴 동안 방어 태세를 취합니다.',
    cooldown: 5,
    duration: 3,
    effect: { type: 'barrier', value: 0 }, 
    requiredLevel: 10,
    allowedJobs: ['전사'],
  },
	{
    key: 'ground_smash',
    name: '대지 분쇄',
    kind: 'attack',
    description: '땅을 내리쳐 충격파로 적을 공격합니다.',
    cooldown: 4,
    damageMultiplier: 3.0, // 300%
    growthPerLevel: 0.25,
    requiredLevel: 20,
    allowedJobs: ['전사'],
  },
  {
    key: 'berserk',
    name: '폭주',
    kind: 'buff',
    description: '분노를 터뜨려 다음 공격을 매우 강력하게 만듭니다.',
    cooldown: 8,
    duration: 3,
    effect: { type: 'trade_off', value: 0.8, penalty: 0.3 }, // 80% 데미지 증가 (기존 charge 활용)
    requiredLevel: 20,
    allowedJobs: ['전사'],
  },
  {
    key: 'gigantic_slash',
    name: '기가 슬래시',
    kind: 'attack',
    description: '전력을 다해 거대한 검기를 날립니다.',
    cooldown: 6,
    damageMultiplier: 4.5, // 450% 강력한 한방
    growthPerLevel: 0.5,
    requiredLevel: 30,
    allowedJobs: ['전사'],
  },

  // --- 마법사 스킬 ---
  {
    key: 'fireball',
    name: '파이어볼',
    kind: 'attack',
    description: '화염구를 날려 적을 태워버립니다.',
    cooldown: 1,
    damageMultiplier: 1.3, // 130%
    growthPerLevel: 0.15,
    requiredLevel: 1,
    allowedJobs: ['마법사'],
  },
  {
    key: 'recovery',
    name: '치유',
    kind: 'heal',
    description: '마력으로 체력을 즉시 회복합니다.',
    cooldown: 4,
    damageMultiplier: 2.0, // 공격력(지능)의 200% 회복
    growthPerLevel: 0.2,
    requiredLevel: 10,
    allowedJobs: ['마법사'],
  },
  {
    key: 'thunder_bolt',
    name: '썬더볼트',
    kind: 'attack',
    description: '강력한 번개를 내리꽂습니다.',
    cooldown: 4,
    damageMultiplier: 3.0, // 300%
    growthPerLevel: 0.3,
    requiredLevel: 10,
    allowedJobs: ['마법사'],
  },
	{
    key: 'ice_spear',
    name: '아이스 스피어',
    kind: 'attack',
    description: '날카로운 얼음 창을 소환하여 관통합니다.',
    cooldown: 3,
    damageMultiplier: 2.8, // 280%
    growthPerLevel: 0.25,
    requiredLevel: 20,
    allowedJobs: ['마법사'],
  },
  {
    key: 'mana_shield',
    name: '마나 쉴드',
    kind: 'buff',
    description: '마력으로 보호막을 형성하여 피해를 흡수합니다.',
    cooldown: 6,
    duration: 3,
    effect: { type: 'barrier', value: 0 }, // 기존 barrier 로직 활용
    requiredLevel: 20,
    allowedJobs: ['마법사'],
  },
  {
    key: 'meteor',
    name: '메테오',
    kind: 'attack',
    description: '거대한 운석을 소환하여 전장을 초토화합니다.',
    cooldown: 8,
    damageMultiplier: 5.0, // 500% 궁극기급 데미지
    growthPerLevel: 0.6,
    requiredLevel: 30,
    allowedJobs: ['마법사'],
  },
	{
    key: 'mana_react',
    name: '마력 폭주',
    kind: 'buff',
    description: '마력을 한계까지 끌어올립니다. 그 대가로 신체가 약화됩니다.',
    cooldown: 6,
    duration: 2, 
    requiredLevel: 25,
    allowedJobs: ['마법사'],
    // value: 0.5 (공격력 +50%), penalty: 0.3 (방어력 -30%)
    effect: { type: 'trade_off', value: 0.5, penalty: 0.3 }, 
  },

  // --- 도적 스킬 ---
  {
    key: 'double_stab',
    name: '더블 스탭',
    kind: 'attack',
    description: '빠르게 찔러 피해를 줍니다.',
    cooldown: 1,
    damageMultiplier: 1.1, // 110%
    growthPerLevel: 0.1,
    requiredLevel: 1,
    allowedJobs: ['도적'],
  },
  {
    key: 'poison_weapon',
    name: '약점 포착',
    kind: 'buff',
    description: '3턴 동안 다음 공격이 치명타가 됩니다.',
    cooldown: 6,
    duration: 3,
    effect: { type: 'charge', value: 0.5 }, 
    requiredLevel: 10,
    allowedJobs: ['도적'],
  },
  {
    key: 'assassinate',
    name: '암살',
    kind: 'attack',
    description: '적의 뒤를 노려 필살의 일격을 가합니다.',
    cooldown: 5,
    damageMultiplier: 4.0, // 400%
    growthPerLevel: 0.5,
    requiredLevel: 10,
    allowedJobs: ['도적'],
  },
	{
    key: 'shadow_shuriken',
    name: '그림자 표창',
    kind: 'attack',
    description: '어둠 속에서 표창을 던져 기습합니다.',
    cooldown: 2, // 짧은 쿨타임
    damageMultiplier: 2.2, // 220%
    growthPerLevel: 0.2,
    requiredLevel: 20,
    allowedJobs: ['도적'],
  },
  {
    key: 'smoke_bomb',
    name: '연막탄',
    kind: 'buff',
    description: '연막을 뿌려 적의 공격을 회피(방어)합니다.',
    cooldown: 7,
    duration: 2,
    effect: { type: 'barrier', value: 0 }, // 도적 컨셉의 방어막(회피 느낌)
    requiredLevel: 20,
    allowedJobs: ['도적'],
  },
  {
    key: 'illusion_dance',
    name: '환영검무',
    kind: 'attack',
    description: '보이지 않는 속도로 난무하여 적을 베어버립니다.',
    cooldown: 6,
    damageMultiplier: 4.2, // 420%
    growthPerLevel: 0.4,
    requiredLevel: 30,
    allowedJobs: ['도적'],
  },
];

// 던전 목록
export const dungeons: Dungeon[] = [
  {
    id: "forest",
    name: "초원의 숲",
    description: "평범한 들판입니다. 누가 죽어도 모를정도로 평화롭습니다",
    requiredLevel: 1,
    monsterLevelOffset: 0, // 기준 티어
    icon: "🌲",
  },
  {
    id: "cave",
    name: "어둠의 동굴",
    description: "깊고 어두운 동굴에 형성된 고블린 종족들이 당신을 노립니다",
    requiredLevel: 11,
    monsterLevelOffset: 1, // 기준 티어 +1
    icon: "🕳️",
  },
  {
    id: "mountain",
    name: "얼음 산맥",
    description: "춥고 험난한 곳에서 단련된 야수들이 당신을 노립니다 ",
    requiredLevel: 21,
    monsterLevelOffset: 2, // 기준 티어 +2
    icon: "⛰️",
  },
  {
    id: "abyss",
    name: "심연",
    description: "아무것도 보이지 않는 어둠속에서 괴생명체들이 당신을 노립니다",
    requiredLevel: 31,
    monsterLevelOffset: 3, // 기준 티어 +3
    icon: "🔥",
  },
	{
		id: "hell",
    name: "지옥 입구",
    description: "지옥문 초입입니다. 수문장들이 침입자를 저지하기 위해 달려들 것입니다",
    requiredLevel: 41,
    monsterLevelOffset: 4, // 기준 티어 +4
    icon: "👿",
	},
	{
		id: "hellcastle",
    name: "지옥성",
    description: "지옥 중에서 가장 깊은 곳, 가장 악한 존재들이 당신을 눈여겨 보고 있습니다",
    requiredLevel: 51,
    monsterLevelOffset: 5, // 기준 티어 +5
    icon: "☠️",
	},
];

// 간단한 스타터 펫 목록
export const starterPets: Pet[] = [
  {
    id: "cat",
    name: "길냥이",
    icon: "🐱",
    kind: "attack",
    power: 0.2, // 플레이어 유효 ATK의 20%
    description: "플레이어 턴 시작마다 살짝 할퀴어 피해를 준다.",
  },
  {
    id: "fairy",
    name: "작은 요정",
    icon: "🧚",
    kind: "heal",
    power: 0.05, // 최대 HP의 5%
    description: "플레이어 턴 시작마다 소량의 체력을 회복시킨다.",
  },
];

// 상점용 펫 목록 (가격 포함)
export const petShopList: Array<Pet & { price: number }> = [
  { ...starterPets[0], price: 300 },
  { ...starterPets[1], price: 350 },
  {
    id: "wolf",
    name: "야생 늑대",
    icon: "🐺",
    kind: "attack",
    power: 0.25,
    description: "플레이어 턴 시작마다 강하게 물어뜯어 피해를 준다.",
    price: 500,
  },
  {
    id: "dragon",
    name: "새끼 용",
    icon: "🐉",
    kind: "attack",
    power: 0.35,
    description: "플레이어 턴 시작마다 화염 브레스를 뿜어 큰 피해를 준다.",
    price: 1000,
  },
  {
    id: "phoenix",
    name: "불사조",
    icon: "🔥",
    kind: "heal",
    power: 0.08,
    description: "플레이어 턴 시작마다 재생의 불꽃으로 체력을 회복시킨다.",
    price: 800,
  },
  {
    id: "unicorn",
    name: "유니콘",
    icon: "🦄",
    kind: "heal",
    power: 0.12,
    description: "플레이어 턴 시작마다 신성한 힘으로 많은 체력을 회복시킨다.",
    price: 1200,
  },
  {
    id: "slime",
    name: "킹 슬라임",
    icon: "👑",
    kind: "attack",
    power: 0.15,
    description: "플레이어 턴 시작마다 점액을 발사해 피해를 준다.",
    price: 400,
  },
  {
    id: "spirit",
    name: "정령",
    icon: "✨",
    kind: "heal",
    power: 0.06,
    description: "플레이어 턴 시작마다 자연의 힘으로 체력을 회복시킨다.",
    price: 450,
  },
  {
    id: "demon",
    name: "작은 악마",
    icon: "😈",
    kind: "attack",
    power: 0.3,
    description: "플레이어 턴 시작마다 어둠의 화살을 발사해 피해를 준다.",
    price: 900,
  },
  {
    id: "angel",
    name: "수호 천사",
    icon: "👼",
    kind: "heal",
    power: 0.15,
    description: "플레이어 턴 시작마다 천상의 축복으로 많은 체력을 회복시킨다.",
    price: 1500,
  },
];

// 보스 이름 및 아이콘 매핑
const bossNames: Record<number, string> = {
  5: "고블린 왕",
  10: "늑대 군주",
  15: "얼음 거인",
  20: "다크 나이트",
  25: "드래곤 로드",
  30: "데몬 킹",
};

const bossIcons: Record<number, string> = {
  5: "👑",
  10: "🐺",
  15: "❄️",
  20: "⚔️",
  25: "🐉",
  30: "😈",
};

// 보스 던전 목록 (5레벨마다 한 개씩)
export const bossDungeons: BossDungeon[] = [
  {
    id: "boss_5",
    name: bossNames[5],
    description: `${bossNames[5]}이(가) 기다린다. 강력한 스킬을 사용한다.`,
    requiredLevel: 5,
    bossLevel: 5,
    icon: bossIcons[5],
  },
  {
    id: "boss_10",
    name: bossNames[10],
    description: `${bossNames[10]}이(가) 기다린다. 강력한 스킬을 사용한다.`,
    requiredLevel: 10,
    bossLevel: 10,
    icon: bossIcons[10],
  },
  {
    id: "boss_15",
    name: bossNames[15],
    description: `${bossNames[15]}이(가) 기다린다. 강력한 스킬을 사용한다.`,
    requiredLevel: 15,
    bossLevel: 15,
    icon: bossIcons[15],
  },
  {
    id: "boss_20",
    name: bossNames[20],
    description: `${bossNames[20]}이(가) 기다린다. 강력한 스킬을 사용한다.`,
    requiredLevel: 20,
    bossLevel: 20,
    icon: bossIcons[20],
  },
  {
    id: "boss_25",
    name: bossNames[25],
    description: `${bossNames[25]}이(가) 기다린다. 강력한 스킬을 사용한다.`,
    requiredLevel: 25,
    bossLevel: 25,
    icon: bossIcons[25],
  },
  {
    id: "boss_30",
    name: bossNames[30],
    description: `${bossNames[30]}이(가) 기다린다. 강력한 스킬을 사용한다.`,
    requiredLevel: 30,
    bossLevel: 30,
    icon: bossIcons[30],
  },
];

// 보스 생성 함수
export const createBoss = (bossLevel: number): BossStats => {
  // 보스 스탯 계산 (일반 몬스터보다 훨씬 강함)
  const baseHp = bossLevel * 200; // 일반 몬스터보다 훨씬 높은 HP
  const baseAtk = bossLevel * 80;
  const baseDef = bossLevel * 60;
  const baseLuk = bossLevel * 15;

  // 보스 이름 (매핑에서 가져오기)
  const bossName = bossNames[bossLevel] || `보스 ${bossLevel}`;

  // 보스가 사용할 수 있는 스킬 (레벨에 따라 다름)
  // 실제 skills 배열에 존재하는 스킬만 필터링하여 추가
  const availableSkillKeys = new Set(skills.map((s) => s.key));
  const bossSkills: SkillKey[] = [];

  if (bossLevel >= 5) {
    const level5Skills: SkillKey[] = ["slash", "iron_wall"];
    level5Skills.forEach((skillKey) => {
      if (availableSkillKeys.has(skillKey)) {
        bossSkills.push(skillKey);
      }
    });
  }
  if (bossLevel >= 10) {
    const level10Skills: SkillKey[] = ["slash", "double_stab", "poison_weapon"];
    level10Skills.forEach((skillKey) => {
      if (availableSkillKeys.has(skillKey)) {
        bossSkills.push(skillKey);
      }
    });
  }
  if (bossLevel >= 15) {
    const level15Skills: SkillKey[] = ["slash", "iron_wall", "power_strike"];
    level15Skills.forEach((skillKey) => {
      if (availableSkillKeys.has(skillKey)) {
        bossSkills.push(skillKey);
      }
    });
  }
  if (bossLevel >= 20) {
    const level20Skills: SkillKey[] = ["slash", "power_strike", "iron_wall",];
    level20Skills.forEach((skillKey) => {
      if (availableSkillKeys.has(skillKey)) {
        bossSkills.push(skillKey);
      }
    });
  }

  return {
    name: bossName,
    level: bossLevel,
    hp: baseHp,
    maxHp: baseHp,
    atk: baseAtk,
    def: baseDef,
    luk: baseLuk,
    skills: bossSkills,
    skillCooldowns: {},
    activeBuffs: [],
  };
};
