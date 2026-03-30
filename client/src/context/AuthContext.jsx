import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { disconnectSocket } from "../hooks/useSocket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasFetched = React.useRef(false);

  const fetchUser = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      
      // Safety check for response structure (Vercel might return HTML on 404/Rewrites)
      if (res.data && typeof res.data === 'object' && res.data.success) {
        setUser(res.data.data);
        return res.data.data;
      } else {
        console.warn("Auth check failed: Invalid response format", res.data);
        setUser(null);
        return null;
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("Auth check error:", msg);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchUser();
    }
  }, [fetchUser]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data && res.data.success) {
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      await fetchUser();
    }
    return res.data;
  };

  const logout = async () => {
    try {
      setLoading(true);
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout API failed (silently continuing cleanup):", error.message);
    } finally {
      // ALWAYS cleanup even if server call fails
      localStorage.removeItem("token");
      disconnectSocket();
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
