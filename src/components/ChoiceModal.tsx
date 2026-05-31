import type { ChoiceState } from '../game/entities';

interface ChoiceModalProps {
  choice: ChoiceState;
  onChoose: (id: string) => void;
}

export function ChoiceModal({ choice, onChoose }: ChoiceModalProps) {
  const ratio = Math.max(0, Math.min(1, choice.remaining / choice.duration));
  return (
    <div className="choice-backdrop" data-testid="choice-modal">
      <section className="choice-modal" role="dialog" aria-modal="true" aria-label={choice.title}>
        <div className="choice-head">
          <strong>{choice.title}</strong>
          <span>자동 선택 {Math.ceil(choice.remaining)}초</span>
        </div>
        <div className="choice-timer">
          <i style={{ width: `${ratio * 100}%` }} />
        </div>
        <div className="choice-options">
          {choice.options.map((option) => (
            <button key={option.id} type="button" onClick={() => onChoose(option.id)} data-testid={`choice-${option.id}`}>
              <strong>{option.title}</strong>
              <span>{option.summary}</span>
              <small>{option.detail}</small>
              <em>{option.tags.join(' · ')}</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
