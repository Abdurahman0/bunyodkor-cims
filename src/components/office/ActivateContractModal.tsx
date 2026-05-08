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
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminatedContractId: number;
}

export default function ActivateContractModal({
  open,
  onOpenChange,
  terminatedContractId,
}: Props) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const nextYear = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split("T")[0];
  }, []);

  const [form, setForm] = useState({
    terminated_contract_id: terminatedContractId,
    group_id: 0,
    contract_number: "",
    start_date: today,
    end_date: nextYear,
    monthly_fee: 1,
  });

  const { data: availableInfo, isLoading } = useQuery({
    queryKey: ["clone-available", terminatedContractId],
    queryFn: () => reportService.getCloneAvailableInfo(terminatedContractId),
    enabled: open && !!terminatedContractId,
  });

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["groups-list", "activate-contract-modal-office"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 2000 }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const available = availableInfo?.data as any;
    setForm((cur) => ({
      ...cur,
      terminated_contract_id: terminatedContractId,
      group_id: available?.group_id ?? cur.group_id,
      contract_number: available?.suggested_contract_number ?? cur.contract_number,
      monthly_fee: available?.monthly_fee ?? cur.monthly_fee,
    }));
  }, [availableInfo, open, terminatedContractId]);

  const cloneMutation = useMutation({
    mutationFn: (data: any) => contractService.cloneFromTerminated(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["student-full-info"] });
      toast.success(t("contractClonedSuccess") || "Contract activated successfully");
      onOpenChange(false);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      let msg = t("failedToCloneContract") || "Failed to activate contract";
      if (typeof detail === "string") msg = detail;
      toast.error(msg);
    },
  });

  const groupOptions = useMemo(
    () =>
      groupsData?.data?.map((group: any) => ({
        value: String(group.id),
        label: group.name,
        keywords: [group.name, String(group.id)],
      })) || [],
    [groupsData?.data],
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
                  }))
                }
                options={groupOptions}
                placeholder={t("selectGroup") || "Select group"}
                searchPlaceholder={`${t("search") || "Search"}...`}
                emptyText={t("noDataFound") || "No data found"}
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
