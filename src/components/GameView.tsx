import { useEffect, useRef, useState } from 'react';
import { BottomControls } from './BottomControls';
import { ChoiceModal } from './ChoiceModal';
import { Hud } from './Hud';
import { ResultScreen } from './ResultScreen';
import { createInitialSnapshot, GameEngine, type EngineSnapshot } from '../game/engine';
import type { SkillId } from '../game/entities';

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() => createInitialSnapshot());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debug = params.get('debug') === '1';
    const debugTimeScale = debug ? clampNumber(Number(params.get('timeScale') ?? 1), 1, 120) : 1;
    const seed = Number(params.get('seed') ?? Date.now());
    const engine = new GameEngine({
      canvas: canvasRef.current,
      onSnapshot: setSnapshot,
      seed: Number.isFinite(seed) ? seed : Date.now(),
      debug,
      debugTimeScale,
      choiceSoon: debug && params.get('choiceSoon') === '1',
      initialCoreHp: debug && params.has('coreHp') ? clampNumber(Number(params.get('coreHp')), 1, 100) : undefined,
      initialSkillCharge:
        debug && params.has('skillCharge') ? clampNumber(Number(params.get('skillCharge')), 0, 100) : undefined,
      initialRiskPressure:
        debug && params.has('danger') ? clampNumber(Number(params.get('danger')), 0, 40) : undefined,
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const debugProbe = {
    elapsed: Math.round(snapshot.elapsed * 10) / 10,
    invasion: snapshot.invasion,
    phaseIndex: snapshot.phaseIndex,
    score: snapshot.score,
    kills: snapshot.kills,
    enemies: snapshot.counts.enemies,
    choiceActive: Boolean(snapshot.choice),
    choiceRemaining: snapshot.choice?.remaining ?? 0,
    choiceHistory: snapshot.choiceHistory.length,
    lastChoiceAuto: snapshot.choiceHistory.at(-1)?.auto ?? false,
    effectiveBattleScale: snapshot.effectiveBattleScale,
    skillCharge: Math.round(snapshot.skillCharge),
    coreHp: Math.round(snapshot.coreHp),
    result: Boolean(snapshot.result),
  };

  return (
    <main className="game-shell">
      <section className="game-frame" data-testid="game-frame">
        <Hud snapshot={snapshot} />
        <div className="battle-panel" data-testid="battle-panel">
          <canvas ref={canvasRef} className="battle-canvas" data-testid="battle-canvas" />
          {snapshot.toast && <div className="toast" data-testid="toast">{snapshot.toast}</div>}
        </div>
        <BottomControls
          snapshot={snapshot}
          onSpeed={(speed) => engineRef.current?.setUserSpeed(speed)}
          onUseSkill={(skill: SkillId) => engineRef.current?.useSkill(skill)}
        />
        {snapshot.choice && (
          <ChoiceModal choice={snapshot.choice} onChoose={(id) => engineRef.current?.chooseOption(id)} />
        )}
        {snapshot.result && <ResultScreen result={snapshot.result} onRestart={() => engineRef.current?.restart()} />}
        <output className="debug-probe" data-testid="debug-state" aria-hidden="true">
          {JSON.stringify(debugProbe)}
        </output>
      </section>
    </main>
  );
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
