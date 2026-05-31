import type { ChoiceOption, EnemyType, FacilityType, SkillId } from './entities';

export interface EnemyDefinition {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  score: number;
  radius: number;
  elite: boolean;
  color: string;
  accent: string;
}

export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyDefinition> = {
  novice: {
    name: '초보 용사',
    hp: 24,
    speed: 38,
    damage: 3,
    score: 10,
    radius: 10,
    elite: false,
    color: '#79b8ff',
    accent: '#f8e78a',
  },
  archer: {
    name: '궁수',
    hp: 20,
    speed: 54,
    damage: 3,
    score: 15,
    radius: 9,
    elite: false,
    color: '#7be080',
    accent: '#53351f',
  },
  priest: {
    name: '사제',
    hp: 32,
    speed: 31,
    damage: 4,
    score: 30,
    radius: 10,
    elite: false,
    color: '#f4f0d4',
    accent: '#f7bd42',
  },
  knight: {
    name: '기사',
    hp: 74,
    speed: 27,
    damage: 8,
    score: 50,
    radius: 12,
    elite: false,
    color: '#b9c0ca',
    accent: '#55718d',
  },
  elite: {
    name: '왕국 정예병',
    hp: 170,
    speed: 33,
    damage: 16,
    score: 150,
    radius: 14,
    elite: true,
    color: '#ffcf63',
    accent: '#d54b4b',
  },
  bomber: {
    name: '폭탄병',
    hp: 42,
    speed: 43,
    damage: 18,
    score: 45,
    radius: 11,
    elite: false,
    color: '#ff8652',
    accent: '#3f2830',
  },
  banner: {
    name: '깃발병',
    hp: 45,
    speed: 40,
    damage: 5,
    score: 40,
    radius: 11,
    elite: false,
    color: '#ff7c9d',
    accent: '#fce45b',
  },
  shield: {
    name: '방패병',
    hp: 92,
    speed: 23,
    damage: 7,
    score: 55,
    radius: 12,
    elite: false,
    color: '#a9d2e7',
    accent: '#ffffff',
  },
};

export interface FacilityDefinition {
  name: string;
  shortName: string;
  role: string;
  color: string;
  accent: string;
}

export const FACILITY_DEFINITIONS: Record<FacilityType, FacilityDefinition> = {
  goblin_den: {
    name: '고블린 소굴',
    shortName: '소굴',
    role: '단일 공격',
    color: '#5ac15e',
    accent: '#245c34',
  },
  spike_trap: {
    name: '가시 함정',
    shortName: '가시',
    role: '경로 피해',
    color: '#ccd5dc',
    accent: '#5a5e66',
  },
  curse_altar: {
    name: '저주 제단',
    shortName: '저주',
    role: '범위 지속 피해',
    color: '#b76dff',
    accent: '#4b246d',
  },
  treasure_bait: {
    name: '보물 미끼',
    shortName: '미끼',
    role: '감속과 골드',
    color: '#ffd35b',
    accent: '#ad6b25',
  },
  fire_pot: {
    name: '화염 항아리',
    shortName: '화염',
    role: '광역 폭발',
    color: '#ff763f',
    accent: '#67271f',
  },
  bone_prison: {
    name: '뼈 감옥',
    shortName: '뼈감옥',
    role: '속박',
    color: '#e7e2c6',
    accent: '#8b8365',
  },
  demon_turret: {
    name: '악마 포탑',
    shortName: '포탑',
    role: '정예 저격',
    color: '#ff4d83',
    accent: '#4d1630',
  },
  blood_sigil: {
    name: '피의 문장',
    shortName: '문장',
    role: '보호막',
    color: '#eb315a',
    accent: '#63172a',
  },
};

