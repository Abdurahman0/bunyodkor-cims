import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { yearLimitService } from "@/services/api.service";
import type { YearLimitUsage } from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";
import { useYearLimit, invalidateYearLimits } from "@/hooks/useYearLimit";

interface YearLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Row being edited; `null` opens the dialog in create mode. */
  limit: YearLimitUsage | null;
  onSuccess?: () => void;
}

type YearLimitFormData = {
  birth_year: number | string;
  max_students: number | string;
};

const MIN_BIRTH_YEAR = 1900;
const MAX_BIRTH_YEAR = 2100;

export function YearLimitDialog({
  open,
  onOpenChange,
  limit,
  onSuccess,
}: YearLimitDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const isEdit = Boolean(limit);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<YearLimitFormData>();

  const watchedYear = Number(watch("birth_year"));
  const watchedMax = Number(watch("max_students"));

  // Live headcount for the year being configured, so the admin sets a number
  // against the real enrolment instead of guessing.
  const { data: usage, isLoading: isLoadingUsage } = useYearLimit(
    watchedYear >= MIN_BIRTH_YEAR && watchedYear <= MAX_BIRTH_YEAR
      ? watchedYear
      : null,
  );

  useEffect(() => {
    if (!open) return;
    reset({
      birth_year: limit?.birth_year ?? new Date().getFullYear() - 7,
      max_students: limit?.max_students ?? 100,
    });
  }, [limit, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: YearLimitFormData) => {
      const birthYear = Number(data.birth_year);
      const maxStudents = Number(data.max_students);

      return isEdit
        ? yearLimitService.updateYearLimit(birthYear, {
            max_students: maxStudents,
          })
        : yearLimitService.createYearLimit({
            birth_year: birthYear,
            max_students: maxStudents,
          });
    },
    onSuccess: () => {
      invalidateYearLimits(queryClient);
      toast.success(isEdit ? t("yearLimitUpdated") : t("yearLimitCreated"));
      onOpenChange(false);
      onSuccess?.();
    },
    // Errors (409 duplicate year, 404 missing year, 422 invalid value) already
    // surface the backend `detail` through the global response interceptor.
  });

  const onSubmit = (data: YearLimitFormData) => mutation.mutate(data);

  // A limit below the current headcount is legal — it just closes the year
  // immediately — but it is almost never intended, so say so out loud.
  const isBelowCurrent =
    Boolean(usage) &&
    Number.isFinite(watchedMax) &&
    watchedMax < (usage?.current_count ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editYearLimit") : t("newYearLimit")}
          </DialogTitle>
          <DialogDescription>{t("yearLimitsDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="birth_year">
              {t("birthYear")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="birth_year"
              type="number"
              placeholder="2020"
              // The year identifies the limit, so it cannot be edited — delete
              // the row and create a new one to move a limit to another year.
              readOnly={isEdit}
              className={isEdit ? "bg-muted/50 cursor-not-allowed" : undefined}
              {...register("birth_year", {
                required: t("birthYearRequired"),
                min: { value: MIN_BIRTH_YEAR, message: t("birthYearInvalid") },
                max: { value: MAX_BIRTH_YEAR, message: t("birthYearInvalid") },
              })}
            />
            {errors.birth_year && (
              <p className="text-sm text-red-500">{errors.birth_year.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="max_students">
              {t("maxStudents")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="max_students"
              type="number"
              min={0}
              placeholder="200"
              {...register("max_students", {
                required: t("maxStudentsRequired"),
                min: { value: 0, message: t("maxStudentsInvalid") },
              })}
            />
            {errors.max_students ? (
              <p className="text-sm text-red-500">
                {errors.max_students.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("maxStudentsHint")}
              </p>
            )}
          </div>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            {isLoadingUsage ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("checkingYearLimit")}
              </span>
            ) : usage ? (
              <span className="text-muted-foreground">
                {t("currentlyEnrolled")}:{" "}
                <span className="font-semibold text-foreground">
                  {usage.current_count}
                </span>{" "}
                ({usage.birth_year})
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t("enterBirthYearToSeeUsage")}
              </span>
            )}
          </div>

          {isBelowCurrent && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {t("yearLimitBelowCurrent").replace(
                  "{{count}}",
                  String(usage?.current_count ?? 0),
                )}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEdit ? t("save") : t("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
