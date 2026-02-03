/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { translations, type TranslationKey } from "@/i18n/translations";
import toast from "react-hot-toast";

const getApiUrl = () => {
  // In development, use proxy to avoid CORS issues if set up, otherwise direct API
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

    // FIX: Contract patch requests logic (Safe version)
    if (
      config.method?.toLowerCase() === "patch" &&
      config.url?.includes("/contracts/") &&
      config.data
    ) {
      try {
        let data = config.data;
        let isStringData = false;

        // Handle stringified body safely
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
            isStringData = true;
          } catch (e) {
            // Agar parse qilib bo'lmasa, demak bu oddiy string yoki form-data, unga tegmaymiz
            return config;
          }
        }

        if (data && typeof data === "object") {
          // Ensure custom_fields is initialized
          if (!data.custom_fields || typeof data.custom_fields !== "object") {
             // Agar string bo'lsa parse qilamiz
             if (typeof data.custom_fields === "string") {
                try {
                   data.custom_fields = JSON.parse(data.custom_fields);
                } catch {
                   data.custom_fields = {};
                }
             } else {
                data.custom_fields = {};
             }
          }

          const cf = data.custom_fields;
          const today = new Date().toISOString().split("T")[0];

          // 0. Ensure contract_creation_date
          if (!cf.contract_creation_date) {
            const dateStr = data.start_date || today;
            const dateObj = new Date(dateStr);
            cf.contract_creation_date = isNaN(dateObj.getTime())
              ? today
              : dateObj.toISOString().split("T")[0];
          }

          // 1. Map 'buyurtmachi' to 'customer'
          if (!cf.customer && cf.buyurtmachi) {
            cf.customer = {
              full_name: cf.buyurtmachi.fio || "Unknown",
              passport_number: cf.buyurtmachi.pasport_seriya || "Unknown",
              passport_issued_by:
                cf.buyurtmachi.pasport_kim_bergan || "Unknown",
              passport_issue_date:
                cf.buyurtmachi.pasport_qachon_bergan || today,
              address: cf.buyurtmachi.manzil || "Unknown",
              phone: cf.buyurtmachi.telefon || "Unknown",
            };
          } else if (!cf.customer) {
            // Default customer struct
            cf.customer = {
              full_name: "-",
              passport_number: "-",
              passport_issued_by: "-",
              passport_issue_date: today,
              address: "-",
              phone: "-",
            };
          }

          // 2. Fix 'student' fields
          if (cf.student) {
            // Map FIO
            if (!cf.student.first_name && cf.student.student_fio) {
              const parts = cf.student.student_fio.trim().split(/\s+/);
              if (parts.length > 0) cf.student.last_name = parts[0];
              if (parts.length > 1) cf.student.first_name = parts[1];
              if (parts.length > 2)
                cf.student.patronymic = parts.slice(2).join(" ");
            }
            // Map address
            if (!cf.student.address && cf.student.student_address) {
              cf.student.address = cf.student.student_address;
            }
            // Map phone
            if (!cf.student.phone) {
              cf.student.phone =
                cf.student.dad_phone_number ||
                cf.student.mom_phone_number ||
                "Unknown";
            }
            // Ensure birth_year is int and valid
            if (cf.student.birth_year) {
              const year = parseInt(String(cf.student.birth_year), 10);
              cf.student.birth_year = isNaN(year) ? 2015 : year;
            } else {
              cf.student.birth_year = 2015;
            }

            // Defaults
            if (!cf.student.first_name) cf.student.first_name = "Unknown";
            if (!cf.student.last_name) cf.student.last_name = "Unknown";
            if (!cf.student.address) cf.student.address = "Unknown";
          } else {
            cf.student = {
              first_name: "-",
              last_name: "-",
              birth_year: 2015,
              address: "-",
              phone: "-",
            };
          }

          // 3. Map 'parent_passport'
          if (!cf.parent_passport && cf.buyurtmachi) {
            cf.parent_passport = {
              series_number: cf.buyurtmachi.pasport_seriya || "Unknown",
              issued_by: cf.buyurtmachi.pasport_kim_bergan || "Unknown",
              issue_date: cf.buyurtmachi.pasport_qachon_bergan || today,
            };
          } else if (!cf.parent_passport) {
            cf.parent_passport = {
              series_number: "-",
              issued_by: "-",
              issue_date: today,
            };
          }

          // 4. Map 'student_birth_certificate'
          if (!cf.student_birth_certificate && cf.tarbiyalanuvchi) {
            cf.student_birth_certificate = {
              full_name: cf.tarbiyalanuvchi.fio || "Unknown",
              series: cf.tarbiyalanuvchi.tugilganlik_guvohnoma || "Unknown",
              issued_by: cf.tarbiyalanuvchi.guvohnoma_kim_bergan || "Unknown",
              issue_date: cf.tarbiyalanuvchi.guvohnoma_qachon_bergan || today,
            };
          } else if (!cf.student_birth_certificate) {
            cf.student_birth_certificate = {
              full_name: "-",
              series: "-",
              issued_by: "-",
              issue_date: today,
            };
          }

          // 5. Map 'contract_terms'
          if (!cf.contract_terms && cf.shartnoma_muddati) {
            let fee = 0;
            if (cf.tolov && cf.tolov.oylik_narx) {
              fee = parseInt(String(cf.tolov.oylik_narx).replace(/\s/g, ""), 10);
              if (isNaN(fee)) fee = 0;
            }
            cf.contract_terms = {
              contract_start_date: cf.shartnoma_muddati.boshlanish || today,
              contract_end_date: cf.shartnoma_muddati.tugash || today,
              monthly_fee: fee,
            };
          } else if (!cf.contract_terms) {
            cf.contract_terms = {
              contract_start_date: today,
              contract_end_date: today,
              monthly_fee: 0,
            };
          }

          // Yangilangan ma'lumotni configga qaytarish
          // Agar axios avval string olgan bo'lsa, yana stringga o'giramiz
          if (isStringData) {
            config.data = JSON.stringify(data);
          } else {
            config.data = data;
          }
        }
      } catch (error) {
        console.error("Interceptor Safe Fix Error:", error);
        // Xato bo'lsa ham so'rovni buzmasdan asl holicha yuboramiz
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
      showLimitedToast.error(getTranslation("errorTimeout"));
    } else if (error.code === "ERR_NETWORK") {
      // Network error 
      // Agar bu mock API bo'lmasa, demak jiddiy aloqa muammosi yoki CORS
      if (import.meta.env.VITE_USE_MOCK_API !== "true") {
        console.error("Network Error Details:", error);
        showLimitedToast.error(getTranslation("errorNetwork"));
      }
    } else if (error.response?.status === 401 && !originalRequest._retry) {
      // Try to refresh token
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        showLimitedToast.error(getTranslation("errorSessionExpired"));
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
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
        const response = await axios.post(
          `${getApiUrl()}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } },
        );

        const { access_token, refresh_token: new_refresh_token } =
          response.data;

        useAuthStore
          .getState()
          .setAuth(
            access_token,
            new_refresh_token || refreshToken,
            useAuthStore.getState().user!,
            useAuthStore.getState().permissions,
          );

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

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

      const isLimitValidationError =
        message.includes("Input should be less than or equal to") ||
        message.includes("less than or equal to") ||
        (typeof detail === "string" &&
          detail.includes("less than or equal to"));

      if (isLimitValidationError) {
        console.error("API Validation Error (limit check):", {
          message,
          detail: error.response?.data?.detail,
          status: error.response?.status,
          url: originalRequest?.url,
        });
      } else {
        showLimitedToast.error(message);
      }
    }

    return Promise.reject(error);
  },
);
