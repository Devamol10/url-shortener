import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useSearchParams,
  useNavigate,
} from "react-router-dom";

import api from "../services/api.js";
import Dashboard from "./dashboard.jsx";
import Login from "./login.jsx";
import Register from "./Register";
import Home from "./home.jsx";
import AuthCallback from "./authCallback.jsx";

// create password page

function CreatePassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  // Basic password strength validation
  const isStrongPassword = (value = "") =>
    value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

  const handleSetPassword = async () => {
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setError("Password is required");
      return;
    }

    if (!isStrongPassword(trimmedPassword)) {
      setError(
        "Password must be at least 8 characters and include a letter and a number"
      );
      return;
    }

    try {
      setError("");
      setMessage("");

      const res = await api.post("/auth/set-password", {
        token,
        password: trimmedPassword,
      });

      // Store access token if returned
      const tokenFromApi = res.data?.token;
      if (tokenFromApi) {
        localStorage.setItem("token", tokenFromApi);
      }

      setMessage("Password set successfully. Redirecting...");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Create Password</h2>

        <div className="login-form">
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />

          <button
            onClick={handleSetPassword}
            className="login-button"
          >
            Set Password
          </button>

          {message && (
            <div className="create-password-success">
              {message}
            </div>
          )}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Prevents access to dashboard if user is not authenticated

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/auth/me", { skipAuthRefresh: true });
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading)
    return <div style={{ padding: "40px" }}>Loading...</div>;

  if (!authenticated)
    return <Navigate to="/login" />;

  return children;
}

// main app routes

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/create-password" element={<CreatePassword />} />

      <Route
        path="/verification-failed"
        element={
          <div style={{ padding: "40px" }}>
            <h2>Verification Failed or Expired</h2>
          </div>
        }
      />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;