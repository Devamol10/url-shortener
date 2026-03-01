import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const completeAuth = async () => {
      try {
        // Cookies are already set by the server OAuth callback.
        // Verify auth by calling /auth/me (cookies are sent automatically).
        const res = await api.get("/auth/me", { skipAuthRefresh: true });

        if (res.data?.userId) {
          // Auth confirmed — store a flag so the app knows we're logged in
          navigate("/", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch {
        navigate("/login", { replace: true });
      }
    };

    completeAuth();
  }, [navigate]);

  return <h2>Logging you in...</h2>;
}