import React, { useState, useEffect } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

const Login = () => {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (success && (email || password)) setSuccess("");
  }, [email, password, success]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res && res.success) {
        navigate("/", { replace: true });
      } else {
        setError(res?.message || "Invalid credentials");
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Network error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/${provider}`;
  };

  return (
    <div className={styles.container}>
      {/* Branding Panel */}
      <div className={styles.branding}>
        <h1>CampusCart</h1>
        <p>The exclusive peer-to-peer marketplace for your campus. Buy and sell with trusted peers securely.</p>
      </div>

      {/* Form Panel */}
      <div className={styles.formContainer}>
        <div className={styles.formCard}>
          <h2>Welcome back</h2>
          <p>Sign in to your account</p>

          {success && <div className={styles.successMsg}>{success}</div>}
          {error && <div className={styles.errorMsg}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label>Email ID</label>
              <input
                type="email"
                className={styles.input}
                placeholder="name@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="button" className={styles.forgotBtn}>
              Forgot password?
            </button>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className={styles.divider}>
            <span>Or continue with</span>
          </div>

          <div className={styles.oauthGroup}>
            <button type="button" className={styles.googleBtn} onClick={() => handleOAuth('google')}>
              Sign in with Google
            </button>
            <button type="button" className={styles.githubBtn} onClick={() => handleOAuth('github')}>
              Sign in with GitHub
            </button>
          </div>

          <div className={styles.registerLink}>
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
