import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import styles from "./Login.module.css";

/* ── Inline spinner (no Tailwind) ── */
const Spinner = ({ size = 18 }) => (
  <svg
    style={{
      width: size, height: size,
      animation: "sp-spin 0.8s linear infinite",
      flexShrink: 0,
    }}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
    <path fill="currentColor" opacity="0.8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

/* ── Lock icon ── */
const LockIcon = () => (
  <div style={{
    width: 52, height: 52, borderRadius: 14,
    background: "linear-gradient(135deg,#6c63ff 0%,#3b82f6 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 1rem",
    boxShadow: "0 4px 16px rgba(108,99,255,0.35)",
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  </div>
);

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const token = searchParams.get("token");

  /* ── Verification state ── */
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  /* ── Password form state ── */
  // Token presence means user was already redirected here by backend after verification
  const [verified, setVerified] = useState(!!token);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ── Submit password ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/auth/set-password", { token, password });
      if (res.data?.success) {
        // Save access token and update auth state before navigating
        if (res.data.token) {
          localStorage.setItem("token", res.data.token);
        }
        await fetchUser();
        window.location.href = "/";
      } else {
        setFormError(res.data?.message || "Failed to set password.");
        setSubmitting(false);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "An error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  /* ════════════════════════════════════════
     RENDER — container is always the same
     ════════════════════════════════════════ */
  return (
    <div className={styles.container} style={{ justifyContent: "center" }}>
      <div className={styles.formContainer} style={{ flex: "none", width: "100%" }}>
        <div className={styles.formCard}>

          {/* ── No token ── */}
          {!token && (
            <div style={{ textAlign: "center" }}>
              <LockIcon />
              <h2 style={{ marginBottom: "0.5rem" }}>Invalid Link</h2>
              <p>Verification token is missing. Please try registering again.</p>
              <button
                className={styles.submitBtn}
                style={{ marginTop: "1.5rem" }}
                onClick={() => navigate("/register", { replace: true })}
              >
                Back to Register
              </button>
            </div>
          )}

          {/* ── Verifying spinner ── */}
          {token && verifying && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
                <Spinner size={44} />
              </div>
              <h2 style={{ marginBottom: "0.4rem" }}>Verifying your email…</h2>
              <p>Please wait while we validate your link.</p>
            </div>
          )}

          {/* ── Verification error ── */}
          {token && !verifying && verifyError && (
            <div style={{ textAlign: "center" }}>
              <LockIcon />
              <h2 style={{ marginBottom: "0.75rem" }}>Verification Failed</h2>
              <div className={styles.errorMsg}>{verifyError}</div>
              <p style={{ marginBottom: "1.5rem" }}>The link might be expired or invalid.</p>
              <button
                className={styles.submitBtn}
                onClick={() => navigate("/register", { replace: true })}
              >
                Back to Register
              </button>
            </div>
          )}

          {/* ── Password form (after successful verification) ── */}
          {token && !verifying && verified && (
            <>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                <LockIcon />
                <h2 style={{ marginBottom: "0.35rem", fontSize: "1.55rem" }}>
                  Create Your Password
                </h2>
                <p>You're verified! Secure your account with a strong password.</p>
              </div>

              {/* Error */}
              {formError && (
                <div className={styles.errorMsg} role="alert">
                  {formError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>

                {/* Password */}
                <div className={styles.inputGroup}>
                  <label htmlFor="sp-password">Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="sp-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className={styles.input}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className={styles.inputGroup}>
                  <label htmlFor="sp-confirm">Confirm Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="sp-confirm"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      required
                      className={styles.input}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Hint */}
                <p style={{ fontSize: "0.77rem", color: "#4b5563", marginTop: "-0.5rem", marginBottom: "1.5rem" }}>
                  Use at least 6 characters with a mix of letters and numbers.
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.submitBtn}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {submitting ? (
                    <>
                      <Spinner />
                      Setting password…
                    </>
                  ) : (
                    "Set Password"
                  )}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default SetPassword;
