import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { translations, type TranslationKey } from "@/i18n/translations";
import toast from "react-hot-toast";

const getApiUrl = () => {
  // In development, use proxy to avoid CORS issues
  return "https://knitting-ceramic-elect-vision.trycloudflare.com/";
};

// Helper function to get translated message
const getTranslation = (key: TranslationKey): string => {
  const language = useLanguageStore.getState().language;
  return translations[language][key];
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
  timeout: 60000, // 60 seconds for file uploads and PDF generation
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
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      // Timeout error
      showLimitedToast.error(getTranslation("errorTimeout"));
    } else if (error.code === "ERR_NETWORK") {
      // Network error - backend might be down
      if (import.meta.env.VITE_USE_MOCK_API !== "true") {
        showLimitedToast.error(getTranslation("errorNetwork"));
      }
    } else if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      showLimitedToast.error(getTranslation("errorSessionExpired"));
      window.location.href = "/login";
    } else if (error.response?.status === 403) {
      showLimitedToast.error(getTranslation("errorPermissionDenied"));
    } else if (error.response?.status >= 500) {
      showLimitedToast.error(getTranslation("errorServerError"));
    } else {
      // Handle validation errors (422) and other errors
      const detail = error.response?.data?.detail;
      let message = getTranslation("errorGeneric");

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
