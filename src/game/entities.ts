export type EnemyType =
  | 'novice'
  | 'archer'
  | 'priest'
  | 'knight'
  | 'elite'
  | 'bomber'
  | 'banner'
  | 'shield';

export type FacilityType =
  | 'goblin_den'
  | 'spike_trap'
  | 'curse_altar'
  | 'treasure_bait'
  | 'fire_pot'
  | 'bone_prison'
  | 'demon_turret'
  | 'blood_sigil';

export type ChoiceType = 'card' | 'build' | 'risk' | 'skill';

export type SkillId = 'grasp' | 'hellfire' | 'time_rift' | 'blood_shield';

export type StatusKey = 'slow' | 'bind' | 'stun' | 'curse' | 'burn' | 'mark' | 'shielded';

export interface StatusMap {
  slow?: number;
  bind?: number;
  stun?: number;
  curse?: number;
  burn?: number;
  mark?: number;
  shielded?: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  vx: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  score: number;
  radius: number;
  elite: boolean;
  statuses: StatusMap;
  flash: number;
  wobble: number;
  healCooldown: number;
  dead?: boolean;
}

export interface Facility {
  id: number;
  type: FacilityType;
  level: number;
  x: number;
  yRatio: number;
  cooldown: number;
  pulse: number;
}

export interface Particle {
  id: number;
  kind: 'gold' | 'soul' | 'spark' | 'curse' | 'fire' | 'shield';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  targetCore?: boolean;
}

export interface Popup {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Effect {
  id: number;
  kind: 'slash' | 'spike' | 'curse' | 'explosion' | 'bind' | 'skill' | 'banner' | 'core-hit';
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  text?: string;
}

export interface ChoiceOption {
  id: string;
  type: ChoiceType;
  title: string;
  summary: string;
  detail: string;
  tags: string[];
}

export interface ChoiceState {
  id: number;
  type: ChoiceType;
  title: string;
  remaining: number;
  duration: number;
  options: ChoiceOption[];
}

export interface ChoiceRecord {
  elapsed: number;
  type: ChoiceType;
  id: string;
  title: string;
  auto: boolean;
  impact: string;
}

export interface RunStats {
  kills: number;
  eliteKills: number;
  goldEarned: number;
  maxCombo: number;
  highestInvasion: number;
  stageReached: number;
  skillUses: number;
  riskChoices: number;
  greedChoices: number;
  defenseChoices: number;
  autoChoices: number;
}

export interface Modifiers {
  goblinPower: number;
  spikePower: number;
  cursePower: number;
  baitPower: number;
  greed: number;
  gateOpen: number;
  soulHarvest: number;
  demonRage: number;
  riskPressure: number;
  eliteLure: number;
  rewardMultiplier: number;
  scoreMultiplier: number;
  shieldBias: number;
}