export const SKILL_DEFINITIONS: Record<SkillId, { name: string; shortName: string; summary: string; color: string }> = {
  grasp: {
    name: '마왕의 손아귀',
    shortName: '손아귀',
    summary: '중앙으로 끌어당기고 큰 피해',
    color: '#c084fc',
  },
  hellfire: {
    name: '지옥불 낙인',
    shortName: '지옥불',
    summary: '넓은 폭발과 화상',
    color: '#fb7185',
  },
  time_rift: {
    name: '시간 균열',
    shortName: '균열',
    summary: '전체 감속과 표식',
    color: '#67e8f9',
  },
  blood_shield: {
    name: '피의 보호막',
    shortName: '보호막',
    summary: '코어 보호막과 흡수',
    color: '#f43f5e',
  },
};

export const CARD_OPTIONS: ChoiceOption[] = [
  {
    id: 'goblin_reinforce',
    type: 'card',
    title: '고블린 증원',
    summary: '소굴 공격력/공속 크게 증가',
    detail: '초중반 처치가 빨라지고 초록 공격 이펙트가 늘어납니다.',
    tags: ['학살', '고블린'],
  },
  {
    id: 'spike_upgrade',
    type: 'card',
    title: '가시 강화',
    summary: '함정 피해와 코어 근처 방어 증가',
    detail: '가시가 더 크게 솟고 코어 앞 돌파를 늦춥니다.',
    tags: ['방어', '함정'],
  },
  {
    id: 'curse_spread',
    type: 'card',
    title: '저주 확산',
    summary: '저주 범위/틱 피해 증가',
    detail: '보라색 장판이 넓어져 물량 처리에 강해집니다.',
    tags: ['저주', '광역'],
  },
  {
    id: 'greed_contract',
    type: 'card',
    title: '탐욕의 계약',
    summary: '골드 +35%, 침공 압력 상승',
    detail: '골드 파티클이 늘지만 위험도가 빠르게 치솟습니다.',
    tags: ['탐욕', '위험'],
  },
  {
    id: 'gate_open',
    type: 'card',
    title: '침입문 개방',
    summary: '용사 수/보상 증가, 난이도 상승',
    detail: '상단 문이 커지고 즉시 추가 웨이브가 밀려옵니다.',
    tags: ['고득점', '위험'],
  },
  {
    id: 'bait_upgrade',
    type: 'card',
    title: '보물 미끼 강화',
    summary: '감속과 골드 보너스 증가',
    detail: '황금빛 미끼가 적의 발을 묶고 보상을 키웁니다.',
    tags: ['제어', '골드'],
  },
  {
    id: 'soul_harvest',
    type: 'card',
    title: '영혼 수확',
    summary: '점수/스킬 게이지 획득 증가',
    detail: '영혼 파티클이 늘고 스킬 준비가 빨라집니다.',
    tags: ['영혼', '스킬'],
  },
  {
    id: 'demon_rage',
    type: 'card',
    title: '마왕 분노',
    summary: '스킬 충전 효율 증가',
    detail: '스킬 버튼 발광이 강해지고 위기 때 더 빨리 찹니다.',
    tags: ['스킬', '분노'],
  },
  {
    id: 'mimic',
    type: 'card',
    title: '미믹 출현',
    summary: '폭발 피해 또는 무작위 보상',
    detail: '보상 상자가 튀어나와 터지거나 골드를 뿌립니다.',
    tags: ['폭발', '보상'],
  },
  {
    id: 'blood_barrier',
    type: 'card',
    title: '피의 보호막',
    summary: '코어 보호막 획득, 골드 보상 감소',
    detail: '붉은 보호막이 코어를 감싸지만 성장 속도는 낮아집니다.',
    tags: ['방어', '보호막'],
  },
  {
    id: 'elite_hunt',
    type: 'card',
    title: '정예 사냥',
    summary: '정예 점수 증가, 정예 출현률 증가',
    detail: '왕국 정예병이 더 자주 오고 처치 점수가 커집니다.',
    tags: ['정예', '위험'],
  },
  {
    id: 'black_sacrifice',
    type: 'card',
    title: '검은 제물',
    summary: '코어 HP 소모, 강한 성장',
    detail: '코어를 깎아 모든 시설을 한 단계 밀어올립니다.',
    tags: ['위험', '성장'],
  },
];

