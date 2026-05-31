import type { RunStats } from './entities';

export interface ScoreInput {
  kills: number;
  eliteKills: number;
  goldEarned: number;
  maxCombo: number;
  stageReached: number;
  highestInvasion: number;
  riskMultiplier?: number;
}

export function calculateLootScore(input: ScoreInput): number {
  const base =
    input.kills * 10 +
    input.eliteKills * 75 +
    input.goldEarned +
    input.maxCombo * 25 +
    input.stageReached * 1000 +
    input.highestInvasion * 1500;
  return Math.max(0, Math.round(base * (input.riskMultiplier ?? 1)));
}

export function rankForScore(score: number): string {
  if (score >= 120_000) return '왕국 종말';
  if (score >= 70_000) return '불멸의 마왕';
  if (score >= 35_000) return '왕국 파괴자';
  if (score >= 20_000) return '악몽의 마왕';
  if (score >= 10_000) return '마왕성 관리자';
  if (score >= 5_000) return '동굴 지배자';
  return '풋내기 마왕';
}

export function formatRunCode(score: number, stats: Pick<RunStats, 'kills' | 'maxCombo' | 'highestInvasion'>): string {
  return `RUN-${score}-${stats.kills}-${stats.maxCombo}-${stats.highestInvasion}`;
}

export function endingLine(stats: RunStats): string {
  if (stats.autoChoices >= 4) return '방치된 마왕성의 최후';
  if (stats.riskChoices >= 3) return '왕국을 불러들인 고득점';
  if (stats.greedChoices >= 3) return '탐욕에 열린 성문';
  if (stats.skillUses >= 4) return '마왕의 손아귀가 남긴 폐허';
  if (stats.defenseChoices >= 3) return '버티다 무너진 요새';
  return '마왕성 최후의 항전';
}
