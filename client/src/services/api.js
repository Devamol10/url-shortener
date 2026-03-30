import axios from "axios";

// In development, always use '/api' so Vite proxy handles cross-origin cookies.
// In production (built), use VITE_API_URL directly.
const isDev = import.meta.env.MODE === 'development';
const VITE_API_URL = import.meta.env.VITE_API_URL;

// On Vercel, if VITE_API_URL is not set, we default to the current origin's /api
// But for robustness in cross-domain scenarios, we prefer absolute if available.
const BASE_URL = isDev
  ? '/api'
  : (VITE_API_URL ? `${VITE_API_URL}/api` : `${window.location.origin}/api`);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000, 
});

const AUTH_PATHS = [
  "/login",
  "/register",
  "/set-password",
  "/create-password",
  "/auth/callback",
  "/verification-failed"
];


let isRefreshing = false;
let failedQueue = [];



const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

// Cross-tab synchronization
const refreshChannel = new BroadcastChannel("auth_refresh_channel");

refreshChannel.onmessage = (event) => {
  if (event.data?.type === "REFRESH_STARTED") {
    isRefreshing = true;
  } else if (event.data?.type === "REFRESH_SUCCESS") {
    isRefreshing = false;
    processQueue(null, event.data.token);
  } else if (event.data?.type === "REFRESH_ERROR") {
    isRefreshing = false;
    processQueue(event.data.error, null);
  }
};

api.interceptors.request.use(async (config) => {
  if (isDev) {
    console.groupCollapsed(`🚀 [API Request] ${config.method.toUpperCase()} ${config.url}`);
    console.log('Headers:', config.headers);
    if (config.data) console.log('Payload:', config.data);
    console.groupEnd();
  }

  let token = localStorage.getItem("token");

  if (token && !config._skipRefresh) {
    const decoded = parseJwt(token);
    if (decoded && decoded.exp && (decoded.exp * 1000) - Date.now() < 120 * 1000) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshChannel.postMessage({ type: "REFRESH_STARTED" });

        try {
          const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
            withCredentials: true
          });
          const newToken = refreshRes.data?.token;
          if (newToken) {
            localStorage.setItem("token", newToken);
            token = newToken;
            isRefreshing = false;

            refreshChannel.postMessage({ type: "REFRESH_SUCCESS", token: newToken });
            processQueue(null, newToken);
          }
        } catch (error) {
          refreshChannel.postMessage({ type: "REFRESH_ERROR", error });
          processQueue(error, null);
          localStorage.removeItem("token");
          token = null;
        } finally {
          isRefreshing = false;
        }
      } else {
        try {
          token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
        } catch (error) {
          token = null;
        }
      }
    }
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Exponential Backoff helper
const sleep = ms => new Promise(res => setTimeout(res, ms));

api.interceptors.response.use(
  (response) => {
    if (isDev) {
       console.log(`✅ [API Success] ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    
    if (isDev) {
       console.error(`❌ [API Error] ${error.response?.status || 'Network'} ${originalRequest.url || 'Unknown Endpoint'}`, error);
    }

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        // Handle standalone 10s timeout explicitly handled by errorHandler.js downstream
        return Promise.reject(error);
      }

      // Retry mechanism for purely network failures (DNS/CORS/No Connection)
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        const backoffDelay = Math.pow(2, originalRequest._retryCount) * 1000;
        if (isDev) console.warn(`🔄 Retrying network request in ${backoffDelay}ms (Attempt ${originalRequest._retryCount})...`);
        await sleep(backoffDelay);
        return api(originalRequest);
      }

      return Promise.reject(error);
    }

    const isRefreshPath = originalRequest.url?.includes("/auth/refresh");

    if (originalRequest._skipRefresh || originalRequest._retry || isRefreshPath) {
      if (isRefreshPath) {
        localStorage.removeItem("token");
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          originalRequest._retry = true;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      refreshChannel.postMessage({ type: "REFRESH_STARTED" });

      try {
        const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
          _skipRefresh: true
        });

        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          refreshChannel.postMessage({ type: "REFRESH_SUCCESS", token: newToken });
        }

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        refreshChannel.postMessage({ type: "REFRESH_ERROR", error: refreshError });
        processQueue(refreshError, null);

        localStorage.removeItem("token");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Retry for 5xx Service Unavailable / Server Errors
    if (error.response.status >= 500 && !originalRequest._retry) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        const backoffDelay = Math.pow(2, originalRequest._retryCount) * 1000;
        if (isDev) console.warn(`🔄 Backend 5xx, retrying in ${backoffDelay}ms (Attempt ${originalRequest._retryCount})...`);
        await sleep(backoffDelay);
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
