import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './Login.module.css';

/* ─── Inline spinner (no Tailwind required) ─── */
const Spinner = () => (
  <svg
    style={{ width: '18px', height: '18px', animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
    <path
      fill="currentColor"
      opacity="0.8"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

const CreatePassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Invalid link guard ── */
  if (!token) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center' }}>
        <div className={styles.formContainer} style={{ flex: 'none', width: '100%' }}>
          <div className={styles.formCard} style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: '0.75rem' }}>Invalid Link</h2>
            <p>Verification token is missing. Please try registering again.</p>
            <button
              className={styles.submitBtn}
              onClick={() => navigate('/register', { replace: true })}
              style={{ marginTop: '1.5rem' }}
            >
              Back to Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/set-password', { token, password });
      if (res.data?.success) {
        // Save access token and update auth state before navigating
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
        // Wait for fetchUser to fully resolve and confirm user is set
        const userData = await fetchUser();
        if (userData) {
          // Allow React state to fully flush before navigating
          await new Promise(resolve => setTimeout(resolve, 100));
          window.location.href = "/";
        } else {
          // fetchUser didn't return user data — fallback: redirect via window
          window.location.href = '/';
        }
      } else {
        setError(res.data?.message || 'Failed to set password.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while creating your password.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container} style={{ justifyContent: 'center' }}>
      <div className={styles.formContainer} style={{ flex: 'none', width: '100%' }}>
        <div className={styles.formCard}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
            {/* Lock icon */}
            <div style={{
              width: '52px', height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 4px 16px rgba(108,99,255,0.35)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h2 style={{ marginBottom: '0.35rem', fontSize: '1.55rem' }}>Create Your Password</h2>
            <p>You're verified! Secure your account with a strong password.</p>
          </div>

          {/* ── Error Message ── */}
          {error && (
            <div className={styles.errorMsg} role="alert">
              {error}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Password field */}
            <div className={styles.inputGroup}>
              <label htmlFor="cp-password">Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="cp-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Confirm Password field */}
            <div className={styles.inputGroup}>
              <label htmlFor="cp-confirm">Confirm Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="cp-confirm"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
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
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Password strength hint */}
            <p style={{ fontSize: '0.77rem', color: '#4b5563', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
              Use at least 6 characters with a mix of letters and numbers.
            </p>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <Spinner />
                  Setting password…
                </>
              ) : (
                'Set Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePassword;
