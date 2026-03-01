import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const completeAuth = async () => {
      try {
        // Ensure auth token works correctly with cookies
        await api.post("/api/auth/refresh");

        const res = await api.get("/api/auth/me", { skipAuthRefresh: true });

        if (res.data?.userId) {
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