/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import {
  studentService,
  groupService,
  contractService,
} from "@/services/api.service";
import type { GroupRead } from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";
import {
  Loader2,
  UserPlus,
  CheckCircle2,
  Copy,
  Download,
  Eye,
} from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { openPdfResponse, openPdfUrl } from "@/lib/open-pdf";

interface StudentWithContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface StudentFormData {
  // --- 1. Tizim uchun (Student Data) ---
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
  status: "active" | "graduated" | "dropped" | "suspended";
  group_id: number | string;

  // --- 2. Shartnoma uchun (Contract Data) ---
  contract_number: string;

  // Student Info
  student_fio: string;
  birth_year: string;
  student_address: string;

  // Parents Info
  dad_name: string; // F.I.O
  dad_phone: string;
  dad_occupation: string;

  mom_fio: string; // F.I.O
  mom_phone: string;
  mom_occupation: string;

  // Contract Dates
  contract_start_date: string;
  contract_end_date: string;

  // Buyurtmachi
  buyurtmachi_fio: string;
  buyurtmachi_passport_series_number: string;
  buyurtmachi_who_give: string;
  buyurtmachi_when_give: string;
  buyurtmachi_address: string;
  buyurtmachi_phone: string;

  // Tarbiyalanuvchi Hujjatlari
  tarbiyalanuvchi_birth_series_number: string;
  tarbiyalanuvchi_birth_year: string;
  tarbiyalanuvchi_who_give: string;
  tarbiyalanuvchi_when_give: string;

  // To'lov
  tolov_monthly_fee: number | string;
  tolov_amount_in_words: string; // Yangi maydon: So'z bilan (masalan: "olti yuz ming")

  // --- 3. Fayllar ---
  passport_copy: FileList;
  form_086: FileList;
  heart_checkup: FileList;
  birth_certificate: FileList;
  contract_image_1: FileList;
  contract_image_2: FileList;
  contract_image_3: FileList;
  contract_image_4: FileList;
  contract_image_5: FileList;
}

const MONTH_NAMES = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

