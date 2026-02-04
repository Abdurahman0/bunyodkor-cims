/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { translations, type TranslationKey } from "@/i18n/translations";

// API URL ni aniqlash
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return window.location.hostname === "https://bunyodkor.api.cims.cognilabs.org";
};

export const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper: Tarjima qilish (faqat xatoliklar uchun)
const getTranslation = (key: string): string => {
  const lang = useLanguageStore.getState().language;
  const translation = translations[lang]?.[key as TranslationKey];
  return translation || key;
};

// Request Interceptor: Token qo'shish
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Xatolarni ushlash
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401: Unauthorized - Tizimdan chiqarish
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // Sahifani yangilash yoki login ga yo'naltirish (ixtiyoriy)
      // window.location.href = "/login";
    }

    // 500: Server Error - Foydalanuvchiga bildirish
    if (error.response?.status >= 500) {
      const message =
        error.response?.data?.detail || getTranslation("serverError");
      toast.error(typeof message === "string" ? message : "Server error");
    }

    return Promise.reject(error);
  },
);
