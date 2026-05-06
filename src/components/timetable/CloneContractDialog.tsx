import { useState } from "react";
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

  const { data: availableInfo, isLoading } = useQuery({
    queryKey: ["clone-available", terminatedContractId],
    queryFn: () => reportService.getCloneAvailableInfo(terminatedContractId),
    enabled: open,
  });

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
    // In a real application, you might need to gather input fields here.
    // Assuming for now it uses the info from availableInfo
    if (availableInfo?.data) {
        // Mock data submission structure - this should be adjusted based on requirements
        cloneMutation.mutate({
            terminated_contract_id: terminatedContractId,
            group_id: availableInfo.data.group_id,
            contract_number: availableInfo.data.suggested_contract_number,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            monthly_fee: availableInfo.data.monthly_fee
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("activate")}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4">
            <p>Ready to activate this contract?</p>
            {/* Add inputs if needed */}
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
