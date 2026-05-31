export function LootBox({ opened }: { opened: boolean }) {
  return (
    <div className={`loot-box ${opened ? 'is-open' : ''}`} aria-hidden="true">
      <span className="box-lid" />
      <span className="box-body" />
      <span className="box-glow" />
    </div>
  );
}
