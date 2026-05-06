import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractService } from "@/services/api.service";
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
    queryFn: () => contractService.getCloneAvailableInfo(terminatedContractId),
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
    // This is a simplified handler. You might need to add inputs for group_id, contract_number, dates, etc.
    // Based on the API, you need: terminated_contract_id, group_id, contract_number, start_date, end_date, monthly_fee
    console.log("Clone data:", availableInfo);
    // In a real scenario, you'd show a form to fill these fields.
    // Assuming availableInfo.data has the info needed.
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
            {/* Add form inputs here as needed */}
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
