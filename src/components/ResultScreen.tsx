import { useState } from 'react';
import type { ResultSummary } from '../game/engine';
import { formatTime } from './Hud';
import { LootBox } from './PixelArt';

interface ResultScreenProps {
  result: ResultSummary;
  onRestart: () => void;
}

export function ResultScreen({ result, onRestart }: ResultScreenProps) {
  const [opened, setOpened] = useState(false);
  return (
    <div className="result-backdrop" data-testid="result-screen">
      <section className="result-panel">
        <p className="result-kicker">{result.ending}</p>
        <h1>마왕성 붕괴</h1>
        <div className="final-score">
          <span>최종 약탈 점수</span>
          <strong>{result.finalScore.toLocaleString('ko-KR')}</strong>
        </div>
        <div className="rank-line">등급: <b>{result.rank}</b></div>
        <dl className="result-stats">
          <div><dt>처치한 용사</dt><dd>{result.stats.kills.toLocaleString('ko-KR')}명</dd></div>
          <div><dt>정예 처치</dt><dd>{result.stats.eliteKills.toLocaleString('ko-KR')}명</dd></div>
          <div><dt>획득 골드</dt><dd>{result.stats.goldEarned.toLocaleString('ko-KR')}</dd></div>
          <div><dt>최대 콤보</dt><dd>{result.stats.maxCombo.toLocaleString('ko-KR')}</dd></div>
          <div><dt>최고 침공</dt><dd>{result.stats.highestInvasion}차</dd></div>
          <div><dt>누적 스테이지</dt><dd>{result.stats.stageReached}</dd></div>
          <div><dt>플레이 시간</dt><dd>{formatTime(result.playTime)}</dd></div>
          <div><dt>주요 빌드</dt><dd>{result.majorBuild}</dd></div>
        </dl>
        <div className="run-code">
          <span>점수 코드</span>
          <b>{result.runCode}</b>
        </div>
        <LootBox opened={opened} />
        {opened && <p className="loot-message">검은 보석과 왕국 금화가 쏟아졌습니다</p>}
        <div className="result-actions">
          <button type="button" onClick={() => setOpened(true)} data-testid="open-loot">
            전리품 상자 열기
          </button>
          <button type="button" onClick={onRestart} data-testid="restart">
            다시 도전
          </button>
        </div>
      </section>
    </div>
  );
}
