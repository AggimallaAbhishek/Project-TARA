export default function OrbitalSignalFeedPanel({ feed, loading, error }) {
  return (
    <section className="orbital-panel orbital-panel--feed" aria-label="signal feed panel">
      <div className="orbital-panel-header">
        <h2 className="orbital-panel-title">SIGNAL FEED</h2>
        <span className="orbital-badge">LIVE</span>
      </div>

      {error && <div className="orbital-panel-state orbital-panel-state--warn">{error}</div>}

      {loading ? (
        <div className="orbital-panel-state">Loading signal feed...</div>
      ) : feed.length === 0 ? (
        <div className="orbital-panel-state">No audit events available yet.</div>
      ) : (
        <div className="orbital-list orbital-scroll-region orbital-scroll-region-feed">
          {feed.map((entry) => (
            <div className="orbital-feed-row" key={entry.id}>
              <span className="source">{entry.source}</span>
              <span className="time">{entry.timeLabel}</span>
              <span className={`message ${entry.severity}`}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
