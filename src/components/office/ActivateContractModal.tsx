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
import type { GroupRead } from "@/types/api";
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

interface ActivateContractForm {
  terminated_contract_id: number;
  group_id: number;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_fee: number;
}

interface CloneAvailableInfo {
  group_id?: number;
  suggested_contract_number?: string;
  monthly_fee?: number;
}

export default function ActivateContractModal({
  open,
  onOpenChange,
  terminatedContractId,
}: Props) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  const today = useMemo(() => formatDateInputValue(new Date()), []);
  const currentYearEnd = useMemo(() => getCurrentYearEndDate(), []);

  const [form, setForm] = useState<ActivateContractForm>({
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
    queryKey: ["groups-list", "activate-contract-modal-office"],
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

  const contractYear = useMemo(
    () => (form.start_date ? new Date(form.start_date).getFullYear() : new Date().getFullYear()),
    [form.start_date],
  );

  const { data: suggestedContractNumber, isFetching: isSuggestionLoading } =
    useQuery({
      queryKey: ["next-available-contract-number", form.group_id, contractYear],
      queryFn: () => contractService.getNextAvailableNumber(form.group_id, contractYear),
      enabled: open && form.group_id > 0,
      select: (response) => response.data,
    });

  useEffect(() => {
    if (!open) return;
    const available = availableInfo?.data as CloneAvailableInfo | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((cur) => ({
      ...cur,
      terminated_contract_id: terminatedContractId,
      group_id: available?.group_id ?? cur.group_id,
      contract_number:
        cur.contract_number || available?.suggested_contract_number || "",
      start_date: today,
      end_date: currentYearEnd,
      monthly_fee: available?.monthly_fee ?? cur.monthly_fee,
    }));
  }, [availableInfo, currentYearEnd, open, terminatedContractId, today]);

  useEffect(() => {
    if (!suggestedContractNumber?.contract_number) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((cur) => ({
      ...cur,
      contract_number: suggestedContractNumber.contract_number,
    }));
  }, [suggestedContractNumber]);

  const cloneMutation = useMutation({
    mutationFn: (data: ActivateContractForm) =>
      contractService.cloneFromTerminated(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["student-full-info"] });
      toast.success(t("contractClonedSuccess") || "Contract activated successfully");
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err.response as { data?: { detail?: unknown } })?.data?.detail
          : undefined;
      let msg = t("failedToCloneContract") || "Failed to activate contract";
      if (typeof detail === "string") msg = detail;
      toast.error(msg);
    },
  });

  const groupOptions = useMemo(
    () =>
      groupsData?.map((group: GroupRead) => ({
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
    if (!form.group_id || Number(form.group_id) <= 0) {
      toast.error(t("selectGroup") || "Please select a group");
      return false;
    }
    if (!form.contract_number || !form.contract_number.trim()) {
      toast.error(t("enterContractNumber") || "Contract number is required");
      return false;
    }
    if (!form.start_date) {
      toast.error(t("startDateRequired") || "Start date is required");
      return false;
    }
    if (!form.end_date) {
      toast.error(t("endDateRequired") || "End date is required");
      return false;
    }
    if (form.start_date > form.end_date) {
      toast.error(t("dateRangeInvalid") || "From date cannot be later than To date");
      return false;
    }
    if (!form.monthly_fee || Number(form.monthly_fee) <= 0) {
      toast.error(t("monthlyFeeRequired") || "Monthly fee must be > 0");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    cloneMutation.mutate({
      terminated_contract_id: form.terminated_contract_id,
      group_id: Number(form.group_id),
      contract_number: form.contract_number.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_fee: Number(form.monthly_fee),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg m-4 p-4">
        <DialogHeader className="p-0 pb-4">
          <DialogTitle>{t("activate") || "Activate"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-2">{t("loading")}</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="group_id">{t("group")}</Label>
              <SearchableSelect
                id="group_id"
                value={form.group_id ? String(form.group_id) : ""}
                onValueChange={(value) =>
                  setForm((c) => ({
                    ...c,
                    group_id: value ? Number(value) : 0,
                    contract_number: "",
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="contract_number">{t("contractNumber")}</Label>
              <Input
                id="contract_number"
                name="contract_number"
                value={form.contract_number}
                onChange={(e) => setForm((c) => ({ ...c, contract_number: e.target.value }))}
                placeholder={t("contractNumber")}
                disabled={isSuggestionLoading}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="start_date">{t("startDate")}</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((c) => ({ ...c, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="end_date">{t("endDate")}</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((c) => ({ ...c, end_date: e.target.value }))}
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
                value={String(form.monthly_fee)}
                onChange={(e) => setForm((c) => ({ ...c, monthly_fee: Number(e.target.value) }))}
                placeholder="800000"
              />
            </div>
          </div>
        )}

        <DialogFooter className="p-0 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cloneMutation.isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={cloneMutation.isLoading || isLoading}>
            {cloneMutation.isLoading ? t("loading") : t("activate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
