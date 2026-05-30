// src/utils/api.js
import axios from "axios";

// Sanctum cookie sessions: send cookies to the API cross-origin (default on).
// Set VITE_API_WITH_CREDENTIALS=false for Bearer-token-only (no cookies to API).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: import.meta.env.VITE_API_WITH_CREDENTIALS !== "false",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);


let _navigate = null;
export const setNavigate = (navigateFn) => {
  _navigate = navigateFn;
};

// Response interceptor for error handling
api.interceptors.response.use(
  response => {
    if (import.meta.env.DEV) {
      console.log(
        `API Success [${response.config.method.toUpperCase()}] ${response.config.url}:`,
        response.data
      );
    }
    return response;
  },
  error => {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    if (import.meta.env.DEV) {
      const base = error.config?.baseURL ?? "";
      const path = error.config?.url ?? "";
      const fullUrl = base && path ? `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}` : path || "unknown";
      const payload = {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: fullUrl,
      };
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        payload.hint =
          "No HTTP response (offline, wrong host, TLS, or CORS). If baseURL is localhost:8000, run Laravel or set VITE_API_URL to https://api.pyonea.com/api/v1 and restart Vite. Check for .env.local overriding .env.";
      }
      console.error(
        `API Error [${error.config?.method?.toUpperCase() ?? "GET"}] ${path || "unknown"}:`,
        payload
      );
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:session-expired"));

      const currentPath = window.location.pathname;
      if (
        !currentPath.includes("/login") &&
        !currentPath.includes("/register") &&
        !currentPath.includes("/verify-email")
      ) {
        if (_navigate) {
          // Preferred: React Router navigation (no full page reload)
          _navigate("/login", { replace: true });
        } else {
          // Fallback: only if setNavigate was never called
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
