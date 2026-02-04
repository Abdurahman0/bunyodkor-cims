/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { translations, type TranslationKey } from "@/i18n/translations";
import toast from "react-hot-toast";

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.DEV) {
    return "/api";
  }
  return "https://bunyodkor.api.cims.cognilabs.org/";
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
            // Not a valid JSON string, let it pass through
            return config;
          }
        }

        // --- FINAL FIX ---
        // This logic transforms the contract patch data to match the API's expected structure.
        if (data && data.custom_fields) {
          // Ensure `custom_fields` is an object, parsing if necessary.
          if (typeof data.custom_fields === "string") {
            try {
              data.custom_fields = JSON.parse(data.custom_fields);
            } catch {
              data.custom_fields = {}; // Initialize if parsing fails
            }
          } else if (typeof data.custom_fields !== 'object' || data.custom_fields === null) {
            data.custom_fields = {};
          }

          const cf = data.custom_fields;
          const today = new Date().toISOString().split("T")[0];

          // 1. Ensure `contract_creation_date`
          cf.contract_creation_date = cf.contract_creation_date || data.start_date || today;

          // 2. Create `customer` from `buyurtmachi`
          const customerData = cf.buyurtmachi || {};
          cf.customer = {
            full_name: customerData.fio || "string",
            passport_number: customerData.pasport_seriya || "string",
            passport_issued_by: customerData.pasport_kim_bergan || "string",
            passport_issue_date: customerData.pasport_qachon_bergan || today,
            address: customerData.manzil || "string",
            phone: customerData.telefon || "string",
          };

          // 3. Create `student` object
          const studentData = cf.student || {};
          const nameParts = (studentData.student_fio || "string string").trim().split(/\s+/);
          cf.student = {
            birth_year: parseInt(String(studentData.birth_year), 10) || 0,
            first_name: studentData.first_name || nameParts[1] || "string",
            last_name: studentData.last_name || nameParts[0] || "string",
            patronymic: studentData.patronymic || nameParts.slice(2).join(" ") || "string",
            address: studentData.student_address || studentData.address || "string",
            phone: studentData.dad_phone_number || studentData.mom_phone_number || "string",
          };

          // 4. Create `father` object
          cf.father = {
            full_name: studentData.dad_fullname || "string",
            occupation: studentData.dad_occupation || "string",
            phone: studentData.dad_phone_number || "string",
          };

          // 5. Create `mother` object
          cf.mother = {
            full_name: studentData.mom_fullname || "string",
            occupation: studentData.mom_occupation || "string",
            phone: studentData.mom_phone_number || "string",
          };

          // 6. Create `parent_passport` from `buyurtmachi`
          cf.parent_passport = {
            series_number: customerData.pasport_seriya || "string",
            issued_by: customerData.pasport_kim_bergan || "string",
            issue_date: customerData.pasport_qachon_bergan || today,
          };

          // 7. Create `student_birth_certificate` from `tarbiyalanuvchi`
          const birthCertData = cf.tarbiyalanuvchi || {};
          cf.student_birth_certificate = {
            full_name: birthCertData.fio || "string",
            series: birthCertData.tugilganlik_guvohnoma || "string",
            issued_by: birthCertData.guvohnoma_kim_bergan || "string",
            issue_date: birthCertData.guvohnoma_qachon_bergan || today,
          };

          // 8. Create `contract_terms`
          const termsData = cf.shartnoma_muddati || {};
          let fee = 0;
          if (cf.tolov && cf.tolov.oylik_narx) {
              fee = parseInt(String(cf.tolov.oylik_narx).replace(/\s/g, ""), 10) || 0;
          }
          cf.contract_terms = {
            contract_start_date: termsData.boshlanish || data.start_date || today,
            contract_end_date: termsData.tugash || data.end_date || today,
            monthly_fee: fee,
          };
          
          // 9. Clean up old, temporary fields from custom_fields
          delete cf.buyurtmachi;
          delete cf.tarbiyalanuvchi;
          delete cf.shartnoma_muddati;
          delete cf.tolov;
          delete cf.sana;
          // Clean up fields that were moved from student object
          if(cf.student) {
            delete cf.student.student_fio;
            delete cf.student.student_address;
            delete cf.student.dad_fullname;
            delete cf.student.dad_occupation;
            delete cf.student.dad_phone_number;
            delete cf.student.mom_fullname;
            delete cf.student.mom_occupation;
            delete cf.student.mom_phone_number;
          }
        }

        // Re-stringify if the original was a string
        if (isStringData) {
          config.data = JSON.stringify(data);
        } else {
          config.data = data;
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
