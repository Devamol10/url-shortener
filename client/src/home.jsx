import React, { useEffect, useState, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
const Confetti = React.lazy(() => import("react-confetti"));

import api from "../services/api";


function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);



  const MAX_URL_LENGTH = 2048;
  const navigate = useNavigate();

  // feature data
  const featureList = [
    {
      title: "One-Tap Sharing",
      text: "Copy, open, or drop short links into your socials in a single click.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
    },
    {
      title: "Team-Ready",
      text: "Shared dashboards and audit-friendly click logs for your whole team.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "UTM Aware",
      text: "Keeps marketing parameters intact so your analytics stay accurate.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    }
  ];

  const steps = [
    {
      num: "1",
      title: "Paste your URL",
      text: "Drop any long link into the input — no sign-up needed for your first links.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      num: "2",
      title: "Hit shorten",
      text: "We generate a clean, branded short link in under a second.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      num: "3",
      title: "Share everywhere",
      text: "Copy your link and share it on social media, emails, or anywhere you need.",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  // handlers
  const handleShorten = async (e) => {
    e?.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError("Please enter a URL");
      return;
    }

    if (trimmed.length > MAX_URL_LENGTH) {
      setError(`URL must be ${MAX_URL_LENGTH} characters or fewer`);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setCopied(false);

      const res = await api.post("/api/shorten", { originalUrl: trimmed });
      setResult(res.data);
      setUrl("");

      // Trigger celebration
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.limitReached) {
        setShowAuthModal(true);
        return;
      }
      setError(data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.shortUrl) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore logout errors to keep UX smooth
    } finally {
      localStorage.removeItem("token");
      setIsAuthenticated(false);
      navigate("/");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/api/auth/me", { skipAuthRefresh: true });
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // render
  return (
    <div className="home">
      {/* Celebration Confetti (moved to result card) */}

      {/* Animated mesh background */}
      <div className="mesh">
        <div className="mesh-orb mesh-orb-1" />
        <div className="mesh-orb mesh-orb-2" />
        <div className="mesh-orb mesh-orb-3" />
      </div>

      {/* navbar */}
      <header className="navbar">
        <div className="logo">LinkMint</div>
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <button className="btn ghost" onClick={() => navigate("/dashboard")}>
                Dashboard
              </button>
              <button className="btn ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="link-reset" to="/login">
                <button className="btn ghost">Log in</button>
              </Link>
              <Link className="link-reset" to="/register">
                <button className="btn solid">Get started</button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="shell">
        {/* hero */}
        <section className="hero">
          <div className="pill">
            <span className="pill-dot" />
            First 2 links free daily — no sign-up needed
          </div>

          <h1>
            Short links made <span className="accent-word">simple</span> and professional.
          </h1>

          <p>
            Shrink heavy URLs into clean, trackable links in seconds.
            Built with speed, reliability, and security in mind.
          </p>

          {/* shortener input */}
          <form className="shortener-card" onSubmit={handleShorten}>
            <div className="shortener-inner">
              <div className="input-wrap">
                <input
                  type="text"
                  placeholder="Paste a long URL here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  maxLength={MAX_URL_LENGTH}
                  id="url-input"
                />
                <button type="submit" className="btn solid" disabled={loading} id="shorten-btn">
                  {loading ? "Shortening..." : "Shorten link"}
                </button>
              </div>
              <div className="hint-row">

                <span>
                  <span className="hint-icon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                    </svg>
                  </span>
                  Unlimited after sign-in
                </span>
              </div>
            </div>
          </form>

          {/* error */}
          {error && <div className="alert error">{error}</div>}

          {/* result */}
          {result && (
            <div className="result-card">
              {showConfetti && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit' }}>
                  <Suspense fallback={null}>
                    <Confetti
                      width={700}
                      height={200}
                      recycle={false}
                      numberOfPieces={150}
                      gravity={0.15}
                    />
                  </Suspense>
                </div>
              )}
              <div className="result-label">🎉 Success! Here's your short link:</div>
              <div className="result-row">
                <a href={result.shortUrl} target="_blank" rel="noreferrer" className="short-url-link">
                  {result.shortUrl}
                </a>
                <div className="result-actions">
                  <a href={result.shortUrl} target="_blank" rel="noreferrer" className="btn outline sm" aria-label="Open shortened link in new tab">
                    Open Link
                  </a>
                  <button className="btn solid sm" onClick={handleCopy} id="copy-btn" aria-label="Copy short link to clipboard">
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>
          )}


        </section>

        {/* features */}
        <section className="section" style={{ paddingTop: '2rem' }}>
          <div className="section-head">
            <p className="eyebrow">Platform Features</p>
            <h2>Everything you need to manage short links effectively.</h2>
          </div>
          <div className="feature-grid">
            {featureList.map((item) => (
              <div key={item.title} className="feature-card">
                <div className="feature-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="section">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Three steps. Zero friction.</h2>
          </div>
          <div className="steps-grid">
            {steps.map((step) => (
              <div key={step.num} className="step-card">
                <div className="step-number">{step.num}</div>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="section cta">
          <div className="cta-inner">
            <div>
              <p className="eyebrow">Ready when you are</p>
              <h3>Jump into the dashboard or keep it lightweight as a guest.</h3>
            </div>
            <div className="cta-actions">
              <button
                className="btn solid"
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
                disabled={isLoading}
                id="cta-primary"
              >
                {isAuthenticated ? "Open dashboard" : "Sign in to unlock"}
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setUrl("https://example.com/product");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                id="cta-sample"
              >
                Try a sample link
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="footer">
        <div className="footer-brand">LinkMint</div>
        <p>&copy; {new Date().getFullYear()} LinkMint. Built for fast sharing.</p>
      </footer>

      {/* auth limit modal */}
      {showAuthModal && (
        <div className="overlay">
          <div className="modal">
            <h2>Free limit reached</h2>
            <p>You have used your 2 free links in the last 24 hours. Sign in for unlimited access.</p>
            <div className="modal-buttons">
              <Link to="/login">
                <button className="btn solid">Log in</button>
              </Link>
              <Link to="/register">
                <button className="btn ghost">Register</button>
              </Link>
            </div>
            <button className="close-btn" onClick={() => setShowAuthModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
