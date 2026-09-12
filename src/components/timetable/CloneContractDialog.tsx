/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportService, contractService, groupService } from "@/services/api.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLanguageStore } from "@/store/languageStore";
import { formatGroupSelectLabel } from "@/lib/name-utils";
import { useYearLimit, invalidateYearLimits } from "@/hooks/useYearLimit";
import { YearLimitNotice } from "@/components/year-limits/YearLimitNotice";
import toast from "react-hot-toast";

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentYearEndDate = () => {
  const date = new Date();
  return formatDateInputValue(new Date(date.getFullYear(), 11, 31));
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminatedContractId: number;
}

export function CloneContractDialog({ open, onOpenChange, terminatedContractId }: Props) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const today = useMemo(() => formatDateInputValue(new Date()), []);
  const currentYearEnd = useMemo(() => getCurrentYearEndDate(), []);

  const [formData, setFormData] = useState({
    terminated_contract_id: terminatedContractId,
    group_id: 0,
    contract_number: "",
    start_date: today,
    end_date: currentYearEnd,
    monthly_fee: 800000,
  });

  const { data: availableInfo, isLoading } = useQuery({
    queryKey: ["clone-available", terminatedContractId],
    queryFn: () => reportService.getCloneAvailableInfo(terminatedContractId),
    enabled: open && !!terminatedContractId,
  });

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["groups-list", "activate-contract-modal"],
    queryFn: async () => {
      const firstPage = await groupService.getGroups({ page: 1, page_size: 100 });
      const totalPages = firstPage.meta?.total_pages || 1;

      if (totalPages <= 1) {
        return firstPage.data || [];
      }

      const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, idx) =>
          groupService.getGroups({ page: idx + 2, page_size: 100 }),
        ),
      );

      return [
        ...(firstPage.data || []),
        ...restPages.flatMap((response) => response.data || []),
      ];
    },
    enabled: open,
  });

  const { data: suggestedContractNumber } =
    useQuery({
      queryKey: ["next-available-contract-number", formData.group_id],
      queryFn: () => contractService.getNextAvailableNumber(formData.group_id),
      enabled: open && formData.group_id > 0,
      select: (response) => response.data,
    });

  useEffect(() => {
    if (!open) return;

    const available = availableInfo?.data as any;

    setFormData((current) => ({
      ...current,
      terminated_contract_id: terminatedContractId,
      group_id:
        available?.group_id ?? available?.contract_group_id ?? current.group_id,
      contract_number:
        current.contract_number || available?.suggested_contract_number || "",
      start_date: today,
      end_date: currentYearEnd,
      monthly_fee: available?.monthly_fee ?? current.monthly_fee,
    }));
  }, [availableInfo, currentYearEnd, open, terminatedContractId, today]);

  useEffect(() => {
    if (!suggestedContractNumber?.contract_number) return;

    setFormData((current) => ({
      ...current,
      contract_number: suggestedContractNumber.contract_number,
    }));
  }, [suggestedContractNumber]);

  // Cloning a terminated contract creates a NEW active contract, so it counts
  // against the birth-year limit exactly like a fresh enrolment does.
  const selectedGroupBirthYear =
    groupsData?.find((group: any) => group.id === Number(formData.group_id))
      ?.birth_year ?? null;

  const { data: yearUsage } = useYearLimit(selectedGroupBirthYear);
  const isYearFull = Boolean(yearUsage?.is_full);

  const cloneMutation = useMutation({
    mutationFn: (data: any) => contractService.cloneFromTerminated(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["student-full-info"] });
      invalidateYearLimits(queryClient);
      toast.success(t("contractClonedSuccess") || "Contract activated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      // 409 = the birth year filled up since the banner loaded; re-read it and
      // show the server's own explanation rather than the generic message.
      if (error?.response?.status === 409) invalidateYearLimits(queryClient);

      const detail = error?.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : t("failedToCloneContract"),
      );
    },
  });

  const groupOptions = useMemo(
    () =>
      groupsData?.map((group: any) => ({
        value: String(group.id),
        label: formatGroupSelectLabel(group),
        keywords: [
          group.name,
          group.birth_year,
          group.coach_first_name,
          group.coach_last_name,
          String(group.id),
        ]
          .filter(Boolean)
          .map(String),
      })) || [],
    [groupsData],
  );

  const validate = () => {
    if (!formData.group_id || Number(formData.group_id) <= 0) {
      toast.error(t("selectGroup") || "Please select a group");
      return false;
    }
    if (!formData.contract_number || !formData.contract_number.trim()) {
      toast.error(t("enterContractNumber") || "Please enter contract number");
      return false;
    }
    if (!formData.start_date) {
      toast.error(t("startDateRequired") || "Start date is required");
      return false;
    }
    if (!formData.end_date) {
      toast.error(t("endDateRequired") || "End date is required");
      return false;
    }
    if (formData.start_date > formData.end_date) {
      toast.error(t("dateRangeInvalid") || "From date cannot be later than To date");
      return false;
    }
    if (!formData.monthly_fee || Number(formData.monthly_fee) <= 0) {
      toast.error(t("monthlyFeeRequired") || "Monthly fee must be greater than zero");
      return false;
    }
    if (isYearFull) {
      toast.error(
        t("yearLimitReachedShort").replace(
          "{{year}}",
          String(selectedGroupBirthYear ?? ""),
        ),
      );
      return false;
    }
    return true;
  };

  const handleClone = () => {
    if (!validate()) return;

    cloneMutation.mutate({
      terminated_contract_id: formData.terminated_contract_id,
      group_id: Number(formData.group_id),
      contract_number: formData.contract_number.trim(),
      start_date: formData.start_date,
      end_date: formData.end_date,
      monthly_fee: Number(formData.monthly_fee),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg m-4 p-4">
        <DialogHeader className="p-0 pb-4">
          <DialogTitle>{t("activate")}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="py-2">Loading...</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="group_id">{t("group")}</Label>
              <SearchableSelect
                id="group_id"
                value={formData.group_id ? String(formData.group_id) : ""}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    group_id: value ? Number(value) : 0,
                  }))
                }
                options={groupOptions}
                placeholder={t("selectGroup") || "Select group"}
                searchPlaceholder={`${t("search") || "Search"}...`}
                emptyText={t("noDataFound") || "No data found"}
                triggerClassName="h-10"
                contentClassName="z-[10020]"
                disabled={isLoadingGroups}
              />
              {/* Places left in the group's birth year — a full year rejects
                  the clone with a 409, so surface it before submitting. */}
              <YearLimitNotice birthYear={selectedGroupBirthYear} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contract_number">{t("contractNumber")}</Label>
              {/* Frozen, never-reused serial assigned from the group — read-only. */}
              <Input
                id="contract_number"
                name="contract_number"
                value={formData.contract_number}
                readOnly
                aria-readonly="true"
                tabIndex={-1}
                placeholder={t("contractNumber")}
                className="bg-muted/50 cursor-not-allowed font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("contractNumberFrozenHint")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="start_date">{t("startDate")}</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      start_date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="end_date">{t("endDate")}</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      end_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="monthly_fee">{t("monthlyFee")} (UZS)</Label>
              <Input
                id="monthly_fee"
                name="monthly_fee"
                type="number"
                min={1}
                value={formData.monthly_fee}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    monthly_fee: Number(e.target.value),
                  }))
                }
                placeholder="800000"
              />
            </div>
          </div>
        )}
        <DialogFooter className="p-0 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleClone}
            disabled={isLoading || cloneMutation.isPending || isYearFull}
          >
            {t("activate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
