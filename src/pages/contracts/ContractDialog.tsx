import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { contractService, studentService } from '@/services/api.service';
import type { ContractRead, ContractCreate, ContractUpdate, StudentRead } from '@/types/api';
import { useLanguageStore } from '@/store/languageStore';
import { User, Calendar, Users } from 'lucide-react';

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractRead | null;
  onSuccess?: () => void;
}

type ContractFormData = Omit<ContractCreate, 'student_id' | 'monthly_fee'> & {
  student_id: number | string;
  monthly_fee: number | string;
};

export function ContractDialog({ open, onOpenChange, contract, onSuccess }: ContractDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ContractFormData>();

  const studentIdValue = watch('student_id');

  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.getStudents({ page: 1, page_size: 100 }),
  });

  // Fetch selected student details
  const { data: selectedStudentData } = useQuery({
    queryKey: ['student-detail', selectedStudentId],
    queryFn: () => studentService.getStudent(selectedStudentId!),
    enabled: !!selectedStudentId,
  });

  // Update selected student ID when student_id changes
  useEffect(() => {
    if (studentIdValue && studentIdValue !== '') {
      setSelectedStudentId(Number(studentIdValue));
    } else {
      setSelectedStudentId(null);
    }
  }, [studentIdValue]);

  useEffect(() => {
    if (open) {
      if (contract) {
        reset({
          ...contract,
          start_date: format(new Date(contract.start_date), 'yyyy-MM-dd'),
          end_date: format(new Date(contract.end_date), 'yyyy-MM-dd'),
        });
      } else {
        reset({
          contract_number: '',
          student_id: '',
          start_date: '',
          end_date: '',
          monthly_fee: '',
          status: 'active',
        });
      }
    }
  }, [contract, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: ContractCreate | ContractUpdate) => {
      if (contract) {
        return contractService.updateContract(contract.id, data);
      }
      return contractService.createContract(data as ContractCreate);
    },
    onSuccess: () => {
      toast.success(contract ? t('contractUpdatedSuccess') : t('contractCreatedSuccess'));
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t('anErrorOccurred');

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: ContractFormData) => {
    const payload = {
      ...data,
      student_id: Number(data.student_id),
      monthly_fee: Number(data.monthly_fee),
    };
    if (!payload.student_id) {
      toast.error('Please select a student.');
      return;
    }
    mutation.mutate(payload);
  };

  const selectedStudent = selectedStudentData?.data;
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{contract ? t('editContract') : t('newContract')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="contract_number">{t('contractNumber')} <span className="text-red-500">*</span></Label>
            <Input
              id="contract_number"
              {...register('contract_number', { required: t('contractNumberRequired') })}
              placeholder="e.g., BFA-2025-001"
            />
            {errors.contract_number && <p className="text-sm text-red-500">{errors.contract_number.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="student_id">{t('student')} <span className="text-red-500">*</span></Label>
            <Select
              id="student_id"
              {...register('student_id', { required: t('selectStudentRequired') })}
            >
              <option value="">{t('selectStudent')}</option>
              {studentsData?.data?.map((student: StudentRead) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} (ID: {student.id})
                </option>
              ))}
            </Select>
            {errors.student_id && <p className="text-sm text-red-500">{errors.student_id.message}</p>}

            {/* Dynamic Student Info Display */}
            {selectedStudent && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                  <User className="w-4 h-4" />
                  <span>{t('studentInformation')}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[80px]">{t('studentName')}:</span>
                    <span className="text-blue-900 dark:text-blue-100">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[80px]">{t('phoneNumber')}:</span>
                    <span className="text-blue-900 dark:text-blue-100">{selectedStudent.phone}</span>
                  </div>
                  {selectedStudent.date_of_birth && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <span className="font-medium text-blue-700 dark:text-blue-300 mr-2">{t('birthYear')}:</span>
                        <span className="text-blue-900 dark:text-blue-100">
                          {new Date(selectedStudent.date_of_birth).getFullYear()} ({calculateAge(selectedStudent.date_of_birth)} {t('yearsOld')})
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-blue-700 dark:text-blue-300 min-w-[80px]">{t('status')}:</span>
                    <Badge variant="secondary" className="text-xs">
                      {t(selectedStudent.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start_date">{t('startDate')} <span className="text-red-500">*</span></Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date', { required: t('startDateRequired') })}
              />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="end_date">{t('endDate')} <span className="text-red-500">*</span></Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date', { required: t('endDateRequired') })}
              />
              {errors.end_date && <p className="text-sm text-red-500">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="monthly_fee">{t('monthlyFee')} (UZS) <span className="text-red-500">*</span></Label>
              <Input
                id="monthly_fee"
                type="number"
                {...register('monthly_fee', { required: t('monthlyFeeRequired'), valueAsNumber: true })}
                placeholder="e.g., 500000"
              />
              {errors.monthly_fee && <p className="text-sm text-red-500">{errors.monthly_fee.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">{t('status')} <span className="text-red-500">*</span></Label>
              <Select id="status" {...register('status')}>
                <option value="active">{t('active')}</option>
                <option value="expired">{t('expired')}</option>
                <option value="cancelled">{t('cancelled')}</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('saving') : t('saveContract')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
