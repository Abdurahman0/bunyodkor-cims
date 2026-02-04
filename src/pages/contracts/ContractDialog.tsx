/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { contractService, studentService } from "@/services/api.service";
import type {
  ContractRead,
  ContractRead as ContractCreateType,
  StudentRead,
} from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";
import { User, Calendar, Users } from "lucide-react";
import { Link } from "react-router-dom";

// Helper to open a PDF URL by fetching as a blob and opening an object URL.
const openPdfUrl = async (url: string) => {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  } catch (err) {
    console.error("openPdfUrl error, falling back to direct open", err);
    // Fallback: try opening the original URL directly
    window.open(url, "_blank");
  }
};

// Accept various PDF responses: string URL, data-url, plain base64, or object { pdf_url | pdf | data }
const openPdfResponse = async (resp: any) => {
  try {
    if (!resp) return;

    // If it's a string, it might be a URL, a data URI, or raw base64
    if (typeof resp === 'string') {
      const s = resp.trim();
      if (s.startsWith('http://') || s.startsWith('https://')) {
        await openPdfUrl(s);
        return;
      }

      // Try to decode as base64
      try {
        const maybeBase64 = s;
        const binary = atob(maybeBase64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      } catch (e) {
        // not base64, fallthrough
      }

      // Last resort: try opening as URL
      window.open(s, '_blank');
      return;
    }

    // If it's an object, check common keys
    if (typeof resp === 'object') {
      if (resp.pdf_url) {
        await openPdfUrl(resp.pdf_url);
        return;
      }
      if (resp.pdf && typeof resp.pdf === 'string') {
        await openPdfResponse(resp.pdf);
        return;
      }
      if (resp.data && typeof resp.data === 'string') {
        await openPdfResponse(resp.data);
        return;
      }
    }
  } catch (err) {
    console.error('openPdfResponse error', err);
    // Best-effort fallback: try to open a stringified version
    try {
      const asString = typeof resp === 'string' ? resp : JSON.stringify(resp);
      window.open(asString, '_blank');
    } catch (e) {
      // ignore
    }
  }
};

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractRead | null;
  onSuccess?: () => void;
}

type ContractFormData = Omit<ContractCreateType, "student_id" | "monthly_fee"> & {
  student_id: number | string;
  monthly_fee: number | string;
};

