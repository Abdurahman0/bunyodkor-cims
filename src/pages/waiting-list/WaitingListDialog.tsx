import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { waitingListService, groupService } from "@/services/api.service";
import type {
  WaitingListRead,
  WaitingListCreate,
  GroupRead,
} from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";
import { Loader2 } from "lucide-react";

interface WaitingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: WaitingListRead | null;
  onSuccess?: () => void;
}

// Formdagi ma'lumotlar tuzilishi
type WaitingListFormData = {
  student_first_name: string;
  student_last_name: string;
  birth_year: number | string;
  father_name: string;
  father_phone: string;
  mother_name: string;
  mother_phone: string;
  group_id: number | string;
  priority: number | string;
  notes: string;
};

export function WaitingListDialog({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: WaitingListDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WaitingListFormData>();

  const { data: groupsData } = useQuery({
    queryKey: ["groups-list"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (entry) {
        reset({
          student_first_name: entry.student_first_name,
          student_last_name: entry.student_last_name,
          birth_year: entry.birth_year,
          father_name: entry.father_name,
          father_phone: entry.father_phone,
          mother_name: entry.mother_name,
          mother_phone: entry.mother_phone,
          group_id: entry.group_id,
          priority: entry.priority,
          notes: entry.notes || "",
        });
      } else {
        // Yangi qo'shish uchun formani tozalash
        reset({
          student_first_name: "",
          student_last_name: "",
          birth_year: "",
          father_name: "",
          father_phone: "",
          mother_name: "",
          mother_phone: "",
          group_id: "",
          priority: 50,
          notes: "",
        });
      }
    }
  }, [entry, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: WaitingListCreate) => {
      if (entry) {
        // Update
        return waitingListService.updateWaitingListEntry(entry.id, data);
      }
      // Create
      return waitingListService.addToWaitingList(data);
    },
    onSuccess: () => {
      toast.success(
        entry ? t("waitingListUpdatedSuccess") : t("waitingListAddedSuccess")
      );
      queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const onSubmit = (data: WaitingListFormData) => {
    const payload: WaitingListCreate = {
      student_first_name: data.student_first_name,
      student_last_name: data.student_last_name,
      birth_year: Number(data.birth_year),
      father_name: data.father_name,
      father_phone: data.father_phone,
      mother_name: data.mother_name,
      mother_phone: data.mother_phone,
      group_id: Number(data.group_id),
      priority: Number(data.priority),
      notes: data.notes || undefined,
    };

    if (!payload.group_id) {
      toast.error(t("pleaseSelectGroup") || "Please select a group");
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entry ? t("editWaitingListEntry") : t("addToWaitingList")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          {/* O'quvchi ma'lumotlari */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="student_first_name">Ism (Student) *</Label>
              <Input
                id="student_first_name"
                {...register("student_first_name", {
                  required: "Ism majburiy",
                })}
                placeholder="Ismni kiriting"
              />
              {errors.student_first_name && (
                <p className="text-xs text-red-500">
                  {errors.student_first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="student_last_name">Familiya (Student) *</Label>
              <Input
                id="student_last_name"
                {...register("student_last_name", {
                  required: "Familiya majburiy",
                })}
                placeholder="Familiyani kiriting"
              />
              {errors.student_last_name && (
                <p className="text-xs text-red-500">
                  {errors.student_last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="birth_year">Tug'ilgan yil *</Label>
            <Input
              id="birth_year"
              type="number"
              {...register("birth_year", {
                required: "Yil majburiy",
                valueAsNumber: true,
              })}
              placeholder="2010"
            />
            {errors.birth_year && (
              <p className="text-xs text-red-500">
                {errors.birth_year.message}
              </p>
            )}
          </div>

          {/* Ota ma'lumotlari */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1">
              <Label htmlFor="father_name">Otasining Ismi</Label>
              <Input
                id="father_name"
                {...register("father_name")}
                placeholder="To'liq ism"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="father_phone">Otasining Telefoni</Label>
              <Input
                id="father_phone"
                {...register("father_phone")}
                placeholder="+998..."
              />
            </div>
          </div>

          {/* Ona ma'lumotlari */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="mother_name">Onasining Ismi</Label>
              <Input
                id="mother_name"
                {...register("mother_name")}
                placeholder="To'liq ism"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mother_phone">Onasining Telefoni</Label>
              <Input
                id="mother_phone"
                {...register("mother_phone")}
                placeholder="+998..."
              />
            </div>
          </div>

          {/* Guruh va Prioritet */}
          <div className="space-y-1 border-t pt-4">
            <Label htmlFor="group_id">
              {t("group")} <span className="text-red-500">*</span>
            </Label>
            <Select
              id="group_id"
              {...register("group_id", { required: t("selectGroupRequired") })}
            >
              <option value="">{t("selectGroup")}</option>
              {groupsData?.data?.map((group: GroupRead) => (
                <option key={group.id} value={group.id}>
                  {group.name} (Yil: {group.birth_year})
                </option>
              ))}
            </Select>
            {errors.group_id && (
              <p className="text-sm text-red-500">{errors.group_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="priority">
              {t("priority")} (0-100) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="100"
              {...register("priority", {
                required: t("priorityRequired"),
                min: {
                  value: 0,
                  message: t("priorityMin") || "Priority must be at least 0",
                },
                max: {
                  value: 100,
                  message: t("priorityMax") || "Priority must be at most 100",
                },
              })}
              placeholder="50"
            />
            {errors.priority && (
              <p className="text-sm text-red-500">{errors.priority.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("priorityHelp") ||
                "Yuqori ustuvorlikka ega talabalar birinchi navbatda qabul qilinadi (0-100)"}
            </p>
          </div>

          {/* Izohlar */}
          <div className="space-y-1">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder={
                t("waitingListNotesPlaceholder") || "Qo'shimcha izohlar..."
              }
              rows={3}
            />
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
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("save")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
