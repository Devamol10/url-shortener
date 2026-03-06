import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import LinkPerformanceModal from "./LinkPerformanceModal";

function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  // Fetch user URLs
  useEffect(() => {
    const fetchUrls = async () => {
      try {
        const res = await api.get("/api/my-urls");
        setUrls(res.data);
      } catch {
        setError("Failed to load URLs. Please login again.");
      } finally {
        setLoading(false);
      }
    };
    fetchUrls();
  }, []);

  // Copy URL
  const handleCopy = async (id, shortUrl) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  // Delete URL
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this URL?")) return;
    try {
      await api.delete(`/api/urls/${id}`);
      setUrls((prev) => prev.filter((url) => url._id !== id));
    } catch {
      alert("Failed to delete URL");
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
      sessionStorage.removeItem("token");
      navigate("/login");
    } catch {
      alert("Logout failed");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <div className="dash-loading-text">Loading Dashboard...</div>
      </div>
    );
  }

  const totalClicks = urls.reduce((sum, url) => sum + (url.clicks || 0), 0);
  const totalLinks = urls.length;
  const topLinks = [...urls]
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 6);
  const maxClicks = Math.max(1, ...topLinks.map((u) => u.clicks || 0));

  // dashboard navbar
  return (
    <div className="dashboard">
      <header className="dash-navbar">
        <div className="dash-logo" onClick={() => navigate("/")}>
          LinkMint
        </div>
        <div className="dash-nav-actions">
          <button className="dash-btn ghost" onClick={() => navigate("/")}>
            Home
          </button>
          <button className="dash-btn danger sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* main content */}
      <div className="dash-container">
        <div className="dash-page-header">
          <h1>Dashboard</h1>
          <p className="dash-page-subtitle">
            Manage your shortened links and track performance.
          </p>
        </div>

        <div className="dash-stats">
          <div className="dash-stat-card">
            <div className="dash-stat-label">Total Links</div>
            <div className="dash-stat-value">{totalLinks}</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Total Clicks</div>
            <div className="dash-stat-value">{totalClicks}</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Top Link Clicks</div>
            <div className="dash-stat-value">{topLinks[0]?.clicks ?? 0}</div>
          </div>
          <div
            className="dash-stat-card chart-cta"
            onClick={() => setShowStats(true)}
          >
            <div className="chart-cta-inner">
              <div>
                <div className="chart-cta-label">Visualize</div>
                <div className="chart-cta-title">Link Performance</div>
              </div>
              <button
                className="chart-cta-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStats(true);
                }}
              >
                View Chart
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="dash-error">{error}</div>}

        {/* URL list */}
        <h2 className="dash-section-title">
          Your Links
          <span className="count-badge">{totalLinks}</span>
        </h2>

        {urls.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">{"\uD83D\uDD17"}</div>
            <h3>No links yet</h3>
            <p>Head to the homepage and shorten your first URL!</p>
          </div>
        ) : (
          <div className="dash-url-list">
            {urls.map((url, i) => {
              const baseUrl = import.meta.env.VITE_API_URL;
              const fullShortUrl = `${baseUrl}/${url.shortCode}`;
              return (
                <div
                  className="dash-url-card"
                  key={url._id}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="dash-card-header">
                    <a
                      className="dash-short-link"
                      href={fullShortUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      {url.shortCode}
                    </a>

                    <div className="dash-card-actions">
                      <button
                        className="dash-btn sm ghost"
                        onClick={() => handleCopy(url._id, fullShortUrl)}
                        title="Copy short link"
                      >
                        {copiedId === url._id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        className="dash-btn danger sm"
                        onClick={() => handleDelete(url._id)}
                        title="Delete short link"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="dash-card-body">
                    <div className="dash-original" title={url.originalUrl}>
                      {url.originalUrl}
                    </div>

                    <div className="dash-url-meta">
                      <span className="dash-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                        </svg>
                        <strong>{url.clicks}</strong> clicks
                      </span>
                      <span className="dash-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {new Date(url.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link performance modal */}
      {showStats && (
        <LinkPerformanceModal
          topLinks={topLinks}
          maxClicks={maxClicks}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
