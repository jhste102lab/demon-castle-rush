import { INVASION_CYCLE_SECONDS, PHASES } from './constants';
import type { Modifiers } from './entities';

export type PhaseId = (typeof PHASES)[number]['id'];

export interface InvasionState {
  elapsed: number;
  invasion: number;
  cycleTime: number;
  phaseIndex: number;
  phaseId: PhaseId;
  phaseName: string;
  timeToNext: number;
  cycleProgress: number;
  stageReached: number;
}

export interface DifficultyInput {
  elapsed: number;
  riskPressure?: number;
  gateOpen?: number;
  greed?: number;
  eliteLure?: number;
  aliveEnemies?: number;
  nearCoreEnemies?: number;
  eliteEnemies?: number;
  coreDamageTaken?: number;
}

export function getInvasionState(elapsedSeconds: number): InvasionState {
  const elapsed = Math.max(0, elapsedSeconds);
  const invasion = Math.floor(elapsed / INVASION_CYCLE_SECONDS) + 1;
  const rawCycleTime = elapsed % INVASION_CYCLE_SECONDS;
  const cycleTime = rawCycleTime === 0 && elapsed > 0 ? 0 : rawCycleTime;
  const phase = PHASES.find((item) => cycleTime >= item.start && cycleTime < item.end) ?? PHASES[0];
  const nextBoundary = phase.end === INVASION_CYCLE_SECONDS ? INVASION_CYCLE_SECONDS : phase.end;

  return {
    elapsed,
    invasion,
    cycleTime,
    phaseIndex: phase.index,
    phaseId: phase.id,
    phaseName: phase.name,
    timeToNext: Math.max(0, nextBoundary - cycleTime),
    cycleProgress: cycleTime / INVASION_CYCLE_SECONDS,
    stageReached: (invasion - 1) * PHASES.length + phase.index + 1,
  };
}

export function calculateDifficulty(input: DifficultyInput): number {
  const state = getInvasionState(input.elapsed);
  const phase = PHASES[state.phaseIndex];
  const cycleRamp = Math.pow(Math.max(0, state.invasion - 1), 1.62) * 0.78;
  const riskRamp = (input.riskPressure ?? 0) * 0.055;
  const gateRamp = (input.gateOpen ?? 0) * 0.22;
  const greedRamp = (input.greed ?? 0) * 0.12;
  const eliteRamp = (input.eliteLure ?? 0) * 0.27;
  const pressureRamp =
    (input.aliveEnemies ?? 0) * 0.004 +
    (input.nearCoreEnemies ?? 0) * 0.018 +
    (input.eliteEnemies ?? 0) * 0.03 +
    (input.coreDamageTaken ?? 0) * 0.002;

  return round1(1 + cycleRamp + phase.difficultyBonus + riskRamp + gateRamp + greedRamp + eliteRamp + pressureRamp);
}

export function calculateDifficultyFromModifiers(
  elapsed: number,
  modifiers: Pick<Modifiers, 'riskPressure' | 'gateOpen' | 'greed' | 'eliteLure'>,
  pressure: Pick<DifficultyInput, 'aliveEnemies' | 'nearCoreEnemies' | 'eliteEnemies' | 'coreDamageTaken'> = {},
): number {
  return calculateDifficulty({
    elapsed,
    riskPressure: modifiers.riskPressure,
    gateOpen: modifiers.gateOpen,
    greed: modifiers.greed,
    eliteLure: modifiers.eliteLure,
    ...pressure,
  });
}

export function calculateDangerPercent(input: {
  aliveEnemies: number;
  nearCoreEnemies: number;
  eliteEnemies: number;
  coreDamageTaken: number;
  invasion: number;
  riskPressure: number;
}): number {
  const raw =
    input.aliveEnemies * 1.2 +
    input.nearCoreEnemies * 4.8 +
    input.eliteEnemies * 7.5 +
    input.coreDamageTaken * 0.65 +
    Math.max(0, input.invasion - 1) * 12 +
    input.riskPressure * 2.2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function estimateSkillChargePerSecond(input: {
  dangerPercent: number;
  demonRage?: number;
  soulHarvest?: number;
  debug?: boolean;
}): number {
  const base = 0.46;
  const dangerBonus = Math.max(0, input.dangerPercent - 35) * 0.018;
  const modifierBonus = (input.demonRage ?? 0) * 0.12 + (input.soulHarvest ?? 0) * 0.05;
  return base + dangerBonus + modifierBonus + (input.debug ? 0.05 : 0);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
