import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api.js";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const oauthBase = import.meta.env.VITE_API_URL;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizeEmail = (value) => value.trim().toLowerCase();

  const openGoogleLogin = () => {
    window.location.href = `${oauthBase}/api/auth/google`;
  };

  const openGithubLogin = () => {
    window.location.href = `${oauthBase}/api/auth/github`;
  };

  const handleLogin = async () => {
    const normalizedEmail = normalizeEmail(email);
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      setError("Email and password are required");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError("Invalid email format");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/api/auth/login", {
        email: normalizedEmail,
        password: trimmedPassword,
      });

      setEmail(normalizedEmail);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Login</h2>

        <div className="login-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
          />

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />

          <button
            onClick={handleLogin}
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="login-divider">or</div>

          <div className="oauth-container">
            <button
              onClick={openGoogleLogin}
              className="oauth-button google"
              type="button"
            >
              Continue with Google
            </button>

            <button
              onClick={openGithubLogin}
              className="oauth-button github"
              type="button"
            >
              Continue with GitHub
            </button>
          </div>

          <div className="login-footer">
            Don’t have an account? <Link to="/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
