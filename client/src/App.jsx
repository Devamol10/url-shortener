import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

// ── Auth Context ───────────────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("/api/auth/me");
      if (res.data?.userId || res.data?.email) {
        setUser(res.data);
        return res.data;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    if (res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    // Immediately fetch user so state updates
    await fetchUser();
    return res.data;
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  // On mount: try to restore session
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Attempt cookie-based refresh first
        const refreshRes = await api.post("/api/auth/refresh", {}, { _skipRefresh: true });
        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
        }
      } catch {
        // no valid refresh token — that's okay
      }

      // Now check if we have a valid session
      const token = localStorage.getItem("token");
      if (token) {
        await fetchUser();
      }
      setLoading(false);
    };

    restoreSession();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Create Password Page ───────────────────────────────────
function CreatePassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { fetchUser } = useAuth();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

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

      const res = await api.post("/api/auth/set-password", {
        token,
        password: trimmedPassword,
      });

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }

      setMessage("Password set successfully. Redirecting...");
      await fetchUser();

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
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

// ── Route Guards ───────────────────────────────────────────
function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading)
    return <div style={{ padding: "40px" }}>Loading...</div>;

  if (!user)
    return <Navigate to="/login" replace />;

  return children;
}

// ── Main App Routes ───────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/create-password" element={<CreatePassword />} />

      <Route
        path="/verification-failed"
        element={
          <div style={{ padding: "40px" }}>
            <h2>Verification Failed or Expired</h2>
          </div>
        }
      />

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

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;