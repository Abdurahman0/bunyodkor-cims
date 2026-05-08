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

  const groupOptions = useMemo(
    () =>
      groupsData?.map((group: any) => ({
        value: String(group.id),
        label: group.name,
        keywords: [group.name, String(group.id)],
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
                disabled={isLoadingGroups}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contract_number">{t("contractNumber")}</Label>
              <Input
                id="contract_number"
                name="contract_number"
                value={formData.contract_number}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    contract_number: e.target.value,
                  }))
                }
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
          <Button onClick={handleClone} disabled={isLoading || cloneMutation.isPending}>
            {t("activate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
