import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "./App.jsx";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const completeAuth = async () => {
      try {
        // Read the access token injected into the URL by the OAuth callback redirect
        const token = searchParams.get("token");
        if (token) {
          localStorage.setItem("token", token);
        }

        // Also attempt a cookie-based refresh (works when cookies aren't blocked)
        try {
          const refreshRes = await api.post("/api/auth/refresh", {}, { _skipRefresh: true });
          const newToken = refreshRes.data?.token;
          if (newToken) {
            localStorage.setItem("token", newToken);
          }
        } catch {
          // Refresh cookie may not be available — that's fine
        }

        const user = await fetchUser();

        if (user) {
          navigate("/", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        navigate("/login", { replace: true });
      }
    };

    completeAuth();
  }, [navigate, searchParams, fetchUser]);

  return <h2>Logging you in...</h2>;
}