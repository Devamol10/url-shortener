import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach token from localStorage for persistent cross-domain auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (!error.response) {
      return Promise.reject(error);
    }

    // Skip refresh if already retried or explicitly flagged
    if (originalRequest._retry || originalRequest._skipRefresh) {
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      originalRequest._retry = true;

      try {
        const refreshRes = await api.post("/api/auth/refresh", {}, {
          _skipRefresh: true,
        });

        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("token");
        if (window.location.pathname === '/dashboard') {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
