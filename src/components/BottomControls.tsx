import { SKILL_DEFINITIONS } from '../game/assets';
import type { EngineSnapshot } from '../game/engine';
import type { SkillId } from '../game/entities';
import { formatTime } from './Hud';

interface BottomControlsProps {
  snapshot: EngineSnapshot;
  onSpeed: (speed: 1 | 2 | 3) => void;
  onUseSkill: (skill: SkillId) => void;
}

const SKILLS = Object.entries(SKILL_DEFINITIONS) as Array<[SkillId, (typeof SKILL_DEFINITIONS)[SkillId]]>;

export function BottomControls({ snapshot, onSpeed, onUseSkill }: BottomControlsProps) {
  return (
    <footer className="controls" data-testid="bottom-controls">
      <div className="skill-strip" aria-label="마왕 스킬">
        {SKILLS.map(([id, skill]) => (
          <button
            key={id}
            className={`skill-button ${snapshot.selectedSkill === id ? 'is-selected' : ''} ${snapshot.skillReady ? 'is-ready' : ''}`}
            onClick={() => onUseSkill(id)}
            data-testid={`skill-${id}`}
            type="button"
          >
            <span>{skill.shortName}</span>
            <small>{snapshot.skillBoosts[id] > 0 ? `+${snapshot.skillBoosts[id]}` : skill.summary}</small>
          </button>
        ))}
      </div>
      <div className="skill-gauge" data-testid="skill-gauge">
        <span>{SKILL_DEFINITIONS[snapshot.selectedSkill].name}</span>
        <div className="meter meter-skill">
          <i style={{ width: `${Math.min(100, snapshot.skillCharge)}%` }} />
        </div>
        <b>{Math.floor(snapshot.skillCharge)}%</b>
      </div>
      <div className="speed-row" aria-label="배속">
        {[1, 2, 3].map((speed) => (
          <button
            key={speed}
            type="button"
            className={snapshot.userSpeed === speed ? 'is-active' : ''}
            onClick={() => onSpeed(speed as 1 | 2 | 3)}
            data-testid={`speed-${speed}`}
          >
            {speed}배속{snapshot.userSpeed === speed && speed !== 1 ? ' ON' : ''}
          </button>
        ))}
      </div>
      <div className="timer-grid">
        <Timer label="카드" value={snapshot.timers.card} />
        <Timer label="건설" value={snapshot.timers.build} />
        <Timer label="위험" value={snapshot.timers.risk} />
        <Timer label="변형" value={snapshot.timers.skill} />
      </div>
    </footer>
  );
}

function Timer({ label, value }: { label: string; value: number }) {
  return (
    <div className="timer-chip">
      <span>{label}</span>
      <b>{formatTime(value)}</b>
    </div>
  );
}
