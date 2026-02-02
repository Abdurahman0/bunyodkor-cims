/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { translations, type TranslationKey } from "@/i18n/translations";
import toast from "react-hot-toast";

const getApiUrl = () => {
  // In development, use proxy to avoid CORS issues
  return (
    import.meta.env.VITE_API_URL || "https://bunyodkor.api.cims.cognilabs.org/"
  );
};

// Helper function to get translated message
const getTranslation = (key: TranslationKey): string => {
  const language = useLanguageStore.getState().language;
  const translation = translations[language];
  if (typeof translation === "string") {
    return translation;
  }
  return translation[key] as string;
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
        `🔵 [MOCK API] ${config.method?.toUpperCase()} ${config.url}`,
      );
    }

    // HACK: Fix for contract patch requests missing `contract_creation_date`
    if (
      config.method?.toLowerCase() === "patch" &&
      config.url?.includes("/contracts/") &&
      config.data
    ) {
      let data = config.data;

      // Handle stringified body
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
          config.data = data;
        } catch (e) {
          // Ignore parse error
        }
      }

      if (data && typeof data === "object") {
        // Ensure custom_fields is an object
        if (typeof data.custom_fields === "string") {
          try {
            data.custom_fields = JSON.parse(data.custom_fields);
          } catch (e) {
            console.warn(
              "Could not parse custom_fields string in request interceptor.",
            );
          }
        }

        // If custom_fields is explicitly null, initialize it
        if (data.custom_fields === null) {
          data.custom_fields = {};
        }

        // If custom_fields is an object and is missing contract_creation_date, add it.
        if (
          data.custom_fields &&
          typeof data.custom_fields === "object" &&
          !data.custom_fields.contract_creation_date
        ) {
          // Use start_date or today's date as a fallback
          const creationDate = data.start_date
            ? new Date(data.start_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          data.custom_fields.contract_creation_date = creationDate;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log successful mock responses
    if (import.meta.env.VITE_USE_MOCK_API === "true" && import.meta.env.DEV) {
      console.log(`🟢 [MOCK API] Response:`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle different error scenarios
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      // Timeout error
      showLimitedToast.error(getTranslation("errorTimeout"));
    } else if (error.code === "ERR_NETWORK") {
      // Network error - backend might be down
      if (import.meta.env.VITE_USE_MOCK_API !== "true") {
        showLimitedToast.error(getTranslation("errorNetwork"));
      }
    } else if (error.response?.status === 401 && !originalRequest._retry) {
      // Try to refresh token
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        // No refresh token, logout
        useAuthStore.getState().logout();
        showLimitedToast.error(getTranslation("errorSessionExpired"));
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint
        const response = await axios.post(
          `${getApiUrl()}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } },
        );

        const { access_token, refresh_token: new_refresh_token } =
          response.data;

        // Update tokens in store
        useAuthStore
          .getState()
          .setAuth(
            access_token,
            new_refresh_token || refreshToken,
            useAuthStore.getState().user!,
            useAuthStore.getState().permissions,
          );

        // Update the failed request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Process queue
        processQueue(null, access_token);

        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed, logout
        useAuthStore.getState().logout();
        showLimitedToast.error(getTranslation("errorSessionExpired"));
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
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
        const firstError = detail[0];
        const errorMessage = firstError.msg || firstError.message || message;

        if (Array.isArray(firstError.loc) && firstError.loc.length > 0) {
          const field = firstError.loc
            .filter((item: any) => item !== "body")
            .join(" -> ");
          message = field ? `${field}: ${errorMessage}` : errorMessage;
        } else {
          message = errorMessage;
        }
      } else if (typeof detail === "string") {
        message = detail;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      // Check if this is a "less than or equal to" validation error (any limit)
      const isLimitValidationError =
        message.includes("Input should be less than or equal to") ||
        message.includes("less than or equal to") ||
        (typeof detail === "string" &&
          detail.includes("less than or equal to"));

      if (isLimitValidationError) {
        // Only log limit validation errors to console, don't show toast
        console.error("API Validation Error (limit check):", {
          message,
          detail: error.response?.data?.detail,
          status: error.response?.status,
          url: originalRequest?.url,
        });
      } else {
        // Show all other errors as toast in UI
        showLimitedToast.error(message);
      }
    }

    return Promise.reject(error);
  },
);