export function ContractDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: ContractDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ContractFormData>();

  const studentIdValue = watch("student_id");

  const { data: studentsData } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      let allStudents: StudentRead[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await studentService.getStudents({
          page: currentPage,
          page_size: 100,
        });

        if (response.data && response.data.length > 0) {
          allStudents = [...allStudents, ...response.data];

          if (response.meta && currentPage < response.meta.total_pages) {
            currentPage++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return { data: allStudents, meta: { total: allStudents.length } };
    },
  });

  // Fetch selected student details
  const { data: selectedStudentData } = useQuery({
    queryKey: ["student-detail", selectedStudentId],
    queryFn: () => studentService.getStudent(selectedStudentId!),
    enabled: !!selectedStudentId,
  });

  // Update selected student ID when student_id changes
  useEffect(() => {
    if (studentIdValue && studentIdValue !== "") {
      setSelectedStudentId(Number(studentIdValue));
    } else {
      setSelectedStudentId(null);
    }
  }, [studentIdValue]);

  useEffect(() => {
    if (open) {
      if (contract) {
        reset({
          ...contract,
          start_date: format(new Date(contract.start_date), "yyyy-MM-dd"),
          end_date: format(new Date(contract.end_date), "yyyy-MM-dd"),
        });
      } else {
        reset({
          contract_number: "",
          student_id: "",
          start_date: "",
          end_date: "",
          monthly_fee: "",
          status: "active",
        });
      }
    }
  }, [contract, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (contract) {
        return contractService.updateContract(contract.id, data);
      }
      return contractService.createContract(data as ContractRead);
    },
    onSuccess: async (response) => {
      toast.success(
        contract ? t("contractUpdatedSuccess") : t("contractCreatedSuccess")
      );

      // Automatically open PDF after creating a new contract
      if (!contract && response?.data) {
        const createdContract = response.data;

        // First try to use final_pdf_url if available
        if (createdContract.final_pdf_url) {
          await openPdfUrl(createdContract.final_pdf_url);
        } else {
          // Fallback: fetch PDF URL using year and contract number
          try {
            const year = new Date(createdContract.start_date).getFullYear();
            const pdfResponse = await contractService.getContractPdfUrl(
              year,
              createdContract.contract_number
            );

            const url =
              typeof pdfResponse === "object" &&
              pdfResponse !== null &&
              "pdf_url" in pdfResponse
                ? (pdfResponse as any).pdf_url
                : pdfResponse;

            if (url && typeof url === "string") {
              await openPdfUrl(url);
            }
          } catch (error) {
            console.error("Failed to fetch PDF URL:", error);
            toast.error(t("pdfNotFound") || "PDF topilmadi");
          }
        }
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t("anErrorOccurred");

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: ContractFormData) => {
    const payload = {
      ...data,
      student_id: Number(data.student_id),
      monthly_fee: Number(data.monthly_fee),
    };

    // Fix for custom_fields: ensure it is an object if it exists (backend expects dict, not string)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = data as any;
    if (rawData.custom_fields && typeof rawData.custom_fields === "string") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload as any).custom_fields = JSON.parse(rawData.custom_fields);
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (payload as any).custom_fields;
      }
    }

    if (!payload.student_id) {
      toast.error(t("pleaseSelectStudent"));
      return;
    }
    mutation.mutate(payload);
  };

  const selectedStudent = selectedStudentData?.data;
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {contract ? t("editContract") : t("newContract")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="contract_number">
              {t("contractNumber")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contract_number"
              {...register("contract_number", {
                required: t("contractNumberRequired"),
              })}
              placeholder="e.g., BFA-2025-001"
              disabled={!!contract}
            />
            {errors.contract_number && (
              <p className="text-sm text-red-500">
                {errors.contract_number.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="student_id">
              {t("student")} <span className="text-red-500">*</span>
            </Label>

            {/* Show student select only when creating new contract */}
            {!contract && (
              <>
                <Select
                  id="student_id"
                  {...register("student_id", {
                    required: t("selectStudentRequired"),
                  })}
                >
                  <option value="">{t("selectStudent")}</option>
                  {studentsData?.data?.map((student: StudentRead) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </option>
                  ))}
                </Select>
                {errors.student_id && (
                  <p className="text-sm text-red-500">
                    {errors.student_id.message}
                  </p>
                )}
              </>
            )}

            {/* Show student name only when editing existing contract */}
            {contract && selectedStudent && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <User className="w-4 h-4" />
                  <Link
                    to={`/students/${selectedStudent.id}`}
                    className="text-base hover:underline"
                    target="_blank"
                  >
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </Link>
                </div>
              </div>
            )}

            {/* Dynamic Student Info Display */}
            {selectedStudent && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                  <User className="w-4 h-4" />
                  <span>{t("studentInformation")}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[80px]">
                      {t("studentName")}:
                    </span>
                    <Link
                      to={`/students/${selectedStudent.id}`}
                      className="text-blue-900 dark:text-blue-100 hover:underline"
                      target="_blank"
                    >
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </Link>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[80px]">
                      {t("phoneNumber")}:
                    </span>
                    <span className="text-blue-900 dark:text-blue-100">
                      {selectedStudent.phone}
                    </span>
                  </div>
                  {selectedStudent.date_of_birth && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <span className="font-medium text-blue-700 dark:text-blue-300 mr-2">
                          {t("birthYear")}:
                        </span>
                        <span className="text-blue-900 dark:text-blue-100">
                          {new Date(
                            selectedStudent.date_of_birth
                          ).getFullYear()}{" "}
                          ({calculateAge(selectedStudent.date_of_birth)}{" "}
                          {t("yearsOld")})
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[80px]">
                      {t("status")}:
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {t(selectedStudent.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start_date">
                {t("startDate")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date", {
                  required: t("startDateRequired"),
                })}
                disabled={!!contract}
              />
              {errors.start_date && (
                <p className="text-sm text-red-500">
                  {errors.start_date.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="end_date">
                {t("endDate")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date", { required: t("endDateRequired") })}
                disabled={!!contract}
              />
              {errors.end_date && (
                <p className="text-sm text-red-500">
                  {errors.end_date.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="monthly_fee">
                {t("monthlyFee")} (UZS) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="monthly_fee"
                type="number"
                {...register("monthly_fee", {
                  required: t("monthlyFeeRequired"),
                  valueAsNumber: true,
                })}
                placeholder="e.g., 500000"
                disabled={!!contract}
              />
              {errors.monthly_fee && (
                <p className="text-sm text-red-500">
                  {errors.monthly_fee.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">
                {t("status")} <span className="text-red-500">*</span>
              </Label>
              <Select id="status" {...register("status")}>
                <option value="active">{t("active")}</option>
                <option value="expired">{t("expired")}</option>
                <option value="terminated">{t("terminated")}</option>
                <option value="archived">{t("archived")}</option>
                <option value="deleted">{t("deleted")}</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("saving") : t("saveContract")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
