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
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import {
  studentService,
  groupService,
  contractService,
} from "@/services/api.service";
import type { GroupRead } from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";
import { Loader2, UserPlus, FileText, Upload, User, Users } from "lucide-react";

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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>();

  const selectedGroupId = watch("group_id");
  const birthYear = watch("birth_year");

  const { data: groupsData } = useQuery({
    queryKey: ["groups-list"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
    enabled: open,
  });

  // Guruh va yil tanlanganda shartnoma raqamini taklif qilish
  useEffect(() => {
    const fetchContractNumber = async () => {
      if (selectedGroupId && birthYear && birthYear.length === 4) {
        try {
          const response = await contractService.getNextAvailableNumber(
            Number(selectedGroupId),
            Number(birthYear)
          );
          if (response.data.contract_number) {
            setSuggestedContractNumber(response.data.contract_number);
            setValue("contract_number", response.data.contract_number);
            toast.success(`Taklif: ${response.data.contract_number}`, {
              duration: 3000,
            });
          } else if (response.data.is_full) {
            toast.error("Bu guruh to'lgan!");
          }
        } catch (error) {
          console.error("Shartnoma raqami xatosi:", error);
        }
      }
    };
    fetchContractNumber();
  }, [selectedGroupId, birthYear, setValue]);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split("T")[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

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
        contract_end_date: nextYear.toISOString().split("T")[0],
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
        tolov_monthly_fee: "",
        tolov_amount_in_words: "",
      });
    }
  }, [open, reset]);

  // Raqamni formatlash (1000000 -> 1 000 000)
  const formatPrice = (price: number | string) => {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsSubmitting(true);

      // Sana validatsiyasi
      if (!data.contract_start_date) {
        toast.error("Boshlanish sanasi majburiy!");
        setIsSubmitting(false);
        return;
      }

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

      const fileFields: (keyof StudentFormData)[] = [
        "passport_copy",
        "form_086",
        "heart_checkup",
        "birth_certificate",
        "contract_image_1",
        "contract_image_2",
      ];

      let filesMissing = false;
      for (const field of fileFields) {
        if (data[field]?.[0]) {
          formData.append(field, data[field][0]);
        } else {
          filesMissing = true;
          toast.error(`${field} yuklanmagan!`);
        }
      }
      if (filesMissing) {
        setIsSubmitting(false);
        return;
      }

     const response = await studentService.createStudentWithContract(formData);

     const pdfUrl = response.data?.pdf_url;

     if (pdfUrl) {
       window.open(pdfUrl, "_blank"); // PDF ni to‘g‘ri ochadi
     } else {
       toast.error("PDF topilmadi!");
     }

      toast.success("Muvaffaqiyatli saqlandi!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Xatolik:", error);
      let errorMessage = "Xatolik yuz berdi";

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
        } catch (e) {
          /* ignore */
        }
      } else if (error.response?.data?.detail) {
        errorMessage =
          typeof error.response.data.detail === "string"
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail);
      }
      toast.error(errorMessage);
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
            O'quvchi va Shartnoma Yaratish
          </DialogTitle>
          <DialogDescription>
            Barcha maydonlarni to'ldiring. Hujjatlar yuklanishi shart.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* 1. TIZIM MA'LUMOTLARI */}
          <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
            <h3 className="font-bold text-blue-800 dark:text-blue-200 text-lg border-b border-blue-200 pb-2 mb-4">
              1. Tizim uchun O'quvchi ma'lumotlari
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Ism *</Label>
                <Input
                  {...register("first_name", { required: true })}
                  placeholder="Ism"
                />
              </div>
              <div className="space-y-1">
                <Label>Familiya *</Label>
                <Input
                  {...register("last_name", { required: true })}
                  placeholder="Familiya"
                />
              </div>
              <div className="space-y-1">
                <Label>Tug'ilgan sana *</Label>
                <Input
                  type="date"
                  {...register("date_of_birth", { required: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>Telefon *</Label>
                <Input
                  {...register("phone", { required: true })}
                  placeholder="+998901234567"
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <Label>Manzil</Label>
                <Input {...register("address")} placeholder="Manzil" />
              </div>
              <div className="space-y-1">
                <Label>Guruh *</Label>
                <select
                  {...register("group_id", { required: true })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  <option value="">Guruhni tanlang</option>
                  {groupsData?.data?.map((group: GroupRead) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. SHARTNOMA MA'LUMOTLARI */}
          <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
            <h3 className="font-bold text-green-800 dark:text-green-200 text-lg border-b border-green-200 pb-2 mb-4">
              2. Shartnoma ma'lumotlari (PDF uchun)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="col-span-1 md:col-span-2 space-y-1">
                <Label className="text-green-700 font-semibold">
                  Shartnoma Raqami *
                </Label>
                <Input
                  {...register("contract_number", { required: true })}
                  className="border-green-300 focus:border-green-500"
                />
                {suggestedContractNumber && (
                  <p className="text-xs text-green-600 mt-1">
                    Taklif: {suggestedContractNumber}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>O'quvchi F.I.O (To'liq) *</Label>
                <Input {...register("student_fio", { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Tug'ilgan yili *</Label>
                <Input {...register("birth_year", { required: true })} />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <Label>O'quvchi Manzili *</Label>
                <Input {...register("student_address", { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Boshlanish Sanasi *</Label>
                <Input
                  type="date"
                  {...register("contract_start_date", { required: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>Tugash Sanasi *</Label>
                <Input
                  type="date"
                  {...register("contract_end_date", { required: true })}
                />
              </div>

              {/* To'lov qismi yangilandi */}
              <div className="space-y-1">
                <Label>Oylik To'lov (UZS) *</Label>
                <Input
                  type="number"
                  {...register("tolov_monthly_fee", { required: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>Summa so'z bilan (masalan: olti yuz ming) *</Label>
                <Input
                  {...register("tolov_amount_in_words", { required: true })}
                  placeholder="olti yuz ming"
                />
              </div>
            </div>

            {/* OTA VA ONA MA'LUMOTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-green-200 pt-6">
              {/* Chap: Ota */}
              <div className="space-y-4 p-4 bg-white/60 dark:bg-black/20 rounded-lg border border-green-100 shadow-sm">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Ota Ma'lumotlari
                </h4>
                <div className="space-y-2">
                  <Label>Ismi (To'liq)</Label>
                  <Input {...register("dad_name")} placeholder="F.I.O" />
                </div>
                <div className="space-y-2">
                  <Label>Ish Joyi</Label>
                  <Input {...register("dad_occupation")} />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input {...register("dad_phone")} />
                </div>
              </div>

              {/* O'ng: Ona */}
              <div className="space-y-4 p-4 bg-white/60 dark:bg-black/20 rounded-lg border border-green-100 shadow-sm">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Ona Ma'lumotlari
                </h4>
                <div className="space-y-2">
                  <Label>Ismi (To'liq)</Label>
                  <Input {...register("mom_fio")} placeholder="F.I.O" />
                </div>
                <div className="space-y-2">
                  <Label>Ish Joyi</Label>
                  <Input {...register("mom_occupation")} />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input {...register("mom_phone")} />
                </div>
              </div>
            </div>

            {/* BUYURTMACHI VA TARBIYALANUVCHI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-green-200 pt-6 mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold mb-2 text-green-800">
                  Buyurtmachi (Passport Egasi)
                </h4>
                <div className="space-y-2">
                  <div>
                    <Label>F.I.O *</Label>
                    <Input
                      {...register("buyurtmachi_fio", { required: true })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Pasport Seriya *</Label>
                      <Input
                        {...register("buyurtmachi_passport_series_number", {
                          required: true,
                        })}
                      />
                    </div>
                    <div>
                      <Label>Telefon *</Label>
                      <Input
                        {...register("buyurtmachi_phone", { required: true })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Kim Bergan</Label>
                    <Input {...register("buyurtmachi_who_give")} />
                  </div>
                  <div>
                    <Label>Qachon Berilgan</Label>
                    <Input type="date" {...register("buyurtmachi_when_give")} />
                  </div>
                  <div>
                    <Label>Manzil</Label>
                    <Input {...register("buyurtmachi_address")} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold mb-2 text-green-800">
                  Tarbiyalanuvchi Hujjatlari
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Guvohnoma Seriyasi</Label>
                      <Input
                        {...register("tarbiyalanuvchi_birth_series_number")}
                      />
                    </div>
                    <div>
                      <Label>Tug'ilgan Yili</Label>
                      <Input
                        {...register("tarbiyalanuvchi_birth_year")}
                        placeholder="2012"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Kim Bergan</Label>
                    <Input {...register("tarbiyalanuvchi_who_give")} />
                  </div>
                  <div>
                    <Label>Qachon Berilgan</Label>
                    <Input
                      type="date"
                      {...register("tarbiyalanuvchi_when_give")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. FAYLLAR */}
          <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200">
            <h3 className="font-bold text-orange-800 dark:text-orange-200 text-lg border-b border-orange-200 pb-2 mb-4">
              3. Hujjatlar (Rasmlar/PDF)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Profil Rasmi (3x4) *</Label>
                <Input
                  type="file"
                  {...register("contract_image_1", { required: true })}
                />
              </div>
              <div>
                <Label>Shartnoma Rasmi (Scan) *</Label>
                <Input
                  type="file"
                  {...register("contract_image_2", { required: true })}
                />
              </div>
              <div>
                <Label>Pasport Nusxasi *</Label>
                <Input
                  type="file"
                  {...register("passport_copy", { required: true })}
                />
              </div>
              <div>
                <Label>086 Forma *</Label>
                <Input
                  type="file"
                  {...register("form_086", { required: true })}
                />
              </div>
              <div>
                <Label>Yurak Tekshiruvi *</Label>
                <Input
                  type="file"
                  {...register("heart_checkup", { required: true })}
                />
              </div>
              <div>
                <Label>Tug'ilganlik Guvohnomasi *</Label>
                <Input
                  type="file"
                  {...register("birth_certificate", { required: true })}
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
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-40">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Yaratish
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
