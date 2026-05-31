export const LOGICAL_WIDTH = 430;
export const MIN_FIELD_HEIGHT = 330;
export const MAX_ENEMIES = 150;
export const MAX_PARTICLES = 120;
export const MAX_POPUPS = 40;
export const MAX_EFFECTS = 50;
export const INVASION_CYCLE_SECONDS = 120;
export const CHOICE_BATTLE_SLOW_FACTOR = 0.1;
export const CHOICE_SECONDS = 8;
export const MAX_CORE_HP = 100;

export const PHASES = [
  {
    index: 0,
    id: 'scouts',
    name: '정찰대 침입',
    start: 0,
    end: 20,
    difficultyBonus: 0,
    spawnBonus: 0.15,
  },
  {
    index: 1,
    id: 'flood',
    name: '모험가 범람',
    start: 20,
    end: 50,
    difficultyBonus: 0.22,
    spawnBonus: 0.55,
  },
  {
    index: 2,
    id: 'kingdom',
    name: '왕국 공세',
    start: 50,
    end: 90,
    difficultyBonus: 0.54,
    spawnBonus: 0.9,
  },
  {
    index: 3,
    id: 'rush',
    name: '토벌대 러시',
    start: 90,
    end: 120,
    difficultyBonus: 1.05,
    spawnBonus: 1.65,
  },
] as const;

export const LANES = [46, 88, 130, 172, 215, 258, 300, 342, 384];

export const INITIAL_TIMERS = {
  cardMin: 16,
  cardMax: 22,
  buildMin: 35,
  buildMax: 45,
  riskMin: 52,
  riskMax: 72,
  skillMin: 68,
  skillMax: 86,
};

export const NEXT_TIMERS = {
  cardMin: 28,
  cardMax: 36,
  buildMin: 55,
  buildMax: 70,
  riskMin: 54,
  riskMax: 82,
  skillMin: 110,
  skillMax: 132,
};
