// src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
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
      console.error(
        `API Error [${error.config?.method?.toUpperCase() ?? "GET"}] ${error.config?.url ?? "unknown"}:`,
        {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        }
      );
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
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
