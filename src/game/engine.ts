import {
  CHOICE_BATTLE_SLOW_FACTOR,
  CHOICE_SECONDS,
  INITIAL_TIMERS,
  INVASION_CYCLE_SECONDS,
  LANES,
  LOGICAL_WIDTH,
  MAX_CORE_HP,
  MAX_EFFECTS,
  MAX_ENEMIES,
  MAX_PARTICLES,
  MAX_POPUPS,
  MIN_FIELD_HEIGHT,
  NEXT_TIMERS,
  PHASES,
} from './constants';
import {
  BUILD_OPTIONS,
  CARD_OPTIONS,
  ENEMY_DEFINITIONS,
  FACILITY_DEFINITIONS,
  RISK_OPTIONS,
  SKILL_DEFINITIONS,
  SKILL_OPTIONS,
} from './assets';
import {
  calculateDangerPercent,
  calculateDifficultyFromModifiers,
  estimateSkillChargePerSecond,
  getInvasionState,
  type InvasionState,
} from './balance';
import { calculateLootScore, endingLine, formatRunCode, rankForScore } from './scoring';
import type {
  ChoiceOption,
  ChoiceRecord,
  ChoiceState,
  ChoiceType,
  Effect,
  Enemy,
  EnemyType,
  Facility,
  FacilityType,
  Modifiers,
  Particle,
  Popup,
  RunStats,
  SkillId,
} from './entities';

type Rng = () => number;

export interface EngineOptions {
  canvas?: HTMLCanvasElement | null;
  onSnapshot?: (snapshot: EngineSnapshot) => void;
  seed?: number;
  debug?: boolean;
  debugTimeScale?: number;
  choiceSoon?: boolean;
  initialCoreHp?: number;
  initialSkillCharge?: number;
  initialRiskPressure?: number;
  disableDrawing?: boolean;
}

export interface ResultSummary {
  finalScore: number;
  rank: string;
  runCode: string;
  ending: string;
  playTime: number;
  majorBuild: string;
  stats: RunStats;
}

export interface EngineSnapshot {
  elapsed: number;
  invasion: number;
  phaseName: string;
  phaseIndex: number;
  timeToNext: number;
  cycleProgress: number;
  stageReached: number;
  score: number;
  gold: number;
  souls: number;
  combo: number;
  maxCombo: number;
  kills: number;
  eliteKills: number;
  coreHp: number;
  coreHpPercent: number;
  coreShield: number;
  difficulty: number;
  dangerPercent: number;
  userSpeed: 1 | 2 | 3;
  effectiveBattleScale: number;
  debugTimeScale: number;
  selectedSkill: SkillId;
  skillCharge: number;
  skillReady: boolean;
  skillBoosts: Record<SkillId, number>;
  buildDirection: string;
  recentChoice: string;
  toast: string;
  choice: ChoiceState | null;
  choiceHistory: ChoiceRecord[];
  timers: {
    card: number;
    build: number;
    risk: number;
    skill: number;
  };
  counts: {
    enemies: number;
    particles: number;
    popups: number;
  };
  result: ResultSummary | null;
}

interface PressureSnapshot {
  aliveEnemies: number;
  nearCoreEnemies: number;
  eliteEnemies: number;
}

const FACILITY_SLOTS = [
  { x: 64, yRatio: 0.7 },
  { x: 125, yRatio: 0.78 },
  { x: 186, yRatio: 0.66 },
  { x: 246, yRatio: 0.78 },
  { x: 307, yRatio: 0.7 },
  { x: 94, yRatio: 0.88 },
  { x: 215, yRatio: 0.88 },
  { x: 336, yRatio: 0.88 },
];

const BUILD_NAMES: Record<string, string> = {
  goblin_den: '고블린 학살형',
  spike_trap: '함정 방어형',
  curse_altar: '저주 장판형',
  treasure_bait: '미끼 제어형',
  fire_pot: '폭발 고득점형',
  bone_prison: '속박 제어형',
  demon_turret: '정예 저격형',
  blood_sigil: '보호막 생존형',
};