export function StudentWithContractDialog({
  open,
  onOpenChange,
  onSuccess,
}: StudentWithContractDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedContractNumber, setSuggestedContractNumber] =
    useState<string>("");
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  const steps = [
    t("preparingData"),
    t("generatingContract"),
    t("formattingDocument"),
    t("finalizing"),
  ];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    formState: { errors },
  } = useForm<StudentFormData>({
    defaultValues: {
      tolov_monthly_fee: "800000",
      tolov_amount_in_words: "саккиз юз минг",
    },
  });

  const selectedGroupId = watch("group_id");
  const birthYear = watch("birth_year");
  const primaryAddress = watch("address");
  const dateOfBirth = watch("date_of_birth");
  const [customerType, setCustomerType] = useState<
    "father" | "mother" | "other"
  >("other");

  // Watch name fields for auto-fill
  const firstName = watch("first_name");
  const lastName = watch("last_name");
  const middleName = watch("middle_name");

  // Watch parent fields for auto-fill
  const dadName = watch("dad_name");
  const dadPhone = watch("dad_phone");
  const momFio = watch("mom_fio");
  const momPhone = watch("mom_phone");

  const { data: groupsData } = useQuery({
    queryKey: ["groups-list"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
    enabled: open,
  });

  // Tug'ilgan sanadan yilni avtomatik ajratib olish
  useEffect(() => {
    if (dateOfBirth) {
      const year = new Date(dateOfBirth).getFullYear().toString();
      if (year && year.length === 4) {
        setValue("birth_year", year);
        setValue("tarbiyalanuvchi_birth_year", year);
      }
    }
  }, [dateOfBirth, setValue]);

  // Auto-fill student full name (F.I.SH)
  useEffect(() => {
    if (firstName || lastName || middleName) {
      const fullName = [lastName, firstName, middleName]
        .filter(Boolean)
        .join(" ");
      if (fullName.trim()) {
        setValue("student_fio", fullName);
      }
    }
  }, [firstName, lastName, middleName, setValue]);

  // Guruh tanlanganda shartnoma raqamini taklif qilish va bo'sh raqamlarni olish
  useEffect(() => {
    const fetchContractNumber = async () => {
      if (selectedGroupId && groupsData?.data) {
        try {
          // Tanlangan guruhni topish
          const selectedGroup = groupsData.data.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (g: any) => g.id === Number(selectedGroupId)
          );

          if (!selectedGroup) return;

          // Agar yil kiritilgan bo'lsa, yildan foydalanish, aks holda joriy yil
          const year =
            birthYear && birthYear.length === 4
              ? Number(birthYear)
              : new Date().getFullYear();

          // Get next available number (suggestion)
          const response = await contractService.getNextAvailableNumber(
            Number(selectedGroupId),
            year
          );

          if (response.data.contract_number) {
            // API dan kelgan shartnoma raqamini to'g'ridan-to'g'ri ishlatish
            // API sequential format qaytarishi kerak: N1, N2, N3, ...
            const contractNumber = response.data.contract_number;

            setSuggestedContractNumber(contractNumber);
            setValue("contract_number", contractNumber);
            toast.success(`${t("suggestion")}: ${contractNumber}`, {
              duration: 3000,
            });
          } else if (response.data.is_full) {
            toast.error(t("groupIsFull"));
          }

          // Get all available numbers (gaps)
          const availableResponse =
            await contractService.getAllAvailableNumbers(
              Number(selectedGroupId)
            );

          if (availableResponse.data?.available_numbers) {
            setAvailableNumbers(availableResponse.data.available_numbers);
          }
        } catch (error) {
          console.error("Shartnoma raqami xatosi:", error);
        }
      }
    };
    fetchContractNumber();
  }, [selectedGroupId, setValue, groupsData]);

  // Use direct link for view/download, camelCase

  const handleDownloadContract = () => {
    if (!pdfUrl) {
      toast.error(t("pdfNotFound") || "PDF topilmadi");
      return;
    }

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "shartnoma.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(t("contractDownloaded") || "Shartnoma yuklandi");
  };

  // --- YANGI FUNKSIYA BOSHLANISHI ---
  const handleViewContract = async () => {
    try {
      // Formadagi ma'lumotlarni olamiz
      const values = getValues();

      // Shartnoma raqami borligini tekshiramiz
      if (!values.contract_number) {
        toast.error("Shartnoma raqami hali shakllanmagan");
        return;
      }

      // Yilni aniqlash (start_date dan)
      const startDate = values.contract_start_date
        ? new Date(values.contract_start_date)
        : new Date();
      const year = startDate.getFullYear();

      // Loading holatini bildirish
      const toastId = toast.loading("Shartnoma fayli yuklanmoqda...");

      // API ga so'rov (api.service.ts da getContractPdf bo'lishi shart)
      const response = await contractService.getContract(
        year,
        values.contract_number
      );

      toast.dismiss(toastId);

      if (response && response.pdf_url) {
        // PDF ni yangi oynada ochish
        window.open(response.pdf_url, "_blank");
      } else {
        toast.error("PDF havolasi topilmadi");
      }
    } catch (error) {
      console.error("PDF xatolik:", error);
      toast.dismiss();
      toast.error("Shartnoma faylini ochishda xatolik yuz berdi");
    }
  };
  // --- YANGI FUNKSIYA TUGASHI ---

  const handleClose = () => {
    setIsSuccess(false);
    setIsSubmitting(false);
    setPdfUrl("");
    setLoadingProgress(0);
    setCurrentStep(0);
    onOpenChange(false);
  };

  const copyAddressToField = (
    targetField: "student_address" | "buyurtmachi_address"
  ) => {
    if (primaryAddress) {
      setValue(targetField, primaryAddress);
      toast.success(t("addressCopied") || "Manzil ko'chirildi");
    } else {
      toast.error(t("enterAddressFirst") || "Avval birinchi manzilni kiriting");
    }
  };

  const handleCustomerTypeChange = (type: "father" | "mother" | "other") => {
    setCustomerType(type);

    if (type === "father") {
      if (dadName) setValue("buyurtmachi_fio", dadName);
      if (dadPhone) setValue("buyurtmachi_phone", dadPhone);
      toast.success(
        t("fatherInfoCopied") || "Otaning ma'lumotlari ko'chirildi"
      );
    } else if (type === "mother") {
      if (momFio) setValue("buyurtmachi_fio", momFio);
      if (momPhone) setValue("buyurtmachi_phone", momPhone);
      toast.success(
        t("motherInfoCopied") || "Onaning ma'lumotlari ko'chirildi"
      );
    } else {
      // Clear customer fields when "other" is selected
      setValue("buyurtmachi_fio", "");
      setValue("buyurtmachi_phone", "");
    }
  };

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split("T")[0];
      const currentYear = new Date().getFullYear();
      const endOfYear = `${currentYear}-12-31`;

      reset({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        phone: "",
        address: "",
        status: "active",
        group_id: "",
        contract_number: "",
        student_fio: "",
        birth_year: "",
        student_address: "",
        dad_name: "",
        dad_phone: "",
        dad_occupation: "",
        mom_fio: "",
        mom_phone: "",
        mom_occupation: "",
        contract_start_date: today,
        contract_end_date: endOfYear,
        buyurtmachi_fio: "",
        buyurtmachi_passport_series_number: "",
        buyurtmachi_who_give: "",
        buyurtmachi_when_give: "",
        buyurtmachi_address: "",
        buyurtmachi_phone: "",
        tarbiyalanuvchi_birth_series_number: "",
        tarbiyalanuvchi_birth_year: "",
        tarbiyalanuvchi_who_give: "",
        tarbiyalanuvchi_when_give: "",
        tolov_monthly_fee: "800000",
        tolov_amount_in_words: "саккиз юз минг",
      });
    }
  }, [open, reset]);

  // Raqamni formatlash (1000000 -> 1 000 000)
  const formatPrice = (price: number | string) => {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const simulateProgress = async (
    stepIndex: number,
    duration: number = 1000
  ) => {
    setCurrentStep(stepIndex);
    const startProgress = stepIndex * 25;
    const endProgress = (stepIndex + 1) * 25;

    // Animate progress
    const steps = 20;
    const increment = (endProgress - startProgress) / steps;
    for (let i = 0; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, duration / steps));
      setLoadingProgress(Math.min(startProgress + increment * i, endProgress));
    }
  };

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsSubmitting(true);
      setLoadingProgress(0);
      setCurrentStep(0);

      // Sana validatsiyasi
      if (!data.contract_start_date) {
        toast.error(t("startDateRequired") || "Boshlanish sanasi majburiy!");
        setIsSubmitting(false);
        return;
      }

      // Step 0: Preparing data
      await simulateProgress(0, 800);

      // Sana parsing
      const startDateObj = new Date(data.contract_start_date);
      const startDay = startDateObj.getDate().toString().padStart(2, "0");
      const startMonthIndex = startDateObj.getMonth();
      const startMonthName = MONTH_NAMES[startMonthIndex];
      const startYear = startDateObj.getFullYear().toString();

      // 1. Student Data (DB)
      const student_data = {
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        phone: data.phone,
        address: data.address || "",
        status: data.status,
        group_id: data.group_id ? Number(data.group_id) : null,
      };

      // 2. Contract Data (PDF/Swagger)
      const contract_data = {
        contract_number: data.contract_number,

        student: {
          student_image: data.contract_image_1?.[0]?.name || "photo.jpg",
          student_fio: data.student_fio,
          birth_year: data.birth_year,
          student_address: data.student_address,
          dad_occupation: data.dad_occupation || "",
          mom_occupation: data.mom_occupation || "",
          dad_phone_number: data.dad_phone || "",
          mom_phone_number: data.mom_phone || "",
          dad_fullname: data.dad_name || "",
          mom_fullname: data.mom_fio || "",
        },

        sana: {
          kun: startDay,
          oy: startMonthName,
          yil: startYear,
        },

        buyurtmachi: {
          fio: data.buyurtmachi_fio,
          pasport_seriya: data.buyurtmachi_passport_series_number,
          pasport_kim_bergan: data.buyurtmachi_who_give,
          pasport_qachon_bergan: data.buyurtmachi_when_give,
          manzil: data.buyurtmachi_address,
          telefon: data.buyurtmachi_phone,
        },

        tarbiyalanuvchi: {
          fio: data.student_fio,
          tugilganlik_guvohnoma: data.tarbiyalanuvchi_birth_series_number,
          // Muhim: integer bo'lishi kerak
          tugilganlik_yil:
            parseInt(data.tarbiyalanuvchi_birth_year) ||
            parseInt(data.birth_year) ||
            0,
          guvohnoma_kim_bergan: data.tarbiyalanuvchi_who_give || "",
          guvohnoma_qachon_bergan: data.tarbiyalanuvchi_when_give || "",
        },

        shartnoma_muddati: {
          boshlanish: data.contract_start_date,
          tugash: data.contract_end_date,
          yil: startYear,
        },

        tolov: {
          oylik_narx: formatPrice(data.tolov_monthly_fee),
          // Bu maydon bo'sh bo'lsa backend xato berishi mumkin
          oylik_narx_sozlar: data.tolov_amount_in_words || "",
        },
      };

      const formData = new FormData();
      formData.append("student_data", JSON.stringify(student_data));
      formData.append("contract_data", JSON.stringify(contract_data));

      // Required file fields
      const requiredFileFields: (keyof StudentFormData)[] = [
        "passport_copy",
        "form_086",
        "heart_checkup",
        "birth_certificate",
        "contract_image_2",
        "contract_image_4",
      ];

      // Optional file fields
      const optionalFileFields: (keyof StudentFormData)[] = [
        "contract_image_1",
        "contract_image_3",
        "contract_image_5",
      ];

      let filesMissing = false;

      // Check required files
      for (const field of requiredFileFields) {
        if (data[field]?.[0]) {
          formData.append(field, data[field][0]);
        } else {
          filesMissing = true;
          toast.error(`${field}: ${t("fileNotUploaded") || "yuklanmagan!"}`);
        }
      }

      // Add optional files if provided
      for (const field of optionalFileFields) {
        if (data[field]?.[0]) {
          formData.append(field, data[field][0]);
        }
      }
      if (filesMissing) {
        setIsSubmitting(false);
        return;
      }

      // Step 1: Generating contract
      await simulateProgress(1, 1000);

      // Step 2: Formatting document (API call happens here)
      await simulateProgress(2, 500);

      // createStudentWithContract may return either { pdf_url: string }
      // or raw Blob depending on backend. Handle both cases.
      const response = await studentService.createStudentWithContract(formData);

      // Step 3: Finalizing
      await simulateProgress(3, 800);

      if (!response) {
        toast.error(t("pdfNotFound") || "PDF topilmadi!");
        setIsSubmitting(false);
        return;
      }

      // If backend returned an object with `pdf_url`, use it directly.
      if (
        typeof response === "object" &&
        "pdf_url" in response &&
        response.pdf_url
      ) {
        console.log("[DEBUG] PDF URL received from backend:", response.pdf_url);
        setPdfUrl(response.pdf_url as string);
        setIsSuccess(true);
      } else {
        // Fallback: assume response is binary blob (ArrayBuffer/Blob)
        try {
          const blob =
            response instanceof Blob
              ? response
              : new Blob([response], { type: "application/pdf" });
          const fileURL = window.URL.createObjectURL(blob);
          console.log("[DEBUG] Created blob URL:", fileURL);
          setPdfUrl(fileURL);
          setIsSuccess(true);
        } catch (e) {
          console.error("[DEBUG] Error creating blob URL from response", e);
          toast.error(t("pdfNotFound") || "PDF topilmadi!");
          setIsSubmitting(false);
          return;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      if (onSuccess) onSuccess();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Xatolik:", error);
      let errorMessage = t("anErrorOccurred") || "Xatolik yuz berdi";

      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.detail) {
            errorMessage =
              typeof json.detail === "string"
                ? json.detail
                : JSON.stringify(json.detail);
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          /* ignore */
        }
      } else if (error.response?.data?.detail) {
        errorMessage =
          typeof error.response.data.detail === "string"
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail);
      }

      // Check if error is about duplicate/existing contract number
      const isDuplicateContract =
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("mavjud") ||
        errorMessage.toLowerCase().includes("duplicate") ||
        errorMessage.toLowerCase().includes("contract number");

      if (isDuplicateContract && data.group_id) {
        // Retry with new contract number
        try {
          toast(
            t("retryingWithNewNumber") ||
              "Yangi shartnoma raqami bilan qayta urinilmoqda..."
          );

          const year =
            data.birth_year && data.birth_year.toString().length === 4
              ? Number(data.birth_year)
              : new Date().getFullYear();

          const response = await contractService.getNextAvailableNumber(
            Number(data.group_id),
            year
          );

          if (response.data.contract_number) {
            const newContractNumber = response.data.contract_number;
            setSuggestedContractNumber(newContractNumber);
            setValue("contract_number", newContractNumber);
            toast.success(
              `${t("newNumberSuggested")}: ${newContractNumber}` ||
                `Yangi raqam taklif qilingan: ${newContractNumber}`
            );
            toast(
              t("pleaseSubmitAgain") ||
                "Iltimos, yana bir bor 'Saqlash' tugmasini bosing"
            );
          } else {
            toast.error(errorMessage);
          }
        } catch (retryError) {
          console.error("Retry error:", retryError);
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto border-2 border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            {t("createStudentAndContract")}
          </DialogTitle>
          <DialogDescription>
            {t("fillAllFieldsDocsRequired")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* 1. TIZIM MA'LUMOTLARI VA TARBIYALANUVCHI HUJJATLARI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* TIZIM MA'LUMOTLARI */}
            <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
              <h3 className="font-bold text-blue-800 dark:text-blue-200 text-lg border-b border-blue-200 pb-2 mb-4">
                1. {t("systemStudentInfo")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{t("lastName")} *</Label>
                  <Input
                    {...register("last_name", { required: true })}
                    placeholder={t("lastName")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("firstName")} *</Label>
                  <Input
                    {...register("first_name", { required: true })}
                    placeholder={t("firstName")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("middleName") || "Sharif"}</Label>
                  <Input
                    {...register("middle_name")}
                    placeholder={t("middleName") || "Otasining ismi"}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("dateOfBirth")} *</Label>
                  <Input
                    type="date"
                    {...register("date_of_birth", { required: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("phoneNumber")} *</Label>
                  <Input
                    {...register("phone", {
                      required: true,
                      onChange: (e) => {
                        const value = e.target.value;
                        if (!value.startsWith("+998")) {
                          e.target.value = "+998" + value.replace(/^\+998/, "");
                        }
                      },
                    })}
                    placeholder="+998901234567"
                    defaultValue="+998"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <Label>{t("address")}</Label>
                  <Input {...register("address")} placeholder={t("address")} />
                </div>
                <div className="space-y-1">
                  <Label>{t("group")} *</Label>
                  <select
                    {...register("group_id", { required: true })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3"
                  >
                    <option value="">{t("selectGroupPlaceholder")}</option>
                    {groupsData?.data?.map((group: GroupRead) => (
                      <option key={group.id} value={String(group.id)}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TARBIYALANUVCHI HUJJATLARI */}
            <div className="space-y-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200">
              <h3 className="font-bold text-purple-800 dark:text-purple-200 text-lg border-b border-purple-200 pb-2 mb-4">
                {t("traineeDocuments")}
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>{t("certificateSeries")}</Label>
                    <Input
                      {...register("tarbiyalanuvchi_birth_series_number")}
                      placeholder="I-AA 1234567"
                    />
                  </div>
                  <div>
                    <Label>{t("birthYear")}</Label>
                    <Input
                      {...register("tarbiyalanuvchi_birth_year")}
                      placeholder="2012"
                      onFocus={() => {
                        if (birthYear && !watch("tarbiyalanuvchi_birth_year")) {
                          setValue("tarbiyalanuvchi_birth_year", birthYear);
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("issuedDate")}</Label>
                  <Input
                    type="date"
                    {...register("tarbiyalanuvchi_when_give")}
                  />
                </div>
                <div>
                  <Label>{t("issuedBy")}</Label>
                  <Input
                    {...register("tarbiyalanuvchi_who_give")}
                    placeholder="FHDY nomi"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. SHARTNOMA MA'LUMOTLARI */}
          <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
            <h3 className="font-bold text-green-800 dark:text-green-200 text-lg border-b border-green-200 pb-2 mb-4">
              2. {t("contractInfoForPDF")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="col-span-1 md:col-span-2 space-y-1">
                <Label className="text-green-700 font-semibold">
                  {t("contractNumber")} *
                </Label>
                <Input
                  {...register("contract_number", { required: true })}
                  className="border-green-300 focus:border-green-500"
                />
                {suggestedContractNumber && (
                  <p className="text-xs text-green-600 mt-1">
                    {t("suggestion")}: {suggestedContractNumber}
                  </p>
                )}
                {availableNumbers.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                      {t("availableNumbers") || "Qolib ketgan raqamlar"}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {availableNumbers.map((num) => {
                        const selectedGroup = groupsData?.data?.find(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (g: any) => g.id === Number(selectedGroupId)
                        );
                        const contractNumber = `${num}-${
                          selectedGroup?.name || ""
                        }`;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setValue("contract_number", contractNumber);
                              toast.success(
                                `${
                                  t("numberSelected") || "Raqam tanlandi"
                                }: ${contractNumber}`
                              );
                            }}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors border border-blue-300"
                          >
                            {contractNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>{t("studentFullName")} *</Label>
                <Input
                  {...register("student_fio", { required: true })}
                  placeholder="Ism Familiya Otasining ismi"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("birthYear")} *</Label>
                <Input
                  {...register("birth_year", { required: true })}
                  placeholder="2015"
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Label>{t("studentAddress")} *</Label>
                  {primaryAddress && (
                    <button
                      type="button"
                      onClick={() => copyAddressToField("student_address")}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Yuqoridagi manzilni ko'chirish
                    </button>
                  )}
                </div>
                <Input
                  {...register("student_address", { required: true })}
                  placeholder="Shahar, tuman, ko'cha, uy"
                  onFocus={() => {
                    if (primaryAddress && !watch("student_address")) {
                      copyAddressToField("student_address");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Tab" || e.key === "Enter") &&
                      primaryAddress &&
                      !watch("student_address")
                    ) {
                      e.preventDefault();
                      copyAddressToField("student_address");
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("startDate")} *</Label>
                <Input
                  type="date"
                  {...register("contract_start_date", { required: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("endDate")} *</Label>
                <Input
                  type="date"
                  {...register("contract_end_date", { required: true })}
                />
              </div>

              {/* To'lov qismi yangilandi */}
              <div className="space-y-1">
                <Label>{t("monthlyFee")} (UZS) *</Label>
                <Input
                  type="number"
                  {...register("tolov_monthly_fee", { required: true })}
                  placeholder="800000"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("amountInWords")} *</Label>
                <Input
                  {...register("tolov_amount_in_words", { required: true })}
                  placeholder="саккиз юз минг"
                />
              </div>
            </div>

            {/* OTA VA ONA MA'LUMOTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-green-200 pt-6">
              {/* Chap: Ota */}
              <div className="space-y-4 p-4 bg-white/60 dark:bg-black/20 rounded-lg border border-green-100 shadow-sm">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> {t("fatherInfo")}
                </h4>
                <div className="space-y-2">
                  <Label>{t("fullName")}</Label>
                  <Input {...register("dad_name")} placeholder="F.I.O" />
                </div>
                <div className="space-y-2">
                  <Label>{t("occupation")}</Label>
                  <Input
                    {...register("dad_occupation")}
                    placeholder="Korxona/tashkilot nomi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("phoneNumber")}</Label>
                  <Input
                    {...register("dad_phone", {
                      onChange: (e) => {
                        const value = e.target.value;
                        if (!value.startsWith("+998")) {
                          e.target.value = "+998" + value.replace(/^\+998/, "");
                        }
                      },
                    })}
                    placeholder="+998 XX XXX XX XX"
                    defaultValue="+998"
                  />
                </div>
              </div>

              {/* O'ng: Ona */}
              <div className="space-y-4 p-4 bg-white/60 dark:bg-black/20 rounded-lg border border-green-100 shadow-sm">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> {t("motherInfo")}
                </h4>
                <div className="space-y-2">
                  <Label>{t("fullName")}</Label>
                  <Input {...register("mom_fio")} placeholder="F.I.O" />
                </div>
                <div className="space-y-2">
                  <Label>{t("occupation")}</Label>
                  <Input
                    {...register("mom_occupation")}
                    placeholder="Korxona/tashkilot nomi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("phoneNumber")}</Label>
                  <Input
                    {...register("mom_phone", {
                      onChange: (e) => {
                        const value = e.target.value;
                        if (!value.startsWith("+998")) {
                          e.target.value = "+998" + value.replace(/^\+998/, "");
                        }
                      },
                    })}
                    placeholder="+998 XX XXX XX XX"
                    defaultValue="+998"
                  />
                </div>
              </div>
            </div>

            {/* BUYURTMACHI */}
            <div className="border-t border-green-200 pt-6 mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold mb-2 text-green-800">
                  {t("customer")}
                </h4>
                <div className="space-y-2">
                  <div>
                    <Label>{t("customerType")} *</Label>
                    <select
                      value={customerType}
                      onChange={(e) =>
                        handleCustomerTypeChange(
                          e.target.value as "father" | "mother" | "other"
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3"
                    >
                      <option value="father">{t("father")}</option>
                      <option value="mother">{t("mother")}</option>
                      <option value="other">{t("other")}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {customerType === "father" &&
                        (t("fatherInfoWillBeUsed") ||
                          "Ota ma'lumotlari ishlatiladi")}
                      {customerType === "mother" &&
                        (t("motherInfoWillBeUsed") ||
                          "Ona ma'lumotlari ishlatiladi")}
                      {customerType === "other" &&
                        (t("enterCustomerInfo") ||
                          "Buyurtmachi ma'lumotlarini kiriting")}
                    </p>
                  </div>
                  <div>
                    <Label>{t("fullName")} *</Label>
                    <Input
                      {...register("buyurtmachi_fio", { required: true })}
                      placeholder="Ism Familiya Otasining ismi"
                      readOnly={customerType !== "other"}
                      className={
                        customerType !== "other"
                          ? "bg-gray-100 dark:bg-gray-800"
                          : ""
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{t("passportSeries")} *</Label>
                      <Input
                        {...register("buyurtmachi_passport_series_number", {
                          required: true,
                        })}
                        placeholder="AA1234567"
                      />
                    </div>
                    <div>
                      <Label>{t("phoneNumber")} *</Label>
                      <Input
                        {...register("buyurtmachi_phone", { required: true })}
                        placeholder="+998 XX XXX XX XX"
                        readOnly={customerType !== "other"}
                        className={
                          customerType !== "other"
                            ? "bg-gray-100 dark:bg-gray-800"
                            : ""
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>{t("address")}</Label>
                      {primaryAddress && (
                        <button
                          type="button"
                          onClick={() =>
                            copyAddressToField("buyurtmachi_address")
                          }
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Yuqoridagi manzilni ko'chirish
                        </button>
                      )}
                    </div>
                    <Input
                      {...register("buyurtmachi_address")}
                      placeholder="Shahar, tuman, ko'cha, uy"
                      onFocus={() => {
                        if (primaryAddress && !watch("buyurtmachi_address")) {
                          copyAddressToField("buyurtmachi_address");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          (e.key === "Tab" || e.key === "Enter") &&
                          primaryAddress &&
                          !watch("buyurtmachi_address")
                        ) {
                          e.preventDefault();
                          copyAddressToField("buyurtmachi_address");
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t("issuedDate")}</Label>
                    <Input type="date" {...register("buyurtmachi_when_give")} />
                  </div>
                  <div>
                    <Label>{t("issuedBy")}</Label>
                    <Input
                      {...register("buyurtmachi_who_give")}
                      placeholder="IIB nomi"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. FAYLLAR */}
          <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200">
            <h3 className="font-bold text-orange-800 dark:text-orange-200 text-lg border-b border-orange-200 pb-2 mb-4">
              3. {t("documents")} (PNG, JPG, PDF)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Portfolio *</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  {...register("passport_copy")}
                />
              </div>
              <div>
                <Label>086-shakl *</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  {...register("form_086")}
                />
              </div>
              <div>
                <Label>Otaning pasporti *</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  {...register("contract_image_2")}
                />
              </div>
              <div>
                <Label>Tug'ilganlik guvohnoma *</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  {...register("birth_certificate")}
                />
              </div>
              <div>
                <Label>Yurak tekshiruvi *</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  {...register("heart_checkup")}
                />
              </div>
              <div>
                <Label>Onaning pasporti *</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  {...register("contract_image_4")}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white dark:bg-slate-900 p-4 shadow-lg border-t-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-40">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {t("create")}
            </Button>
          </div>
        </form>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
              {/* Progress Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {t("creatingContract")}
                </h3>
                <span className="text-2xl font-bold text-primary">
                  {Math.round(loadingProgress)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-8">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${loadingProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 transition-all duration-300 ${
                      index === currentStep
                        ? "scale-105"
                        : index < currentStep
                        ? "opacity-60"
                        : "opacity-30"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        index < currentStep
                          ? "bg-green-500 text-white"
                          : index === currentStep
                          ? "bg-primary text-white animate-pulse"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                      }`}
                    >
                      {index < currentStep ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : index === currentStep ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors ${
                        index === currentStep
                          ? "text-gray-900 dark:text-gray-100"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer Message */}
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("pleaseWaitDoNotClose")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {isSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
              {/* Success Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>

              {/* Success Message */}
              <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-3">
                {t("contractCreatedSuccess")}
              </h3>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                {t("successfullySaved")}
              </p>

              {/* PDF Link Section */}
              {pdfUrl && (
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                  <span className="text-lg">📄</span>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex-1"
                  >
                    {t("viewContractPdf") || "Shartnomani ko'rish"}
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={handleViewContract}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Eye className="w-5 h-5" />
                    Ko'rish
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDownloadContract}
                    variant="secondary"
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Download className="w-5 h-5" />
                    Yuklash
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {t("close")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
