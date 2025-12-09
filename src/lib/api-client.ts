import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || "https://coordinated-domestic-path-broker.trycloudflare.com/";
};

// Toast ID'larini saqlash
const toastIds: string[] = [];
const MAX_TOASTS = 3;

// Toastlarni cheklash
const showLimitedToast = {
  error: (message: string) => {
    if (toastIds.length >= MAX_TOASTS) {
      const oldestId = toastIds.shift();
      if (oldestId) toast.dismiss(oldestId);
    }
    const id = toast.error(message);
    toastIds.push(id);
    return id;
  },
  success: (message: string) => {
    if (toastIds.length >= MAX_TOASTS) {
      const oldestId = toastIds.shift();
      if (oldestId) toast.dismiss(oldestId);
    }
    const id = toast.success(message);
    toastIds.push(id);
    return id;
  },
};

export const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log mock API usage in development
    if (import.meta.env.VITE_USE_MOCK_API === "true" && import.meta.env.DEV) {
      console.log(
        `🔵 [MOCK API] ${config.method?.toUpperCase()} ${config.url}`
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log successful mock responses
    if (import.meta.env.VITE_USE_MOCK_API === "true" && import.meta.env.DEV) {
      console.log(`🟢 [MOCK API] Response:`, response.data);
    }
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.code === "ERR_NETWORK") {
      // Network error - backend might be down
      if (import.meta.env.VITE_USE_MOCK_API !== "true") {
        showLimitedToast.error(
          "Unable to connect to server. Please check if backend is running or enable mock API."
        );
      }
    } else if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      showLimitedToast.error("Session expired. Please login again.");
      window.location.href = "/login";
    } else if (error.response?.status === 403) {
      showLimitedToast.error("You do not have permission for this action");
    } else if (error.response?.status >= 500) {
      showLimitedToast.error("Server error. Please try again later.");
    } else {
      // Handle validation errors (422) and other errors
      const detail = error.response?.data?.detail;
      let message = "An error occurred";

      if (Array.isArray(detail) && detail.length > 0) {
        // FastAPI validation error - extract first error message
        message = detail[0].msg || detail[0].message || message;
      } else if (typeof detail === "string") {
        message = detail;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      showLimitedToast.error(message);
    }

    return Promise.reject(error);
  }
);
