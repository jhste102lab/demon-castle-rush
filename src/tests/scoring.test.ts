import { describe, expect, it } from 'vitest';
import { calculateLootScore, endingLine, formatRunCode, rankForScore } from '../game/scoring';
import type { RunStats } from '../game/entities';

describe('점수 시스템', () => {
  it('처치, 골드, 콤보, 스테이지, 침공 보너스를 공식대로 더한다', () => {
    const score = calculateLootScore({
      kills: 100,
      eliteKills: 8,
      goldEarned: 600,
      maxCombo: 30,
      stageReached: 5,
      highestInvasion: 2,
      riskMultiplier: 1.2,
    });
    expect(score).toBe(Math.round((1000 + 600 + 600 + 750 + 5000 + 3000) * 1.2));
  });

  it('점수 코드 형식을 만든다', () => {
    expect(formatRunCode(84740, { kills: 2126, maxCombo: 243, highestInvasion: 4 })).toBe('RUN-84740-2126-243-4');
  });

  it('등급과 선택 기반 결말 문구를 계산한다', () => {
    expect(rankForScore(4_999)).toBe('풋내기 마왕');
    expect(rankForScore(70_000)).toBe('불멸의 마왕');
    const stats: RunStats = {
      kills: 10,
      eliteKills: 1,
      goldEarned: 50,
      maxCombo: 4,
      highestInvasion: 1,
      stageReached: 1,
      skillUses: 0,
      riskChoices: 4,
      greedChoices: 0,
      defenseChoices: 0,
      autoChoices: 0,
    };
    expect(endingLine(stats)).toBe('왕국을 불러들인 고득점');
  });
});