export const BUILD_OPTIONS: ChoiceOption[] = [
  buildOption('goblin_den', '고블린 학살형을 강화합니다.'),
  buildOption('spike_trap', '코어 근처 방어선을 두껍게 만듭니다.'),
  buildOption('curse_altar', '몰려오는 물량을 저주 장판으로 녹입니다.'),
  buildOption('treasure_bait', '감속과 골드 수급을 동시에 챙깁니다.'),
  buildOption('fire_pot', '위험하지만 폭발 점수 각을 만듭니다.'),
  buildOption('bone_prison', '짧은 속박으로 러시를 끊습니다.'),
  buildOption('demon_turret', '기사와 정예를 빠르게 저격합니다.'),
  buildOption('blood_sigil', '오래 버티는 보호막 빌드로 전환합니다.'),
];

export const RISK_OPTIONS: ChoiceOption[] = [
  {
    id: 'risk_ignore',
    type: 'risk',
    title: '무시한다',
    summary: '안정 진행, 점수 기대값 낮음',
    detail: '위험도가 조금 낮아지고 보상 배율은 유지됩니다.',
    tags: ['안정'],
  },
  {
    id: 'risk_open_gate',
    type: 'risk',
    title: '침입문을 더 연다',
    summary: '용사 수와 골드/점수 증가',
    detail: '즉시 물량이 늘고 이후 압력이 누적됩니다.',
    tags: ['위험', '고득점'],
  },
  {
    id: 'risk_lure_knights',
    type: 'risk',
    title: '왕국 기사단 유인',
    summary: '강적 즉시 등장, 큰 점수 보너스',
    detail: '기사와 정예가 몰려오지만 약탈 점수 배율이 오릅니다.',
    tags: ['정예', '고득점'],
  },
  {
    id: 'risk_sacrifice',
    type: 'risk',
    title: '제물을 바친다',
    summary: '코어 HP 감소, 강력한 성장',
    detail: '코어가 균열되지만 모든 공격 계열이 강화됩니다.',
    tags: ['위험', '성장'],
  },
  {
    id: 'risk_seal',
    type: 'risk',
    title: '성문을 봉한다',
    summary: '잠시 안정, 보상 감소',
    detail: '위험 압력을 낮추는 대신 보상 배율이 줄어듭니다.',
    tags: ['방어', '안정'],
  },
];

export const SKILL_OPTIONS: ChoiceOption[] = [
  {
    id: 'skill_grasp',
    type: 'skill',
    title: '손아귀 집중',
    summary: '마왕의 손아귀 피해/흡입 증가',
    detail: '끌어당김이 더 강해져 밀집된 용사를 한 번에 찢습니다.',
    tags: ['스킬', '끌어당김'],
  },
  {
    id: 'skill_hellfire',
    type: 'skill',
    title: '지옥불 확장',
    summary: '폭발 범위와 화상 증가',
    detail: '붉은 낙인이 전장을 덮고 화상 틱이 보입니다.',
    tags: ['스킬', '화상'],
  },
  {
    id: 'skill_rift',
    type: 'skill',
    title: '균열 고정',
    summary: '감속 지속시간 증가',
    detail: '푸른 균열이 길게 남아 러시 속도를 꺾습니다.',
    tags: ['스킬', '감속'],
  },
  {
    id: 'skill_blood',
    type: 'skill',
    title: '피의 장막',
    summary: '보호막량과 흡혈 증가',
    detail: '코어 주변에 붉은 막이 생겨 피격을 흡수합니다.',
    tags: ['스킬', '보호막'],
  },
];

function buildOption(type: FacilityType, detail: string): ChoiceOption {
  const facility = FACILITY_DEFINITIONS[type];
  return {
    id: `build_${type}`,
    type: 'build',
    title: facility.name,
    summary: facility.role,
    detail,
    tags: [facility.shortName, facility.role],
  };
}