export function createInitialSnapshot(): EngineSnapshot {
  const state = getInvasionState(0);
  return {
    elapsed: 0,
    invasion: state.invasion,
    phaseName: state.phaseName,
    phaseIndex: state.phaseIndex,
    timeToNext: state.timeToNext,
    cycleProgress: state.cycleProgress,
    stageReached: state.stageReached,
    score: 0,
    gold: 0,
    souls: 0,
    combo: 0,
    maxCombo: 0,
    kills: 0,
    eliteKills: 0,
    coreHp: MAX_CORE_HP,
    coreHpPercent: 100,
    coreShield: 0,
    difficulty: 1,
    dangerPercent: 0,
    userSpeed: 1,
    effectiveBattleScale: 1,
    debugTimeScale: 1,
    selectedSkill: 'grasp',
    skillCharge: 0,
    skillReady: false,
    skillBoosts: { grasp: 0, hellfire: 0, time_rift: 0, blood_shield: 0 },
    buildDirection: '초기 마왕성',
    recentChoice: '기본 소굴과 가시 함정 배치',
    toast: '용사들이 침입문을 열고 있습니다',
    choice: null,
    choiceHistory: [],
    timers: { card: 18, build: 40, risk: 60, skill: 78 },
    counts: { enemies: 0, particles: 0, popups: 0 },
    result: null,
  };
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null = null;
  private onSnapshot?: (snapshot: EngineSnapshot) => void;
  private rng: Rng;
  private options: EngineOptions;
  private running = false;
  private rafId = 0;
  private lastFrame = 0;
  private snapshotTimer = 0;
  private elapsed = 0;
  private fieldHeight = 540;
  private idSeq = 1;
  private enemies: Enemy[] = [];
  private facilities: Facility[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private effects: Effect[] = [];
  private modifiers: Modifiers = defaultModifiers();
  private stats: RunStats = defaultStats();
  private buildScores: Record<string, number> = {};
  private coreHp = MAX_CORE_HP;
  private coreShield = 0;
  private coreDamageTaken = 0;
  private gold = 0;
  private souls = 0;
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private skillCharge = 0;
  private selectedSkill: SkillId = 'grasp';
  private skillBoosts: Record<SkillId, number> = { grasp: 0, hellfire: 0, time_rift: 0, blood_shield: 0 };
  private activeChoice: ChoiceState | null = null;
  private choiceHistory: ChoiceRecord[] = [];
  private nextCard = 18;
  private nextBuild = 40;
  private nextRisk = 60;
  private nextSkill = 78;
  private userSpeed: 1 | 2 | 3 = 1;
  private recentChoice = '기본 소굴과 가시 함정 배치';
  private toast = '용사들이 침입문을 열고 있습니다';
  private toastLife = 4;
  private spawnAccumulator = 0;
  private autoGrowthTimer = 8;
  private openingNoticeDone = false;
  private screenShake = 0;
  private result: ResultSummary | null = null;
  private previousState: InvasionState = getInvasionState(0);

  constructor(options: EngineOptions = {}) {
    this.options = options;
    this.canvas = options.canvas ?? null;
    this.onSnapshot = options.onSnapshot;
    this.rng = createRng(options.seed ?? Date.now());
    if (this.canvas && !options.disableDrawing) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.reset(true);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = nowMs();
    const loop = (time: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, (time - this.lastFrame) / 1000));
      this.lastFrame = time;
      this.tick(dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  restart(): void {
    this.reset(false);
  }

  setUserSpeed(speed: 1 | 2 | 3): void {
    this.userSpeed = this.userSpeed === speed && speed !== 1 ? 1 : speed;
    this.toast = `${this.userSpeed}배속 전투 흐름`;
    this.toastLife = 2.4;
    this.emitSnapshot(true);
  }

  useSkill(skill: SkillId = this.selectedSkill): boolean {
    if (this.result || this.skillCharge < 100) return false;
    this.selectedSkill = skill;
    const boost = this.skillBoosts[skill];
    const centerX = LOGICAL_WIDTH / 2;
    const coreY = this.coreY();

    if (skill === 'grasp') {
      const damage = 58 + boost * 24 + this.modifiers.demonRage * 10;
      for (const enemy of this.enemies) {
        enemy.x += (centerX - enemy.x) * (0.48 + boost * 0.05);
        enemy.y -= 20 + boost * 4;
        enemy.statuses.bind = Math.max(enemy.statuses.bind ?? 0, 1.2 + boost * 0.2);
        this.applyDamage(enemy, damage, 'skill');
      }
      this.addEffect('skill', centerX, coreY - 170, 128 + boost * 12, '#c084fc', '손아귀');
      this.toast = '마왕의 손아귀가 용사를 끌어당겼습니다';
    } else if (skill === 'hellfire') {
      const damage = 52 + boost * 22 + this.modifiers.demonRage * 8;
      for (const enemy of this.enemies) {
        enemy.statuses.burn = Math.max(enemy.statuses.burn ?? 0, 3.2 + boost * 0.5);
        this.applyDamage(enemy, damage, 'skill');
      }
      this.burstParticles(centerX, coreY - 210, 'fire', 28);
      this.addEffect('explosion', centerX, coreY - 200, 150 + boost * 18, '#fb7185', '지옥불');
      this.toast = '지옥불 낙인이 전장을 태웠습니다';
    } else if (skill === 'time_rift') {
      for (const enemy of this.enemies) {
        enemy.statuses.slow = Math.max(enemy.statuses.slow ?? 0, 5.8 + boost * 0.8);
        enemy.statuses.mark = Math.max(enemy.statuses.mark ?? 0, 4.2 + boost * 0.5);
        this.applyDamage(enemy, 18 + boost * 8, 'skill');
      }
      this.addEffect('skill', centerX, coreY - 210, 170 + boost * 16, '#67e8f9', '시간 균열');
      this.toast = '시간 균열이 러시 속도를 꺾었습니다';
    } else {
      const shield = 34 + boost * 16 + this.modifiers.shieldBias * 7;
      this.coreShield = Math.min(90, this.coreShield + shield);
      for (const enemy of this.enemies.filter((item) => item.y > coreY - 170)) {
        enemy.statuses.mark = Math.max(enemy.statuses.mark ?? 0, 3);
        this.applyDamage(enemy, 24 + boost * 8, 'skill');
      }
      this.burstParticles(centerX, coreY - 26, 'shield', 22);
      this.addEffect('skill', centerX, coreY - 30, 120 + boost * 12, '#f43f5e', '피의 장막');
      this.toast = '피의 보호막이 코어를 감쌌습니다';
    }

    this.skillCharge = 0;
    this.stats.skillUses += 1;
    this.screenShake = Math.max(this.screenShake, 14);
    this.toastLife = 3.2;
    this.compactCollections();
    this.emitSnapshot(true);
    return true;
  }

  chooseOption(optionId: string): boolean {
    if (!this.activeChoice) return false;
    const option = this.activeChoice.options.find((item) => item.id === optionId);
    if (!option) return false;
    this.applyChoice(option, false);
    return true;
  }

  forceChoice(type: ChoiceType): ChoiceState {
    this.openChoice(type);
    return this.activeChoice!;
  }

  getSnapshot(): EngineSnapshot {
    const invasion = getInvasionState(this.elapsed);
    const pressure = this.getPressure();
    const dangerPercent = calculateDangerPercent({
      ...pressure,
      coreDamageTaken: this.coreDamageTaken,
      invasion: invasion.invasion,
      riskPressure: this.modifiers.riskPressure,
    });
    const difficulty = calculateDifficultyFromModifiers(this.elapsed, this.modifiers, {
      ...pressure,
      coreDamageTaken: this.coreDamageTaken,
    });

    return {
      elapsed: this.elapsed,
      invasion: invasion.invasion,
      phaseName: invasion.phaseName,
      phaseIndex: invasion.phaseIndex,
      timeToNext: invasion.timeToNext,
      cycleProgress: invasion.cycleProgress,
      stageReached: invasion.stageReached,
      score: this.score,
      gold: this.gold,
      souls: this.souls,
      combo: this.combo,
      maxCombo: this.stats.maxCombo,
      kills: this.stats.kills,
      eliteKills: this.stats.eliteKills,
      coreHp: this.coreHp,
      coreHpPercent: Math.max(0, Math.round((this.coreHp / MAX_CORE_HP) * 100)),
      coreShield: this.coreShield,
      difficulty,
      dangerPercent,
      userSpeed: this.userSpeed,
      effectiveBattleScale: this.activeChoice ? CHOICE_BATTLE_SLOW_FACTOR * this.userSpeed : this.userSpeed,
      debugTimeScale: this.options.debugTimeScale ?? 1,
      selectedSkill: this.selectedSkill,
      skillCharge: this.skillCharge,
      skillReady: this.skillCharge >= 100,
      skillBoosts: { ...this.skillBoosts },
      buildDirection: this.getBuildDirection(),
      recentChoice: this.recentChoice,
      toast: this.toastLife > 0 ? this.toast : '',
      choice: this.activeChoice ? { ...this.activeChoice, options: [...this.activeChoice.options] } : null,
      choiceHistory: [...this.choiceHistory],
      timers: {
        card: Math.max(0, this.nextCard),
        build: Math.max(0, this.nextBuild),
        risk: Math.max(0, this.nextRisk),
        skill: Math.max(0, this.nextSkill),
      },
      counts: {
        enemies: this.enemies.length,
        particles: this.particles.length,
        popups: this.popups.length,
      },
      result: this.result ? { ...this.result, stats: { ...this.result.stats } } : null,
    };
  }

  tick(realDt: number): void {
    const speed = this.userSpeed * (this.options.debugTimeScale ?? 1);
    const timerDt = Math.max(0, realDt) * speed;

    if (!this.result) {
      this.processChoiceTimers(timerDt);
      const battleDt = timerDt * (this.activeChoice ? CHOICE_BATTLE_SLOW_FACTOR : 1);
      this.updateBattle(battleDt);
    } else {
      this.updateVisuals(timerDt);
    }

    if (!this.options.disableDrawing) this.draw();
    this.snapshotTimer += realDt;
    if (this.snapshotTimer >= 0.08 || this.result) {
      this.snapshotTimer = 0;
      this.emitSnapshot(false);
    }
  }

  private reset(useDebugInitials: boolean): void {
    this.elapsed = 0;
    this.fieldHeight = this.canvas?.clientHeight || this.fieldHeight || 540;
    this.idSeq = 1;
    this.enemies = [];
    this.facilities = [
      this.makeFacility('goblin_den', 0, 1),
      this.makeFacility('spike_trap', 3, 1),
    ];
    this.particles = [];
    this.popups = [];
    this.effects = [];
    this.modifiers = defaultModifiers();
    this.stats = defaultStats();
    this.buildScores = { goblin_den: 1, spike_trap: 1 };
    this.coreHp = useDebugInitials && this.options.initialCoreHp ? this.options.initialCoreHp : MAX_CORE_HP;
    this.coreShield = 0;
    this.coreDamageTaken = 0;
    this.gold = 0;
    this.souls = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.skillCharge = useDebugInitials ? this.options.initialSkillCharge ?? 0 : 0;
    this.selectedSkill = 'grasp';
    this.skillBoosts = { grasp: 0, hellfire: 0, time_rift: 0, blood_shield: 0 };
    this.activeChoice = null;
    this.choiceHistory = [];
    this.nextCard = this.options.choiceSoon ? 1.2 : this.randomRange(INITIAL_TIMERS.cardMin, INITIAL_TIMERS.cardMax);
    this.nextBuild = this.options.choiceSoon ? 3.2 : this.randomRange(INITIAL_TIMERS.buildMin, INITIAL_TIMERS.buildMax);
    this.nextRisk = this.options.choiceSoon ? 5.4 : this.randomRange(INITIAL_TIMERS.riskMin, INITIAL_TIMERS.riskMax);
    this.nextSkill = this.options.choiceSoon ? 7.4 : this.randomRange(INITIAL_TIMERS.skillMin, INITIAL_TIMERS.skillMax);
    this.userSpeed = 1;
    this.recentChoice = '기본 소굴과 가시 함정 배치';
    this.toast = '용사들이 침입문을 열고 있습니다';
    this.toastLife = 4;
    this.spawnAccumulator = 0;
    this.autoGrowthTimer = 8;
    this.openingNoticeDone = false;
    this.screenShake = 0;
    this.result = null;
    this.previousState = getInvasionState(0);
    if (useDebugInitials && this.options.initialRiskPressure) {
      this.modifiers.riskPressure = this.options.initialRiskPressure;
      this.modifiers.gateOpen = 1;
    }
    this.spawnInitialWave();
    this.emitSnapshot(true);
  }

  private updateBattle(dt: number): void {
    if (dt <= 0) return;
    const before = getInvasionState(this.elapsed);
    this.elapsed += dt;
    const after = getInvasionState(this.elapsed);
    this.stats.highestInvasion = Math.max(this.stats.highestInvasion, after.invasion);
    this.stats.stageReached = Math.max(this.stats.stageReached, after.stageReached);
    this.updatePhaseTransition(before, after);

    const pressure = this.getPressure();
    const dangerPercent = calculateDangerPercent({
      ...pressure,
      coreDamageTaken: this.coreDamageTaken,
      invasion: after.invasion,
      riskPressure: this.modifiers.riskPressure,
    });
    const difficulty = calculateDifficultyFromModifiers(this.elapsed, this.modifiers, {
      ...pressure,
      coreDamageTaken: this.coreDamageTaken,
    });

    this.spawnEnemies(dt, after, difficulty);
    this.updateFacilities(dt, difficulty);
    this.updateEnemies(dt, difficulty);
    this.updateAutoGrowth(dt);
    this.updateCombos(dt);
    this.updateSkillCharge(dt, dangerPercent);
    this.updateVisuals(dt);

    if (this.coreHp <= 0 && !this.result) {
      this.finishRun();
    }
    this.previousState = after;
  }

  private processChoiceTimers(timerDt: number): void {
    if (timerDt <= 0 || this.result) return;
    if (this.activeChoice) {
      this.activeChoice.remaining -= timerDt;
      if (this.activeChoice.remaining <= 0) {
        const picked = this.activeChoice.options[Math.floor(this.rng() * this.activeChoice.options.length)];
        this.applyChoice(picked, true);
      }
      return;
    }

    this.nextCard -= timerDt;
    this.nextBuild -= timerDt;
    this.nextRisk -= timerDt;
    this.nextSkill -= timerDt;

    if (this.nextCard <= 0) this.openChoice('card');
    else if (this.nextBuild <= 0) this.openChoice('build');
    else if (this.nextRisk <= 0) this.openChoice('risk');
    else if (this.nextSkill <= 0) this.openChoice('skill');
  }

  private openChoice(type: ChoiceType): void {
    const title =
      type === 'card'
        ? '마왕성 강화 카드'
        : type === 'build'
          ? '시설 건설 선택'
          : type === 'risk'
            ? '왕국의 도발장'
            : '마왕 스킬 변형';
    const pool =
      type === 'card' ? CARD_OPTIONS : type === 'build' ? BUILD_OPTIONS : type === 'risk' ? RISK_OPTIONS : SKILL_OPTIONS;
    this.activeChoice = {
      id: this.idSeq++,
      type,
      title,
      remaining: CHOICE_SECONDS,
      duration: CHOICE_SECONDS,
      options: this.sampleOptions(pool, 3),
    };
    this.toast = `${title} 선택 대기`;
    this.toastLife = 2.5;
  }

  private applyChoice(option: ChoiceOption, auto: boolean): void {
    if (!this.activeChoice) return;
    const impact = this.applyChoiceEffect(option);
    this.choiceHistory.push({
      elapsed: this.elapsed,
      type: option.type,
      id: option.id,
      title: option.title,
      auto,
      impact,
    });
    if (this.choiceHistory.length > 18) this.choiceHistory.shift();
    if (auto) this.stats.autoChoices += 1;
    this.recentChoice = `${option.title} - ${impact}`;
    this.toast = `${auto ? '자동 선택' : '선택'}: ${option.title}`;
    this.toastLife = 3.4;
    this.resetChoiceTimer(option.type);
    this.activeChoice = null;
    this.emitSnapshot(true);
  }

  private applyChoiceEffect(option: ChoiceOption): string {
    switch (option.id) {
      case 'goblin_reinforce':
        this.modifiers.goblinPower += 1;
        this.levelFacility('goblin_den');
        this.addBuildScore('goblin_den', 2);
        this.burstParticles(96, this.coreY() - 150, 'spark', 12);
        return '고블린 공격 강화';
      case 'spike_upgrade':
        this.modifiers.spikePower += 1;
        this.levelFacility('spike_trap');
        this.coreShield = Math.min(70, this.coreShield + 8);
        this.stats.defenseChoices += 1;
        this.addBuildScore('spike_trap', 2);
        return '함정 피해와 코어 방어 증가';
      case 'curse_spread':
        this.modifiers.cursePower += 1;
        this.levelFacility('curse_altar');
        this.addBuildScore('curse_altar', 2);
        return '저주 장판 확산';
      case 'greed_contract':
        this.modifiers.greed += 1;
        this.modifiers.rewardMultiplier += 0.35;
        this.modifiers.riskPressure += 4.5;
        this.stats.greedChoices += 1;
        return '보상 증가 / 위험도 상승';
      case 'gate_open':
        this.modifiers.gateOpen += 1;
        this.modifiers.rewardMultiplier += 0.38;
        this.modifiers.riskPressure += 7;
        this.stats.riskChoices += 1;
        this.spawnBurst(12 + this.modifiers.gateOpen * 3, 'novice');
        this.addEffect('banner', LOGICAL_WIDTH / 2, 60, 120, '#fb7185', '침입문 개방');
        return '물량과 보상 동시 증가';
      case 'bait_upgrade':
        this.modifiers.baitPower += 1;
        this.levelFacility('treasure_bait');
        this.addBuildScore('treasure_bait', 2);
        return '감속과 골드 보너스 강화';
      case 'soul_harvest':
        this.modifiers.soulHarvest += 1;
        this.modifiers.scoreMultiplier += 0.09;
        this.skillCharge = Math.min(100, this.skillCharge + 8);
        return '영혼 흡수와 스킬 충전 증가';
      case 'demon_rage':
        this.modifiers.demonRage += 1;
        this.skillCharge = Math.min(100, this.skillCharge + 10);
        return '스킬 충전 효율 증가';
      case 'mimic':
        if (this.rng() < 0.5) {
          this.gold += 80;
          this.stats.goldEarned += 80;
          this.burstParticles(LOGICAL_WIDTH / 2, this.coreY() - 180, 'gold', 26);
          return '미믹 골드 폭발';
        }
        this.explodeAt(LOGICAL_WIDTH / 2, this.coreY() - 190, 88, 55, '#ffcf63');
        return '미믹 폭발 피해';
      case 'blood_barrier':
        this.coreShield = Math.min(90, this.coreShield + 32);
        this.modifiers.rewardMultiplier = Math.max(0.75, this.modifiers.rewardMultiplier - 0.08);
        this.modifiers.shieldBias += 1;
        this.stats.defenseChoices += 1;
        this.addBuildScore('blood_sigil', 2);
        return '보호막 증가 / 보상 감소';
      case 'elite_hunt':
        this.modifiers.eliteLure += 1;
        this.modifiers.scoreMultiplier += 0.18;
        this.modifiers.riskPressure += 5;
        this.stats.riskChoices += 1;
        this.spawnBurst(4, 'knight');
        this.spawnBurst(1, 'elite');
        return '정예 점수와 출현률 증가';
      case 'black_sacrifice':
        this.damageCore(10, true);
        this.modifiers.goblinPower += 0.8;
        this.modifiers.spikePower += 0.8;
        this.modifiers.cursePower += 0.8;
        this.modifiers.riskPressure += 3;
        this.stats.riskChoices += 1;
        return '코어 희생 / 전 시설 강화';
      case 'risk_ignore':
        this.modifiers.riskPressure = Math.max(0, this.modifiers.riskPressure - 2.5);
        return '위험 압력 감소';
      case 'risk_open_gate':
        this.modifiers.gateOpen += 1;
        this.modifiers.rewardMultiplier += 0.45;
        this.modifiers.scoreMultiplier += 0.12;
        this.modifiers.riskPressure += 8;
        this.stats.riskChoices += 1;
        this.spawnBurst(16, 'novice');
        return '용사 수와 보상 증가';
      case 'risk_lure_knights':
        this.modifiers.eliteLure += 1.2;
        this.modifiers.scoreMultiplier += 0.22;
        this.modifiers.riskPressure += 8.5;
        this.stats.riskChoices += 1;
        this.spawnBurst(5, 'knight');
        this.spawnBurst(2, 'elite');
        return '강적 유입 / 점수 배율 증가';
      case 'risk_sacrifice':
        this.damageCore(14, true);
        this.modifiers.rewardMultiplier += 0.2;
        this.modifiers.scoreMultiplier += 0.16;
        this.modifiers.demonRage += 0.7;
        this.modifiers.riskPressure += 4;
        this.stats.riskChoices += 1;
        return '코어 희생 / 분노 성장';
      case 'risk_seal':
        this.modifiers.riskPressure = Math.max(0, this.modifiers.riskPressure - 6);
        this.modifiers.rewardMultiplier = Math.max(0.7, this.modifiers.rewardMultiplier - 0.12);
        this.coreShield = Math.min(85, this.coreShield + 16);
        this.stats.defenseChoices += 1;
        return '안정 증가 / 보상 감소';
      case 'skill_grasp':
        this.skillBoosts.grasp += 1;
        this.selectedSkill = 'grasp';
        return '손아귀 흡입 강화';
      case 'skill_hellfire':
        this.skillBoosts.hellfire += 1;
        this.selectedSkill = 'hellfire';
        return '지옥불 폭발 강화';
      case 'skill_rift':
        this.skillBoosts.time_rift += 1;
        this.selectedSkill = 'time_rift';
        return '시간 균열 감속 강화';
      case 'skill_blood':
        this.skillBoosts.blood_shield += 1;
        this.selectedSkill = 'blood_shield';
        this.modifiers.shieldBias += 0.5;
        return '보호막 스킬 강화';
      default:
        if (option.id.startsWith('build_')) {
          const facilityType = option.id.replace('build_', '') as FacilityType;
          this.levelFacility(facilityType);
          this.addBuildScore(facilityType, 3);
          if (facilityType === 'blood_sigil') {
            this.coreShield = Math.min(80, this.coreShield + 18);
            this.stats.defenseChoices += 1;
          }
          if (facilityType === 'fire_pot') this.modifiers.riskPressure += 1.5;
          return `${FACILITY_DEFINITIONS[facilityType].shortName} 빌드 강화`;
        }
        return '마왕성 변화';
    }
  }

  private resetChoiceTimer(type: ChoiceType): void {
    if (type === 'card') this.nextCard = this.randomRange(NEXT_TIMERS.cardMin, NEXT_TIMERS.cardMax);
    else if (type === 'build') this.nextBuild = this.randomRange(NEXT_TIMERS.buildMin, NEXT_TIMERS.buildMax);
    else if (type === 'risk') this.nextRisk = this.randomRange(NEXT_TIMERS.riskMin, NEXT_TIMERS.riskMax);
    else this.nextSkill = this.randomRange(NEXT_TIMERS.skillMin, NEXT_TIMERS.skillMax);
  }

  private spawnInitialWave(): void {
    for (let i = 0; i < 12; i += 1) {
      this.spawnEnemy(i % 4 === 1 ? 'archer' : 'novice', {
        y: 18 + i * 13,
        hpScale: i < 2 ? 0.34 : 0.72,
      });
    }
    this.addEffect('banner', LOGICAL_WIDTH / 2, 70, 125, '#facc15', '침입 시작');
  }

  private spawnEnemies(dt: number, state: InvasionState, difficulty: number): void {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const phase = PHASES[state.phaseIndex];
    const rushPulse = state.phaseId === 'rush' ? 1.4 + state.invasion * 0.12 : 0;
    const spawnRate =
      1.35 +
      phase.spawnBonus +
      (difficulty - 1) * 0.92 +
      this.modifiers.gateOpen * 0.42 +
      this.modifiers.riskPressure * 0.035 +
      rushPulse;
    this.spawnAccumulator += dt * spawnRate;
    const spawnCap = Math.max(1, Math.min(6, Math.ceil(difficulty * 0.85)));
    let count = 0;
    while (this.spawnAccumulator >= 1 && this.enemies.length < MAX_ENEMIES && count < spawnCap) {
      this.spawnAccumulator -= 1;
      this.spawnEnemy(this.pickEnemyType(state));
      count += 1;
      if (state.phaseId === 'rush' && this.rng() < 0.28) {
        this.spawnEnemy(this.pickEnemyType(state));
      }
    }
  }

  private pickEnemyType(state: InvasionState): EnemyType {
    const roll = this.rng();
    const phase = state.phaseIndex;
    const late = state.invasion >= 2;
    const eliteChance = Math.min(0.24, 0.025 * Math.max(0, state.invasion - 1) + this.modifiers.eliteLure * 0.035);
    if (late && roll < eliteChance) return 'elite';
    if (phase >= 2 && roll < 0.13 + state.invasion * 0.02) return 'knight';
    if (phase >= 1 && roll < 0.22) return 'priest';
    if (phase >= 2 && roll < 0.3) return 'shield';
    if (phase >= 1 && roll < 0.43) return 'bomber';
    if (phase >= 1 && roll < 0.56) return 'banner';
    if (roll < 0.72) return 'archer';
    return 'novice';
  }

  private spawnEnemy(type: EnemyType, overrides: { y?: number; hpScale?: number } = {}): Enemy {
    const state = getInvasionState(this.elapsed);
    const def = ENEMY_DEFINITIONS[type];
    const cycleScale = 1 + Math.max(0, state.invasion - 1) * 0.52 + Math.pow(Math.max(0, state.invasion - 1), 1.4) * 0.23;
    const phaseScale = 1 + state.phaseIndex * 0.13;
    const riskScale = 1 + this.modifiers.riskPressure * 0.018 + this.modifiers.gateOpen * 0.06;
    const lane = LANES[Math.floor(this.rng() * LANES.length)];
    const enemy: Enemy = {
      id: this.idSeq++,
      type,
      name: def.name,
      x: lane + this.randomRange(-7, 7),
      y: overrides.y ?? this.randomRange(-34, -10),
      vx: 0,
      hp: def.hp * cycleScale * phaseScale * riskScale * (overrides.hpScale ?? 1),
      maxHp: def.hp * cycleScale * phaseScale * riskScale * (overrides.hpScale ?? 1),
      speed: def.speed * (1 + Math.max(0, state.invasion - 1) * 0.13 + state.phaseIndex * 0.05 + this.modifiers.riskPressure * 0.006),
      damage: def.damage * (1 + Math.max(0, state.invasion - 1) * 0.34 + state.phaseIndex * 0.12 + this.modifiers.riskPressure * 0.018),
      score: def.score,
      radius: def.radius,
      elite: def.elite,
      statuses: {},
      flash: 0,
      wobble: this.rng() * Math.PI * 2,
      healCooldown: 1.2 + this.rng(),
    };
    if (type === 'shield') enemy.statuses.shielded = 999;
    this.enemies.push(enemy);
    return enemy;
  }

  private spawnBurst(count: number, type?: EnemyType): void {
    for (let i = 0; i < count && this.enemies.length < MAX_ENEMIES; i += 1) {
      this.spawnEnemy(type ?? this.pickEnemyType(getInvasionState(this.elapsed)), {
        y: this.randomRange(-60, 35),
        hpScale: type === 'elite' ? 1 : 0.95,
      });
    }
  }

  private updateFacilities(dt: number, difficulty: number): void {
    for (const facility of this.facilities) {
      facility.cooldown -= dt;
      facility.pulse = Math.max(0, facility.pulse - dt * 3);
      const fy = this.facilityY(facility);

      if (facility.type === 'treasure_bait') {
        const range = 56 + facility.level * 8 + this.modifiers.baitPower * 12;
        for (const enemy of this.enemies) {
          if (distance(enemy.x, enemy.y, facility.x, fy) <= range) {
            enemy.statuses.slow = Math.max(enemy.statuses.slow ?? 0, 0.55);
          }
        }
      }

      if (facility.cooldown > 0) continue;
      facility.pulse = 1;

      if (facility.type === 'goblin_den') {
        const target = this.findTarget((enemy) => enemy.y > 20);
        if (target) {
          const damage = (20 + facility.level * 8) * (1 + this.modifiers.goblinPower * 0.32);
          target.vx += (target.x < facility.x ? -1 : 1) * 18;
          target.y -= 4;
          this.applyDamage(target, damage, 'facility');
          this.addEffect('slash', target.x, target.y, 24, '#7ddf64');
        }
        facility.cooldown = Math.max(0.22, 0.82 - facility.level * 0.05 - this.modifiers.goblinPower * 0.08);
      } else if (facility.type === 'spike_trap') {
        const range = 42 + facility.level * 5;
        const damage = (16 + facility.level * 6) * (1 + this.modifiers.spikePower * 0.42);
        for (const enemy of this.enemies.filter((item) => Math.abs(item.y - fy) < range)) {
          enemy.y -= 10 + this.modifiers.spikePower * 2;
          enemy.statuses.stun = Math.max(enemy.statuses.stun ?? 0, 0.18);
          this.applyDamage(enemy, damage, 'facility');
        }
        this.addEffect('spike', facility.x, fy, 48 + facility.level * 3, '#e5e7eb');
        facility.cooldown = Math.max(0.35, 1.05 - facility.level * 0.06);
      } else if (facility.type === 'curse_altar') {
        const range = 74 + facility.level * 8 + this.modifiers.cursePower * 14;
        for (const enemy of this.enemies.filter((item) => distance(item.x, item.y, facility.x, fy) <= range)) {
          enemy.statuses.curse = Math.max(enemy.statuses.curse ?? 0, 2.4 + this.modifiers.cursePower * 0.25);
          this.applyDamage(enemy, 9 + facility.level * 4 + this.modifiers.cursePower * 5, 'facility');
        }
        this.addEffect('curse', facility.x, fy, range, '#b76dff');
        facility.cooldown = Math.max(0.48, 1.18 - facility.level * 0.05);
      } else if (facility.type === 'fire_pot') {
        const target = this.findDensestTarget();
        if (target) this.explodeAt(target.x, target.y, 64 + facility.level * 8, 42 + facility.level * 15, '#ff763f');
        facility.cooldown = Math.max(2.3, 4.6 - facility.level * 0.22);
      } else if (facility.type === 'bone_prison') {
        const target = this.findDensestTarget();
        if (target) {
          const range = 56 + facility.level * 7;
          for (const enemy of this.enemies.filter((item) => distance(item.x, item.y, target.x, target.y) <= range)) {
            enemy.statuses.bind = Math.max(enemy.statuses.bind ?? 0, 1.35 + facility.level * 0.12);
            this.applyDamage(enemy, 12 + facility.level * 4, 'facility');
          }
          this.addEffect('bind', target.x, target.y, range, '#e7e2c6');
        }
        facility.cooldown = Math.max(3.4, 6.4 - facility.level * 0.18);
      } else if (facility.type === 'demon_turret') {
        const target = this.findTarget((enemy) => enemy.elite) ?? this.findTarget((enemy) => enemy.hp > enemy.maxHp * 0.45);
        if (target) {
          const damage = (46 + facility.level * 18) * (target.elite ? 1.4 : 1);
          target.statuses.mark = Math.max(target.statuses.mark ?? 0, 2.2);
          this.applyDamage(target, damage, 'facility');
          this.addEffect('slash', target.x, target.y, 34, '#ff4d83');
        }
        facility.cooldown = Math.max(0.8, 1.8 - facility.level * 0.08);
      } else if (facility.type === 'blood_sigil') {
        this.coreShield = Math.min(96, this.coreShield + 4 + facility.level * 2 + this.modifiers.shieldBias);
        const target = this.findTarget((enemy) => enemy.y > this.coreY() - 180);
        if (target) this.applyDamage(target, 18 + facility.level * 6, 'facility');
        this.addEffect('skill', facility.x, fy, 44 + facility.level * 5, '#eb315a');
        facility.cooldown = Math.max(2.2, 4.3 - facility.level * 0.15);
      }
    }

    if (difficulty > 2.4 && this.rng() < dt * 0.35) {
      const banner = this.enemies.find((enemy) => enemy.type === 'banner');
      if (banner) {
        for (const enemy of this.enemies) {
          if (enemy.id !== banner.id && distance(enemy.x, enemy.y, banner.x, banner.y) < 65) enemy.y += dt * 12;
        }
      }
    }
  }

  private updateEnemies(dt: number, difficulty: number): void {
    const coreY = this.coreY();
    for (const enemy of [...this.enemies]) {
      if (enemy.dead) continue;
      enemy.flash = Math.max(0, enemy.flash - dt * 6);
      enemy.wobble += dt * 5;
      tickStatus(enemy.statuses, dt);
      if ((enemy.statuses.curse ?? 0) > 0) this.applyDamage(enemy, dt * (5 + this.modifiers.cursePower * 2.8), 'dot');
      if ((enemy.statuses.burn ?? 0) > 0) this.applyDamage(enemy, dt * (9 + this.skillBoosts.hellfire * 3), 'dot');
      if (enemy.dead) continue;

      if (enemy.type === 'priest') {
        enemy.healCooldown -= dt;
        if (enemy.healCooldown <= 0) {
          enemy.healCooldown = 1.6;
          for (const ally of this.enemies.filter((item) => item.id !== enemy.id && distance(item.x, item.y, enemy.x, enemy.y) < 62)) {
            ally.hp = Math.min(ally.maxHp, ally.hp + 10 + difficulty * 2.2);
            this.addPopup('+', ally.x, ally.y - 12, '#f7e99b', 12);
          }
          this.addEffect('skill', enemy.x, enemy.y, 34, '#f4f0d4');
        }
      }

      const stopped = (enemy.statuses.stun ?? 0) > 0 || (enemy.statuses.bind ?? 0) > 0;
      const slowFactor = (enemy.statuses.slow ?? 0) > 0 ? 0.48 : 1;
      const shieldSlow = enemy.type === 'shield' ? 0.92 : 1;
      if (!stopped) enemy.y += enemy.speed * slowFactor * shieldSlow * dt;
      enemy.x += enemy.vx * dt;
      enemy.vx *= Math.max(0, 1 - dt * 4.5);
      enemy.x = clamp(enemy.x, 22, LOGICAL_WIDTH - 22);

      if (enemy.y >= coreY) {
        this.hitCore(enemy);
      }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
  }

  private updateAutoGrowth(dt: number): void {
    if (!this.openingNoticeDone && this.elapsed >= 6) {
      this.openingNoticeDone = true;
      this.toast = '자동 성장 예고: 첫 골드가 소굴로 모입니다';
      this.toastLife = 3;
    }

    this.autoGrowthTimer -= dt;
    if (this.autoGrowthTimer > 0) return;
    this.autoGrowthTimer = 9.5;
    const target = [...this.facilities].sort((a, b) => a.level - b.level)[0];
    if (!target) return;
    const cost = 24 + target.level * 18;
    if (this.gold < cost) return;
    this.gold -= cost;
    target.level += 1;
    target.pulse = 1;
    this.recentChoice = `자동 성장 - ${FACILITY_DEFINITIONS[target.type].shortName} Lv${target.level}`;
    this.toast = this.recentChoice;
    this.toastLife = 2.8;
  }

  private updateCombos(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  private updateSkillCharge(dt: number, dangerPercent: number): void {
    if (this.skillCharge >= 100) return;
    const perSecond = estimateSkillChargePerSecond({
      dangerPercent,
      demonRage: this.modifiers.demonRage,
      soulHarvest: this.modifiers.soulHarvest,
      debug: this.options.debug,
    });
    this.skillCharge = Math.min(100, this.skillCharge + perSecond * dt);
  }

  private updateVisuals(dt: number): void {
    this.toastLife = Math.max(0, this.toastLife - dt);
    this.screenShake = Math.max(0, this.screenShake - dt * 30);
    for (const particle of this.particles) {
      particle.life -= dt;
      if (particle.targetCore) {
        const tx = LOGICAL_WIDTH / 2;
        const ty = this.coreY() - 20;
        particle.vx += (tx - particle.x) * dt * 3;
        particle.vy += (ty - particle.y) * dt * 3;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.max(0, 1 - dt * 1.5);
      particle.vy *= Math.max(0, 1 - dt * 1.5);
    }
    for (const popup of this.popups) {
      popup.life -= dt;
      popup.y -= dt * 24;
    }
    for (const effect of this.effects) {
      effect.life -= dt;
    }
    this.particles = this.particles.filter((item) => item.life > 0);
    this.popups = this.popups.filter((item) => item.life > 0);
    this.effects = this.effects.filter((item) => item.life > 0);
    this.compactCollections();
  }

  private updatePhaseTransition(before: InvasionState, after: InvasionState): void {
    if (before.invasion !== after.invasion) {
      this.modifiers.riskPressure += 3 + after.invasion * 0.8;
      this.addEffect('banner', LOGICAL_WIDTH / 2, 84, 155, '#fb7185', `침공 ${after.invasion}차`);
      this.toast = `침공 ${after.invasion}차: 왕국 압력이 급상승`;
      this.toastLife = 4;
      this.spawnBurst(10 + after.invasion * 4);
      this.screenShake = Math.max(this.screenShake, 10);
    } else if (before.phaseIndex !== after.phaseIndex) {
      const text = after.phaseIndex === 3 ? '러시 경고' : after.phaseName;
      const color = after.phaseIndex === 3 ? '#ef4444' : '#facc15';
      this.addEffect('banner', LOGICAL_WIDTH / 2, 82, 130, color, text);
      this.toast = after.phaseIndex === 3 ? '토벌대 러시: 화면 밀도가 급증합니다' : `${after.phaseName} 진입`;
      this.toastLife = 3.2;
    }
  }

  private applyDamage(enemy: Enemy, amount: number, source: 'facility' | 'skill' | 'dot'): void {
    if (enemy.dead) return;
    let finalAmount = amount;
    if ((enemy.statuses.mark ?? 0) > 0) finalAmount *= 1.22;
    if (enemy.type === 'shield' && source !== 'skill') finalAmount *= 0.72;
    enemy.hp -= finalAmount;
    enemy.flash = 1;
    if (source !== 'dot' || this.rng() < 0.16) {
      this.addPopup(Math.round(finalAmount).toString(), enemy.x, enemy.y - enemy.radius, source === 'skill' ? '#fef3c7' : '#ffffff', source === 'skill' ? 15 : 11);
    }
    if (enemy.hp <= 0) this.killEnemy(enemy, source);
  }

  private killEnemy(enemy: Enemy, source: string): void {
    if (enemy.dead) return;
    enemy.dead = true;
    const state = getInvasionState(this.elapsed);
    const cycleReward = 1 + Math.max(0, state.invasion - 1) * 0.38;
    const baitBonus = (enemy.statuses.slow ?? 0) > 0 ? 1 + this.modifiers.baitPower * 0.18 : 1;
    const reward = Math.max(1, this.modifiers.rewardMultiplier * cycleReward * baitBonus);
    const scoreMultiplier = this.modifiers.scoreMultiplier * (1 + this.combo * 0.012);
    const goldGain = Math.max(1, Math.round((enemy.score * 0.34 + (enemy.elite ? 18 : 3)) * reward));
    const soulGain = enemy.elite ? 4 : enemy.type === 'priest' || enemy.type === 'knight' ? 2 : 1;
    const scoreGain = Math.round((enemy.score + goldGain) * scoreMultiplier);

    this.gold += goldGain;
    this.souls += soulGain;
    this.score += scoreGain;
    this.stats.kills += 1;
    if (enemy.elite) this.stats.eliteKills += 1;
    this.stats.goldEarned += goldGain;
    this.combo += 1;
    this.comboTimer = 2.8;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    this.skillCharge = Math.min(
      100,
      this.skillCharge + (enemy.elite ? 1.15 : 0.23) * (1 + this.modifiers.soulHarvest * 0.16 + this.modifiers.demonRage * 0.1),
    );

    this.addPopup(`+${scoreGain}`, enemy.x, enemy.y - 16, enemy.elite ? '#fde68a' : '#e0f2fe', enemy.elite ? 18 : 13);
    this.addPopup(`${this.combo} COMBO`, LOGICAL_WIDTH / 2, this.coreY() - 220, '#facc15', Math.min(22, 12 + this.combo * 0.03));
    this.spawnRewardParticles(enemy.x, enemy.y, goldGain, soulGain);
    if (enemy.elite) {
      this.addEffect('explosion', enemy.x, enemy.y, 70, '#facc15', '정예 처치');
      this.screenShake = Math.max(this.screenShake, 8);
    } else if (source === 'skill') {
      this.addEffect('skill', enemy.x, enemy.y, 38, '#c084fc');
    }
  }

  private hitCore(enemy: Enemy): void {
    const damage = enemy.damage;
    this.damageCore(damage, false);
    this.addEffect(enemy.type === 'bomber' ? 'explosion' : 'core-hit', enemy.x, this.coreY(), enemy.type === 'bomber' ? 72 : 42, '#fb7185');
    this.addPopup(`-${Math.round(damage)}`, LOGICAL_WIDTH / 2, this.coreY() - 42, '#fb7185', enemy.elite ? 18 : 14);
    this.modifiers.riskPressure += enemy.elite ? 1.4 : 0.35;
    this.screenShake = Math.max(this.screenShake, enemy.elite || enemy.type === 'bomber' ? 13 : 7);
    enemy.dead = true;
  }

  private damageCore(amount: number, direct: boolean): void {
    let remaining = amount;
    if (this.coreShield > 0 && !direct) {
      const absorbed = Math.min(this.coreShield, remaining);
      this.coreShield -= absorbed;
      remaining -= absorbed;
      this.addPopup('보호막', LOGICAL_WIDTH / 2, this.coreY() - 72, '#fb7185', 12);
    }
    if (remaining > 0) {
      this.coreHp = Math.max(0, this.coreHp - remaining);
      this.coreDamageTaken += remaining;
    }
  }

  private finishRun(): void {
    const finalScore = calculateLootScore({
      kills: this.stats.kills,
      eliteKills: this.stats.eliteKills,
      goldEarned: this.stats.goldEarned,
      maxCombo: this.stats.maxCombo,
      stageReached: this.stats.stageReached,
      highestInvasion: this.stats.highestInvasion,
      riskMultiplier: this.modifiers.scoreMultiplier,
    });
    this.score = finalScore;
    this.result = {
      finalScore,
      rank: rankForScore(finalScore),
      runCode: formatRunCode(finalScore, this.stats),
      ending: endingLine(this.stats),
      playTime: this.elapsed,
      majorBuild: this.getBuildDirection(),
      stats: { ...this.stats },
    };
    this.activeChoice = null;
    this.addEffect('banner', LOGICAL_WIDTH / 2, this.coreY() - 160, 170, '#ef4444', '마왕성 붕괴');
    this.emitSnapshot(true);
  }

  private levelFacility(type: FacilityType): void {
    const existing = this.facilities.find((facility) => facility.type === type);
    if (existing) {
      existing.level += 1;
      existing.pulse = 1;
      return;
    }
    const usedSlots = new Set(this.facilities.map((facility) => facility.id));
    const slotIndex = FACILITY_SLOTS.findIndex((_, index) => !usedSlots.has(index));
    this.facilities.push(this.makeFacility(type, slotIndex >= 0 ? slotIndex : this.facilities.length % FACILITY_SLOTS.length, 1));
  }

  private makeFacility(type: FacilityType, slotIndex: number, level: number): Facility {
    const slot = FACILITY_SLOTS[slotIndex] ?? FACILITY_SLOTS[0];
    return {
      id: slotIndex,
      type,
      level,
      x: slot.x,
      yRatio: slot.yRatio,
      cooldown: 0.12 + this.rng() * 0.25,
      pulse: 0,
    };
  }

  private addBuildScore(type: FacilityType, amount: number): void {
    this.buildScores[type] = (this.buildScores[type] ?? 0) + amount;
  }

  private getBuildDirection(): string {
    const best = Object.entries(this.buildScores).sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] < 2) return '초기 마왕성';
    return BUILD_NAMES[best[0]] ?? '혼합 성장형';
  }

  private findTarget(predicate: (enemy: Enemy) => boolean): Enemy | undefined {
    return this.enemies
      .filter((enemy) => !enemy.dead && predicate(enemy))
      .sort((a, b) => b.y - a.y || b.hp - a.hp)[0];
  }

  private findDensestTarget(): Enemy | undefined {
    let best: Enemy | undefined;
    let bestScore = -1;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const nearby = this.enemies.filter((item) => !item.dead && distance(item.x, item.y, enemy.x, enemy.y) < 70).length;
      const score = nearby + (enemy.elite ? 2 : 0) + enemy.y / 400;
      if (score > bestScore) {
        best = enemy;
        bestScore = score;
      }
    }
    return best;
  }

  private explodeAt(x: number, y: number, radius: number, damage: number, color: string): void {
    for (const enemy of this.enemies.filter((item) => !item.dead && distance(item.x, item.y, x, y) <= radius)) {
      enemy.statuses.burn = Math.max(enemy.statuses.burn ?? 0, 1.8);
      this.applyDamage(enemy, damage, 'facility');
    }
    this.addEffect('explosion', x, y, radius, color);
    this.burstParticles(x, y, 'fire', 18);
  }

  private spawnRewardParticles(x: number, y: number, goldGain: number, souls: number): void {
    const goldCount = Math.min(12, 2 + Math.floor(goldGain / 12) + this.modifiers.greed);
    for (let i = 0; i < goldCount; i += 1) this.addParticle('gold', x, y, true);
    for (let i = 0; i < Math.min(7, souls + this.modifiers.soulHarvest); i += 1) this.addParticle('soul', x, y, true);
  }

  private burstParticles(x: number, y: number, kind: Particle['kind'], count: number): void {
    for (let i = 0; i < count; i += 1) this.addParticle(kind, x, y, false);
  }

  private addParticle(kind: Particle['kind'], x: number, y: number, targetCore: boolean): void {
    const angle = this.rng() * Math.PI * 2;
    const speed = this.randomRange(18, 70);
    this.particles.push({
      id: this.idSeq++,
      kind,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 25,
      life: targetCore ? 1.25 : this.randomRange(0.45, 0.9),
      maxLife: targetCore ? 1.25 : 0.9,
      targetCore,
    });
  }

  private addPopup(text: string, x: number, y: number, color: string, size: number): void {
    this.popups.push({
      id: this.idSeq++,
      text,
      x,
      y,
      color,
      size,
      life: 0.9,
      maxLife: 0.9,
    });
  }

  private addEffect(kind: Effect['kind'], x: number, y: number, radius: number, color: string, text?: string): void {
    this.effects.push({
      id: this.idSeq++,
      kind,
      x,
      y,
      radius,
      color,
      text,
      life: kind === 'banner' ? 1.7 : 0.65,
      maxLife: kind === 'banner' ? 1.7 : 0.65,
    });
  }

  private compactCollections(): void {
    if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    if (this.popups.length > MAX_POPUPS) this.popups.splice(0, this.popups.length - MAX_POPUPS);
    if (this.effects.length > MAX_EFFECTS) this.effects.splice(0, this.effects.length - MAX_EFFECTS);
    if (this.enemies.length > MAX_ENEMIES) this.enemies.splice(0, this.enemies.length - MAX_ENEMIES);
  }

  private getPressure(): PressureSnapshot {
    const coreLine = this.coreY() - 120;
    return {
      aliveEnemies: this.enemies.length,
      nearCoreEnemies: this.enemies.filter((enemy) => enemy.y >= coreLine).length,
      eliteEnemies: this.enemies.filter((enemy) => enemy.elite).length,
    };
  }

  private facilityY(facility: Facility): number {
    return Math.max(150, this.fieldHeight * facility.yRatio);
  }

  private coreY(): number {
    return Math.max(MIN_FIELD_HEIGHT - 46, this.fieldHeight - 58);
  }

  private sampleOptions(pool: ChoiceOption[], count: number): ChoiceOption[] {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  private randomRange(min: number, max: number): number {
    return min + (max - min) * this.rng();
  }

  private emitSnapshot(force: boolean): void {
    if (!force && !this.onSnapshot) return;
    this.onSnapshot?.(this.getSnapshot());
  }

  private draw(): void {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const width = Math.max(1, rect.width);
    const height = Math.max(MIN_FIELD_HEIGHT, rect.height);
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    this.fieldHeight = height;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const shakeX = this.screenShake > 0 ? this.randomRange(-this.screenShake, this.screenShake) * 0.25 : 0;
    const shakeY = this.screenShake > 0 ? this.randomRange(-this.screenShake, this.screenShake) * 0.18 : 0;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.scale(width / LOGICAL_WIDTH, 1);
    this.drawBackground(ctx, height);
    this.drawGate(ctx);
    this.drawEffects(ctx, false);
    this.drawEnemies(ctx);
    this.drawFacilities(ctx);
    this.drawCore(ctx);
    this.drawParticles(ctx);
    this.drawPopups(ctx);
    this.drawEffects(ctx, true);
    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#160a1d');
    gradient.addColorStop(0.42, '#201129');
    gradient.addColorStop(1, '#0c0710');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, height);
    ctx.fillStyle = '#2a172d';
    for (let y = 30; y < height; y += 34) {
      ctx.fillRect(22, y, 2, 14);
      ctx.fillRect(LOGICAL_WIDTH - 24, y + 15, 2, 14);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (const lane of LANES) {
      ctx.beginPath();
      ctx.moveTo(lane, 72);
      ctx.lineTo(LOGICAL_WIDTH / 2 + (lane - LOGICAL_WIDTH / 2) * 0.42, this.coreY() - 36);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, this.coreY() - 126, LOGICAL_WIDTH, 2);
    ctx.fillStyle = 'rgba(239,68,68,0.08)';
    ctx.fillRect(0, this.coreY() - 92, LOGICAL_WIDTH, 92);
  }

  private drawGate(ctx: CanvasRenderingContext2D): void {
    const gateWidth = 138 + this.modifiers.gateOpen * 14;
    const x = LOGICAL_WIDTH / 2 - gateWidth / 2;
    ctx.fillStyle = '#3a3340';
    ctx.fillRect(x - 16, 10, gateWidth + 32, 56);
    ctx.fillStyle = '#4b4651';
    for (let i = 0; i < 7; i += 1) ctx.fillRect(x - 10 + i * ((gateWidth + 20) / 7), 8, 24, 12);
    ctx.fillStyle = '#120817';
    ctx.fillRect(x, 26, gateWidth, 42);
    const pulse = 0.45 + Math.sin(this.elapsed * 5) * 0.1;
    ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.fillRect(x + 10, 32, gateWidth - 20, 32);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('침입문', LOGICAL_WIDTH / 2, 22);
  }

  private drawEnemies(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      const def = ENEMY_DEFINITIONS[enemy.type];
      const bob = Math.sin(enemy.wobble) * 2;
      ctx.save();
      ctx.translate(Math.round(enemy.x), Math.round(enemy.y + bob));
      if ((enemy.statuses.slow ?? 0) > 0) {
        ctx.fillStyle = 'rgba(103,232,249,0.22)';
        ctx.fillRect(-enemy.radius - 3, enemy.radius + 4, enemy.radius * 2 + 6, 4);
      }
      if ((enemy.statuses.curse ?? 0) > 0) {
        ctx.strokeStyle = 'rgba(183,109,255,0.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-enemy.radius - 4, -enemy.radius - 6, enemy.radius * 2 + 8, enemy.radius * 2 + 10);
      }
      if ((enemy.statuses.bind ?? 0) > 0 || (enemy.statuses.stun ?? 0) > 0) {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-10, -enemy.radius - 14, 20, 3);
        ctx.fillRect(-7, -enemy.radius - 18, 14, 3);
      }
      ctx.fillStyle = '#f5d6aa';
      ctx.fillRect(-5, -enemy.radius - 7, 10, 8);
      ctx.fillStyle = def.color;
      ctx.fillRect(-enemy.radius, -enemy.radius + 1, enemy.radius * 2, enemy.radius * 2);
      ctx.fillStyle = def.accent;
      ctx.fillRect(-enemy.radius + 3, -enemy.radius + 5, enemy.radius * 2 - 6, 5);
      if (enemy.type === 'knight' || enemy.type === 'elite' || enemy.type === 'shield') {
        ctx.fillStyle = enemy.type === 'elite' ? '#ef4444' : '#dce4ea';
        ctx.fillRect(-enemy.radius - 3, -3, 7, 14);
      }
      if (enemy.type === 'archer') {
        ctx.strokeStyle = '#53351f';
        ctx.beginPath();
        ctx.arc(enemy.radius - 1, 0, 8, -1.2, 1.2);
        ctx.stroke();
      }
      if (enemy.type === 'priest') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2, -enemy.radius - 14, 4, 9);
        ctx.fillRect(-6, -enemy.radius - 11, 12, 3);
      }
      if (enemy.type === 'bomber') {
        ctx.fillStyle = '#111827';
        ctx.fillRect(5, -enemy.radius - 4, 9, 9);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(11, -enemy.radius - 8, 3, 4);
      }
      if (enemy.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${enemy.flash * 0.85})`;
        ctx.fillRect(-enemy.radius - 2, -enemy.radius - 8, enemy.radius * 2 + 4, enemy.radius * 2 + 12);
      }
      const hpW = enemy.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-enemy.radius, enemy.radius + 8, hpW, 3);
      ctx.fillStyle = enemy.elite ? '#facc15' : '#22c55e';
      ctx.fillRect(-enemy.radius, enemy.radius + 8, hpW * clamp(enemy.hp / enemy.maxHp, 0, 1), 3);
      ctx.restore();
    }
  }

  private drawFacilities(ctx: CanvasRenderingContext2D): void {
    for (let index = 0; index < FACILITY_SLOTS.length; index += 1) {
      const slot = FACILITY_SLOTS[index];
      const y = this.fieldHeight * slot.yRatio;
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.fillRect(slot.x - 24, y - 18, 48, 36);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeRect(slot.x - 24, y - 18, 48, 36);
    }

    for (const facility of this.facilities) {
      const def = FACILITY_DEFINITIONS[facility.type];
      const y = this.facilityY(facility);
      const pulse = facility.pulse;
      ctx.save();
      ctx.translate(facility.x, y);
      ctx.fillStyle = pulse > 0 ? brighten(def.color, 0.25) : def.color;
      ctx.fillRect(-18 - pulse * 3, -14 - pulse * 3, 36 + pulse * 6, 28 + pulse * 6);
      ctx.fillStyle = def.accent;
      if (facility.type === 'goblin_den') {
        ctx.fillRect(-11, -5, 22, 15);
        ctx.fillStyle = '#111827';
        ctx.fillRect(-6, -1, 4, 4);
        ctx.fillRect(4, -1, 4, 4);
      } else if (facility.type === 'spike_trap') {
        for (let i = -14; i <= 10; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i, 12);
          ctx.lineTo(i + 4, -12 - pulse * 5);
          ctx.lineTo(i + 8, 12);
          ctx.fill();
        }
      } else if (facility.type === 'curse_altar') {
        ctx.fillRect(-6, -18, 12, 28);
        ctx.fillStyle = '#d8b4fe';
        ctx.fillRect(-10, -3, 20, 5);
      } else if (facility.type === 'treasure_bait') {
        ctx.fillStyle = '#fff7ad';
        ctx.fillRect(-11, -8, 22, 16);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-14, -12, 28, 5);
      } else if (facility.type === 'fire_pot') {
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-12, -6, 24, 18);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-7, -18, 14, 14);
      } else if (facility.type === 'bone_prison') {
        ctx.fillStyle = '#fff7d6';
        for (let i = -12; i <= 12; i += 8) ctx.fillRect(i, -15, 4, 30);
      } else if (facility.type === 'demon_turret') {
        ctx.fillStyle = '#111827';
        ctx.fillRect(-8, -18, 16, 30);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(-3, -24, 6, 12);
      } else {
        ctx.strokeStyle = '#fecdd3';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#f9fafb';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv${facility.level}`, 0, 29);
      ctx.restore();
    }
  }

  private drawCore(ctx: CanvasRenderingContext2D): void {
    const x = LOGICAL_WIDTH / 2;
    const y = this.coreY();
    const low = this.coreHp < 35;
    if (this.coreShield > 0) {
      ctx.strokeStyle = `rgba(244,63,94,${0.45 + Math.sin(this.elapsed * 7) * 0.15})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y - 12, 42 + Math.min(18, this.coreShield * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = low ? '#991b1b' : '#7f1d1d';
    ctx.fillRect(x - 34, y - 47, 68, 58);
    ctx.fillStyle = low ? '#fb7185' : '#ef4444';
    ctx.fillRect(x - 21, y - 62, 42, 42);
    ctx.fillStyle = '#2a0810';
    ctx.fillRect(x - 8, y - 50, 16, 20);
    ctx.fillStyle = '#fdf2f8';
    ctx.fillRect(x - 4, y - 45, 8, 10);
    if (low) {
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 55);
      ctx.lineTo(x - 4, y - 40);
      ctx.lineTo(x - 12, y - 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 14, y - 54);
      ctx.lineTo(x + 3, y - 36);
      ctx.lineTo(x + 16, y - 19);
      ctx.stroke();
    }
    ctx.fillStyle = '#f9fafb';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('마왕 코어', x, y + 28);
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle =
        particle.kind === 'gold'
          ? '#facc15'
          : particle.kind === 'soul'
            ? '#a78bfa'
            : particle.kind === 'fire'
              ? '#fb7185'
              : particle.kind === 'shield'
                ? '#fda4af'
                : particle.kind === 'curse'
                  ? '#c084fc'
                  : '#bbf7d0';
      ctx.fillRect(particle.x - 3, particle.y - 3, 6, 6);
      ctx.globalAlpha = 1;
    }
  }

  private drawPopups(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    for (const popup of this.popups) {
      const alpha = clamp(popup.life / popup.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = popup.color;
      ctx.font = `bold ${popup.size}px sans-serif`;
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.globalAlpha = 1;
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D, foreground: boolean): void {
    for (const effect of this.effects) {
      const progress = 1 - effect.life / effect.maxLife;
      if (foreground !== (effect.kind === 'banner')) continue;
      if (effect.kind === 'banner') {
        ctx.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1);
        ctx.fillStyle = effect.color;
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(effect.text ?? '', effect.x, effect.y);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = clamp(effect.life / effect.maxLife, 0, 0.75);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.kind === 'explosion' || effect.kind === 'skill' ? 5 : 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * progress, 0, Math.PI * 2);
      ctx.stroke();
      if (effect.kind === 'spike') {
        ctx.fillStyle = effect.color;
        for (let i = -28; i <= 22; i += 10) {
          ctx.beginPath();
          ctx.moveTo(effect.x + i, effect.y + 16);
          ctx.lineTo(effect.x + i + 5, effect.y - 18 * (1 - progress));
          ctx.lineTo(effect.x + i + 10, effect.y + 16);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}

function defaultModifiers(): Modifiers {
  return {
    goblinPower: 0,
    spikePower: 0,
    cursePower: 0,
    baitPower: 0,
    greed: 0,
    gateOpen: 0,
    soulHarvest: 0,
    demonRage: 0,
    riskPressure: 0,
    eliteLure: 0,
    rewardMultiplier: 1,
    scoreMultiplier: 1,
    shieldBias: 0,
  };
}

function defaultStats(): RunStats {
  return {
    kills: 0,
    eliteKills: 0,
    goldEarned: 0,
    maxCombo: 0,
    highestInvasion: 1,
    stageReached: 1,
    skillUses: 0,
    riskChoices: 0,
    greedChoices: 0,
    defenseChoices: 0,
    autoChoices: 0,
  };
}

function createRng(seedInput: number): Rng {
  let seed = Math.floor(seedInput) % 2147483647;
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function tickStatus(statuses: Record<string, number | undefined>, dt: number): void {
  for (const key of Object.keys(statuses)) {
    const value = statuses[key];
    if (typeof value !== 'number') continue;
    if (value >= 900) continue;
    const next = value - dt;
    if (next <= 0) delete statuses[key];
    else statuses[key] = next;
  }
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function brighten(hex: string, amount: number): string {
  const raw = hex.replace('#', '');
  const value = Number.parseInt(raw, 16);
  const r = Math.min(255, Math.round(((value >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.round(((value >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.round((value & 255) + 255 * amount));
  return `rgb(${r},${g},${b})`;
}
