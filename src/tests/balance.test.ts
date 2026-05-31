import { describe, expect, it } from 'vitest';
import { calculateDifficulty, estimateSkillChargePerSecond, getInvasionState } from '../game/balance';

describe('침공 사이클 계산', () => {
  it('120초 단위 침공과 국면 경계를 계산한다', () => {
    expect(getInvasionState(0)).toMatchObject({ invasion: 1, phaseIndex: 0, phaseName: '정찰대 침입' });
    expect(getInvasionState(20)).toMatchObject({ invasion: 1, phaseIndex: 1, phaseName: '모험가 범람' });
    expect(getInvasionState(50)).toMatchObject({ invasion: 1, phaseIndex: 2, phaseName: '왕국 공세' });
    expect(getInvasionState(90)).toMatchObject({ invasion: 1, phaseIndex: 3, phaseName: '토벌대 러시' });
    expect(getInvasionState(120)).toMatchObject({ invasion: 2, phaseIndex: 0, phaseName: '정찰대 침입' });
    expect(getInvasionState(240)).toMatchObject({ invasion: 3, phaseIndex: 0, phaseName: '정찰대 침입' });
  });

  it('시간 도달 자체에는 종료 상태가 없다', () => {
    const state = getInvasionState(360);
    expect(state.invasion).toBe(4);
    expect(Object.keys(state)).not.toContain('ended');
  });
});

describe('난이도와 스킬 충전 밸런스', () => {
  it('침공차수가 오를수록 확실히 더 어려워진다', () => {
    const first = calculateDifficulty({ elapsed: 10 });
    const second = calculateDifficulty({ elapsed: 130 });
    const third = calculateDifficulty({ elapsed: 250 });
    expect(second).toBeGreaterThan(first + 0.6);
    expect(third).toBeGreaterThan(second + 0.9);
  });

  it('위험 선택 누적은 난이도를 추가로 올린다', () => {
    const stable = calculateDifficulty({ elapsed: 135, riskPressure: 0, gateOpen: 0, greed: 0 });
    const risky = calculateDifficulty({ elapsed: 135, riskPressure: 14, gateOpen: 2, greed: 2, eliteLure: 1 });
    expect(risky).toBeGreaterThan(stable + 1.1);
  });

  it('초반 시간 충전은 느리고 위험/카드 보정은 충전을 올린다', () => {
    const calm = estimateSkillChargePerSecond({ dangerPercent: 8 });
    const danger = estimateSkillChargePerSecond({ dangerPercent: 86, demonRage: 2, soulHarvest: 1 });
    expect(calm * 35).toBeLessThan(25);
    expect(danger).toBeGreaterThan(calm * 2.8);
  });
});
