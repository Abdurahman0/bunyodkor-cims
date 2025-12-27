import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import toast from "react-hot-toast";
import { groupService, userService } from "@/services/api.service";
import type {
  GroupRead,
  GroupCreateRequest,
  GroupUpdateRequest,
} from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupRead | null;
  onSuccess?: () => void;
}

// Form ma'lumotlari uchun type (API typelaridan foydalanamiz)
type GroupFormData = {
  name: string;
  identifier: string;
  birth_year: number | string;
  description: string;
  schedule_days: string;
  schedule_time: string;
  capacity: number | string;
  coach_id: number | string;
};

export function GroupDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: GroupDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormData>();

  const { data: coachesData } = useQuery({
    queryKey: ["coaches"],
    queryFn: () => userService.getCoaches(),
  });

  useEffect(() => {
    if (open) {
      if (group) {
        reset({
          name: group.name,
          identifier: group.identifier,
          birth_year: group.birth_year,
          description: group.description,
          schedule_days: group.schedule_days,
          schedule_time: group.schedule_time,
          capacity: group.capacity,
          coach_id: group.coach_id,
        });
      } else {
        reset({
          name: "",
          identifier: "",
          birth_year: new Date().getFullYear() - 7, // Default: 7 yoshli bolalar uchun
          description: "",
          schedule_days: "Mon-Wed-Fri",
          schedule_time: "14:00-16:00",
          capacity: 25, // Default sig'im
          coach_id: "",
        });
      }
    }
  }, [group, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: GroupCreateRequest | GroupUpdateRequest) => {
      if (group) {
        return groupService.updateGroup(group.id, data);
      } else {
        return groupService.createGroup(data as GroupCreateRequest);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(
        group ? t("groupUpdatedSuccess") : t("groupCreatedSuccess")
      );
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

  const onSubmit = (data: GroupFormData) => {
    const payload: GroupCreateRequest = {
      name: data.name,
      identifier: data.identifier,
      birth_year: Number(data.birth_year),
      description: data.description,
      schedule_days: data.schedule_days,
      schedule_time: data.schedule_time,
      capacity: Number(data.capacity),
      coach_id: Number(data.coach_id),
    };

    if (!payload.coach_id) {
      toast.error(t("selectCoach"));
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{group ? t("editGroup") : t("addNewGroup")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">
                {t("groupName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="U15-2B"
                {...register("name", { required: t("groupNameRequired") })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="identifier">
                {t("identifier")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="identifier"
                placeholder="B2"
                {...register("identifier", { required: t("identifierRequired") })}
              />
              {errors.identifier && (
                <p className="text-sm text-red-500">{errors.identifier.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="birth_year">
                {t("birthYear")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birth_year"
                type="number"
                placeholder="2015"
                {...register("birth_year", {
                  required: t("birthYearRequired"),
                  valueAsNumber: true,
                })}
              />
              {errors.birth_year && (
                <p className="text-sm text-red-500">
                  {errors.birth_year.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="capacity">
                {t("capacity")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="capacity"
                type="number"
                placeholder="25"
                {...register("capacity", {
                  required: t("capacityRequired"),
                  valueAsNumber: true,
                })}
              />
              {errors.capacity && (
                <p className="text-sm text-red-500">
                  {errors.capacity.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
              placeholder="Advanced training for the under-15 team"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="schedule_days">
                {t("scheduleDays")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="schedule_days"
                placeholder="Mon, Wed, Fri"
                {...register("schedule_days", {
                  required: t("scheduleDaysRequired"),
                })}
              />
              {errors.schedule_days && (
                <p className="text-sm text-red-500">
                  {errors.schedule_days.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="schedule_time">
                {t("scheduleTime")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="schedule_time"
                placeholder="15:00 - 17:00"
                {...register("schedule_time", {
                  required: t("scheduleTimeRequired"),
                })}
              />
              {errors.schedule_time && (
                <p className="text-sm text-red-500">
                  {errors.schedule_time.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="coach_id">
              {t("coach")} <span className="text-red-500">*</span>
            </Label>
            <Select
              id="coach_id"
              {...register("coach_id", { required: t("coachRequired") })}
            >
              <option value="">{t("selectCoach")}</option>
              {coachesData?.data?.map((coach: any) => (
                <option key={coach.id} value={coach.id}>
                  {coach.full_name}
                </option>
              ))}
            </Select>
            {errors.coach_id && (
              <p className="text-sm text-red-500">
                {errors.coach_id.message}
              </p>
            )}
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
              {mutation.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
