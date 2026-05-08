/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
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

export function CloneContractDialog({ open, onOpenChange, terminatedContractId }: Props) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const nextYear = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split("T")[0];
  }, []);

  const [formData, setFormData] = useState({
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
    enabled: open,
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
        available?.suggested_contract_number ?? current.contract_number,
      monthly_fee: available?.monthly_fee ?? current.monthly_fee,
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
    onError: () => toast.error(t("failedToCloneContract")),
  });

  const handleClone = () => {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("activate")}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="terminated_contract_id">terminated_contract_id</Label>
              <Input
                id="terminated_contract_id"
                type="number"
                value={formData.terminated_contract_id}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_id">group_id</Label>
              <Input
                id="group_id"
                type="number"
                value={formData.group_id}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    group_id: Number(e.target.value),
                  }))
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_number">contract_number</Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    contract_number: e.target.value,
                  }))
                }
                placeholder="string"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">start_date</Label>
                <Input
                  id="start_date"
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

              <div className="space-y-2">
                <Label htmlFor="end_date">end_date</Label>
                <Input
                  id="end_date"
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

            <div className="space-y-2">
              <Label htmlFor="monthly_fee">monthly_fee</Label>
              <Input
                id="monthly_fee"
                type="number"
                min={1}
                value={formData.monthly_fee}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    monthly_fee: Number(e.target.value),
                  }))
                }
                placeholder="1"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleClone} disabled={isLoading || cloneMutation.isPending}>
            {t("activate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
