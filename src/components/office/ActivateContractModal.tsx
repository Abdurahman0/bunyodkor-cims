import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportService, contractService } from "@/services/api.service";
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

  const validate = () => {
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
      <DialogContent className="sm:max-w-lg m-4">
        <DialogHeader>
          <DialogTitle>{t("activate") || "Activate"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p>{t("loading")}</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="start_date">{t("startDate")}</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((c) => ({ ...c, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="monthly_fee">{t("monthlyFee")}</Label>
              <Input
                id="monthly_fee"
                name="monthly_fee"
                type="number"
                min={1}
                value={String(form.monthly_fee)}
                onChange={(e) => setForm((c) => ({ ...c, monthly_fee: Number(e.target.value) }))}
              />
            </div>
          </div>
        )}

        <DialogFooter>
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
