import { describe, expect, it } from 'vitest';
import { CHOICE_BATTLE_SLOW_FACTOR, CHOICE_SECONDS } from '../game/constants';
import { GameEngine } from '../game/engine';
import type { ChoiceType } from '../game/entities';

describe('게임 흐름', () => {
  it.each<ChoiceType>(['card', 'build', 'risk'])('%s 선택을 방치하면 무작위 자동 선택하고 기록한다', (type) => {
    const engine = new GameEngine({ seed: 10, disableDrawing: true });
    const choice = engine.forceChoice(type);
    expect(choice.options).toHaveLength(3);
    engine.tick(CHOICE_SECONDS + 0.2);
    const snapshot = engine.getSnapshot();
    expect(snapshot.choice).toBeNull();
    expect(snapshot.choiceHistory.at(-1)).toMatchObject({ type, auto: true });
    expect(snapshot.recentChoice).toContain('-');
  });

  it('선택 중 전투 시간은 느려지고 선택 타이머는 계속 줄어든다', () => {
    const engine = new GameEngine({ seed: 11, disableDrawing: true });
    engine.forceChoice('card');
    engine.tick(1);
    const snapshot = engine.getSnapshot();
    expect(snapshot.elapsed).toBeCloseTo(CHOICE_BATTLE_SLOW_FACTOR, 2);
    expect(snapshot.choice?.remaining).toBeCloseTo(CHOICE_SECONDS - 1, 2);
    expect(snapshot.effectiveBattleScale).toBe(CHOICE_BATTLE_SLOW_FACTOR);
  });

  it('초반에는 스킬이 난사되지 않고 처치와 점수는 발생한다', () => {
    const engine = new GameEngine({ seed: 12, disableDrawing: true });
    for (let i = 0; i < 160; i += 1) engine.tick(0.1);
    const snapshot = engine.getSnapshot();
    expect(snapshot.kills).toBeGreaterThan(0);
    expect(snapshot.score).toBeGreaterThan(0);
    expect(snapshot.skillCharge).toBeLessThan(80);
  });

  it('120초 이후에도 시간만으로 결과 화면을 만들지 않는다', () => {
    const engine = new GameEngine({ seed: 13, disableDrawing: true, initialCoreHp: 10_000 });
    for (let i = 0; i < 800 && engine.getSnapshot().invasion < 2; i += 1) engine.tick(0.5);
    const snapshot = engine.getSnapshot();
    expect(snapshot.invasion).toBeGreaterThanOrEqual(2);
    expect(snapshot.result).toBeNull();
  });
});
