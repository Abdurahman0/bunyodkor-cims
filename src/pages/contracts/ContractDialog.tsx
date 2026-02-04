/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { User, Calendar, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Select komponenti loyihangizda oddiy <select> wrapper ekan, shuning uchun faqat Select import qilinadi
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { contractService, studentService } from "@/services/api.service";
import type { ContractRead, StudentRead } from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";
import { openPdfResponse, openPdfUrl } from "@/lib/open-pdf";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractRead | null;
  onClose?: () => void;
}

interface ContractFormData {
  contract_number: string;
  student_id: string;
  start_date: string;
  end_date: string;
  monthly_fee: number;
  status: string;
}

export function ContractDialog({
  open,
  onOpenChange,
  contract,
  onClose,
}: ContractDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ContractFormData>({
    defaultValues: {
      status: "active",
      monthly_fee: 0,
    },
  });

  const studentIdValue = watch("student_id");

  // Talabalarni olish
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["students-list-contract"],
    queryFn: async () => {
      const response = await studentService.getStudents({
        page: 1,
        page_size: 100,
      });
      return response.data || [];
    },
    enabled: open && !contract,
  });

  // Tanlangan talaba ma'lumotlari
  const { data: selectedStudentData } = useQuery({
    queryKey: ["student-detail", selectedStudentId],
    queryFn: () => studentService.getStudent(selectedStudentId!),
    enabled: !!selectedStudentId,
  });

  const selectedStudent = selectedStudentData;

  // Formani to'ldirish
  useEffect(() => {
    if (open) {
      if (contract) {
        reset({
          contract_number: contract.contract_number,
          student_id: contract.student_id?.toString() || "",
          start_date: contract.start_date
            ? format(new Date(contract.start_date), "yyyy-MM-dd")
            : "",
          end_date: contract.end_date
            ? format(new Date(contract.end_date), "yyyy-MM-dd")
            : "",
          monthly_fee: contract.monthly_fee,
          status: contract.status || "active",
        });
        setSelectedStudentId(contract.student_id);
      } else {
        reset({
          contract_number: "",
          student_id: "",
          start_date: format(new Date(), "yyyy-MM-dd"),
          end_date: format(
            new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            "yyyy-MM-dd",
          ),
          monthly_fee: 0,
          status: "active",
        });
        setSelectedStudentId(null);
      }
    }
  }, [contract, open, reset]);

  useEffect(() => {
    if (studentIdValue) setSelectedStudentId(Number(studentIdValue));
  }, [studentIdValue]);

  // Mutation
  const mutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        student_id: Number(data.student_id),
        monthly_fee: Number(data.monthly_fee),
      };

      if (contract) {
        return contractService.updateContract(contract.id, payload);
      }
      return contractService.createContract(payload);
    },
    onSuccess: async (response) => {
      toast.success(contract ? t("contractUpdated") : t("contractCreated"));
      queryClient.invalidateQueries({ queryKey: ["contracts"] });

      // PDF ochish logikasi
      if (!contract && response) {
        const createdContract = response.data || response;
        if (createdContract.final_pdf_url) {
          await openPdfUrl(createdContract.final_pdf_url);
        } else if (
          createdContract.contract_number &&
          createdContract.start_date
        ) {
          try {
            const year = new Date(createdContract.start_date).getFullYear();
            const pdfData = await contractService.getContractPdfUrl(
              year,
              createdContract.contract_number,
            );
            await openPdfResponse(pdfData);
          } catch (error) {
            console.error("PDF olishda xatolik", error);
          }
        }
      }

      onOpenChange(false);
      if (onClose) onClose();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || t("errorOccurred");
      toast.error(typeof msg === "string" ? msg : "Xatolik yuz berdi");
    },
  });

  const onSubmit = (data: ContractFormData) => mutation.mutate(data);

  const calculateAge = (dob: string) => {
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? t("editContract") : t("createContract")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>
              {t("contractNumber")} <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register("contract_number", { required: t("required") })}
              placeholder="e.g., BFA-2026-001"
              disabled={!!contract}
            />
            {errors.contract_number && (
              <p className="text-xs text-red-500">
                {errors.contract_number.message}
              </p>
            )}
          </div>

          {/* Student Select: Oddiy Select va Options bilan */}
          {!contract && (
            <div className="space-y-1">
              <Label>
                {t("student")} <span className="text-red-500">*</span>
              </Label>
              <Select {...register("student_id", { required: t("required") })}>
                <option value="">{t("selectStudent")}</option>
                {isLoadingStudents ? (
                  <option disabled>Loading...</option>
                ) : (
                  studentsData?.map((student: StudentRead) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </option>
                  ))
                )}
              </Select>
              {errors.student_id && (
                <p className="text-xs text-red-500">
                  {errors.student_id.message}
                </p>
              )}
            </div>
          )}

          {selectedStudent && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm space-y-1">
              <div className="font-medium flex justify-between">
                <span>
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </span>
                <Badge variant="outline">{selectedStudent.status}</Badge>
              </div>
              <div className="text-muted-foreground text-xs">
                {selectedStudent.phone} •{" "}
                {selectedStudent.date_of_birth &&
                  `${calculateAge(selectedStudent.date_of_birth)} yosh`}
              </div>
              {contract && (
                <Link
                  to={`/students/${selectedStudent.id}`}
                  target="_blank"
                  className="text-blue-500 hover:underline text-xs inline-block pt-1"
                >
                  {t("viewProfile")}
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("startDate")}</Label>
              <Input
                type="date"
                {...register("start_date", { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("endDate")}</Label>
              <Input
                type="date"
                {...register("end_date", { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("monthlyFee")}</Label>
              <Input
                type="number"
                {...register("monthly_fee", {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </div>
            {/* Status Select: Oddiy Select va Options bilan */}
            <div className="space-y-1">
              <Label>{t("status")}</Label>
              <Select {...register("status")}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
