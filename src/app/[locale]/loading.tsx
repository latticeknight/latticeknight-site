export default function Loading() {
  return (
    <main className="route-loading" role="status">
      <span className="sr-only">Loading page · A carregar página</span>
      <div aria-hidden="true" className="route-loading-content">
        <span className="route-loading-kicker" />
        <span className="route-loading-heading" />
        <span className="route-loading-copy" />
        <span className="route-loading-copy route-loading-copy--short" />
        <div className="route-loading-grid">
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}
