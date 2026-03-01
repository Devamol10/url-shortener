function LinkPerformanceModal({ topLinks, maxClicks, onClose }) {
  const hasData = topLinks && topLinks.length > 0;

  return (
    <div className="dash-modal-backdrop" onClick={onClose}>
      <div
        className="dash-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Link performance chart"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-modal-header">
          <div>
            <div className="dash-modal-kicker">Insights</div>
            <h3 className="dash-modal-title">Top Link Performance</h3>
          </div>
          <button className="dash-btn ghost sm" onClick={onClose}>
            Close
          </button>
        </div>

        {!hasData ? (
          <div className="dash-modal-empty">No link activity yet.</div>
        ) : (
          <>
            <div className="dash-chart">
              {topLinks.map((link) => {
                const height = Math.max(
                  10,
                  Math.round(((link.clicks || 0) / maxClicks) * 100)
                );
                return (
                  <div key={link._id || link.shortCode} className="dash-bar">
                    <div className="dash-bar-value">{link.clicks || 0}</div>
                    <div className="dash-bar-column">
                      <div
                        className="dash-bar-fill"
                        style={{ height: `${height}%` }}
                        title={`${link.shortCode} - ${link.clicks || 0} clicks`}
                      />
                    </div>
                    <div className="dash-bar-label">{link.shortCode}</div>
                  </div>
                );
              })}
            </div>
            <div className="dash-chart-legend">
              <span className="dot" /> Height is relative to your most-clicked
              link.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LinkPerformanceModal;
