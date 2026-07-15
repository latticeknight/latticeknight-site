export function PageHeader({
  kicker,
  title,
  intro,
  compact = false,
}: {
  kicker: string;
  title: string;
  intro?: string;
  compact?: boolean;
}) {
  return (
    <header className={compact ? "page-heading page-heading--compact" : "page-heading"}>
      <div className="kicker">{kicker}</div>
      <h1>{title}</h1>
      {intro ? <p className="page-intro">{intro}</p> : null}
    </header>
  );
}
