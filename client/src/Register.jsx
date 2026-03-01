import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";

function Register() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const oauthBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizeEmail = (value) => value.trim().toLowerCase();

  const openGoogleLogin = () => {
    window.location.href = `${oauthBase}/auth/google/register`;
  };

  const openGithubLogin = () => {
    window.location.href = `${oauthBase}/auth/github/register`;
  };

  const handleRegister = async () => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError("Email is required");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError("Invalid email format");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await api.post("/auth/request-verification", { email: normalizedEmail });

      setMessage(
        "Verification email sent. Please check your inbox."
      );
      setEmail(normalizedEmail);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Register</h2>

        <div className="login-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
          />

          <button
            onClick={handleRegister}
            className="login-button"
            disabled={loading}
          >
            {loading ? "Sending..." : "Register"}
          </button>

          {message && (
            <div className="register-success">
              {message}
            </div>
          )}

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
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
