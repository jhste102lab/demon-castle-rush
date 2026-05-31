import type { EngineSnapshot } from '../game/engine';

interface HudProps {
  snapshot: EngineSnapshot;
}

export function Hud({ snapshot }: HudProps) {
  const phaseLabel = snapshot.phaseIndex === 3 ? `${snapshot.phaseName} 경고` : snapshot.phaseName;
  return (
    <header className="hud" data-testid="hud">
      <div className="hud-topline">
        <strong>침공 {snapshot.invasion}차 · {phaseLabel}</strong>
        <span>다음 {formatTime(snapshot.timeToNext)}</span>
      </div>
      <div className="hud-metrics">
        <span>약탈 점수 <b>{formatNumber(snapshot.score)}</b></span>
        <span>난이도 <b>x{snapshot.difficulty.toFixed(1)}</b></span>
      </div>
      <Meter label="120초 변화" value={snapshot.cycleProgress * 100} color="gold" />
      <Meter label="침공 위험도" value={snapshot.dangerPercent} color={snapshot.dangerPercent > 70 ? 'danger' : 'violet'} />
      <Meter label="코어 HP" value={snapshot.coreHpPercent} color={snapshot.coreHpPercent < 35 ? 'danger' : 'life'} />
      <div className="hud-status">
        <span>빌드: <b>{snapshot.buildDirection}</b></span>
        <span>{snapshot.recentChoice}</span>
      </div>
    </header>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: 'gold' | 'violet' | 'danger' | 'life' }) {
  return (
    <div className="meter-row">
      <span>{label}</span>
      <div className={`meter meter-${color}`}>
        <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <b>{Math.round(value)}%</b>
    </div>
  );
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('ko-KR');
}
