import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "./services/api";
import { useAuth } from "./context/AuthContext";

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
          // Persist it so the request interceptor can attach it as a Bearer header.
          // This is the cross-domain fallback — cookies may be blocked by the browser.
          localStorage.setItem("token", token);
        }

        // Also attempt a cookie-based refresh (works when cookies aren't blocked)
        try {
          const refreshRes = await api.post("/auth/refresh", {}, { _skipRefresh: true });
          const newToken = refreshRes.data?.token;
          if (newToken) {
            localStorage.setItem("token", newToken);
          }
        } catch {
          // Refresh cookie may not be available in strict cross-site browsers — that's fine,
          // the access token from the URL is still valid for 15 minutes.
        }

        const user = await fetchUser();

        if (user) {
          window.location.href = "/";
        } else {
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        window.location.href = "/login";
      }
    };

    completeAuth();
  }, [navigate, searchParams]);

  return <h2>Logging you in...</h2>;
}