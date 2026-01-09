import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { transactionService, studentService, contractService } from '@/services/api.service';
import type { TransactionRead, StudentRead, ContractRead } from '@/types/api';
import { useLanguageStore } from '@/store/languageStore';
import { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AssignTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionRead | null;
  onSuccess?: () => void;
}

interface AssignFormData {
  student_id: string;
  contract_id: string;
}

export function AssignTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: AssignTransactionDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const { 
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignFormData>();

  const selectedStudentId = watch('student_id');

  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.getStudents({ page: 1, page_size: 100 }),
    enabled: open, // Only fetch when the dialog is open
  });

  const { data: contractsData, isLoading: isLoadingContracts } = useQuery({
    queryKey: ['student-contracts', selectedStudentId],
    queryFn: () =>
      contractService.getContracts({ student_id: parseInt(selectedStudentId, 10) }),
    enabled: !!selectedStudentId && open, // Only fetch if a student is selected and dialog is open
  });

  const mutation = useMutation({
    mutationFn: (data: { student_id: number; contract_id: number }) => {
      if (!transaction) throw new Error('Transaction not selected');
      return transactionService.assignTransaction(transaction.id, data);
    },
    onSuccess: () => {
      toast.success(t('transactionAssignedSuccessfully'));
      queryClient.invalidateQueries({
        queryKey: ['unassigned-transactions'],
        refetchType: "all"
      });
      queryClient.invalidateQueries({
        queryKey: ['transactions'],
        refetchType: "all"
      });
      queryClient.invalidateQueries({
        queryKey: ['all-transactions-stats'],
        refetchType: "all"
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: AxiosError<{ detail: string | { msg: string; message: string }[] }>) => {
      // Handle FastAPI validation errors (422)
      const detail = error.response?.data?.detail; // Access detail from error.response.data
      let errorMessage = 'Failed to assign transaction';

      if (Array.isArray(detail) && detail.length > 0) {
        // Extract first validation error message
        errorMessage = detail[0].msg || (detail[0] as { message: string }).message || errorMessage;
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    if (!open) {
      reset({ student_id: '', contract_id: '' });
    }
  }, [open, reset]);

  const onSubmit = (data: AssignFormData) => {
    mutation.mutate({
      student_id: parseInt(data.student_id, 10),
      contract_id: parseInt(data.contract_id, 10),
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Assign Transaction #{transaction.id}</DialogTitle>
          <DialogDescription>
            Assign this unassigned payment of{' '}
            <span className="font-bold text-foreground">
              {new Intl.NumberFormat('uz-UZ').format(transaction.amount)} UZS
            </span>{' '}
            to a student and their contract.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-1">
            <Label htmlFor="student_id">Student</Label>
            <div className="flex items-center gap-2">
              <Select
                id="student_id"
                {...register('student_id', { required: 'Please select a student' })}
                disabled={isLoadingStudents}
              >
                <option value="">{isLoadingStudents ? 'Loading students...' : 'Select a student'}</option>
                {studentsData?.data?.map((student: StudentRead) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
              </Select>
              {isLoadingStudents && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            {errors.student_id && <p className="text-sm text-red-500 mt-1">{errors.student_id.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="contract_id">Contract</Label>
             <div className="flex items-center gap-2">
              <Select
                id="contract_id"
                {...register('contract_id', { required: 'Please select a contract' })}
                disabled={!selectedStudentId || isLoadingContracts}
              >
                <option value="">
                  {isLoadingContracts
                    ? 'Loading contracts...'
                    : !selectedStudentId
                    ? 'Select a student first'
                    : 'Select a contract'}
                </option>
                {contractsData?.data?.map((contract: ContractRead) => (
                  <option key={contract.id} value={contract.id}>
                    #{contract.contract_number} ({format(new Date(contract.start_date), 'MMM yyyy')} - {format(new Date(contract.end_date), 'MMM yyyy')})
                  </option>
                ))}
              </Select>
               {isLoadingContracts && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            {errors.contract_id && <p className="text-sm text-red-500 mt-1">{errors.contract_id.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
