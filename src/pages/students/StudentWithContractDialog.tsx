import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { studentService, contractService, groupService } from '@/services/api.service';
import type { StudentCreate, ContractCreate, GroupRead } from '@/types/api';
import { useLanguageStore } from '@/store/languageStore';
import { format } from 'date-fns';
import { Loader2, UserPlus, FileText } from 'lucide-react';

interface StudentWithContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CombinedFormData {
  // Student fields
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
  status: 'active' | 'graduated' | 'dropped' | 'suspended';
  group_id: number | string;
  photo_url?: string;
  face_id?: string;
  // Contract fields
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_fee: number | string;
  contract_status: 'active' | 'expired' | 'cancelled';
}

export function StudentWithContractDialog({
  open,
  onOpenChange,
  onSuccess,
}: StudentWithContractDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CombinedFormData>();

  const { data: groupsData } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      reset({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        phone: '',
        address: '',
        status: 'active',
        group_id: '',
        photo_url: '',
        face_id: '',
        contract_number: '',
        start_date: '',
        end_date: '',
        monthly_fee: '',
        contract_status: 'active',
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CombinedFormData) => {
    try {
      // Step 1: Create Student
      setIsCreatingStudent(true);
      const studentPayload: StudentCreate = {
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        phone: data.phone,
        address: data.address,
        status: data.status,
        group_id: data.group_id ? Number(data.group_id) : null,
        photo_url: data.photo_url || null,
        face_id: data.face_id || null,
      };

      const studentResponse = await studentService.createStudent(studentPayload);
      const newStudentId = studentResponse.data.id;

      toast.success(`Student created: ${data.first_name} ${data.last_name}`);
      setIsCreatingStudent(false);

      // Step 2: Create Contract for the new student
      setIsCreatingContract(true);
      const contractPayload: ContractCreate = {
        contract_number: data.contract_number,
        student_id: newStudentId,
        start_date: data.start_date,
        end_date: data.end_date,
        monthly_fee: Number(data.monthly_fee),
        status: data.contract_status,
      };

      await contractService.createContract(contractPayload);
      toast.success('Contract created successfully!');
      setIsCreatingContract(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });

      // Close dialog and call success callback
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setIsCreatingStudent(false);
      setIsCreatingContract(false);

      const detail = error.response?.data?.detail;
      let errorMessage = 'An error occurred';

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    }
  };

  const isPending = isCreatingStudent || isCreatingContract;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-primary/20" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            Add New Student with Contract
          </DialogTitle>
          <DialogDescription>
            Create a new student profile and their initial contract in one step.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Student Information Section */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Student Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="first_name">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...register('first_name', { required: 'First name is required' })}
                  placeholder="Enter first name"
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="last_name">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  {...register('last_name', { required: 'Last name is required' })}
                  placeholder="Enter last name"
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date_of_birth">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...register('date_of_birth', { required: 'Date of birth is required' })}
                />
                {errors.date_of_birth && (
                  <p className="text-sm text-red-500">{errors.date_of_birth.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  {...register('phone', { required: 'Phone is required' })}
                  placeholder="+998901234567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Enter student address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select id="status" {...register('status', { required: true })}>
                  <option value="active">Active</option>
                  <option value="graduated">Graduated</option>
                  <option value="dropped">Dropped</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="group_id">Group</Label>
                <Select id="group_id" {...register('group_id')}>
                  <option value="">Select a group</option>
                  {groupsData?.data?.map((group: GroupRead) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="photo_url">Photo URL (Optional)</Label>
                <Input
                  id="photo_url"
                  {...register('photo_url')}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="face_id">Face ID (Optional)</Label>
                <Input
                  id="face_id"
                  {...register('face_id')}
                  placeholder="Face recognition identifier"
                />
              </div>
            </div>
          </div>

          {/* Contract Information Section */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Contract Information</h3>
            </div>

            <div className="space-y-1">
              <Label htmlFor="contract_number">
                Contract Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contract_number"
                {...register('contract_number', {
                  required: 'Contract number is required',
                })}
                placeholder="e.g., BFA-2025-001"
              />
              {errors.contract_number && (
                <p className="text-sm text-red-500">{errors.contract_number.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="start_date">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date', { required: 'Start date is required' })}
                />
                {errors.start_date && (
                  <p className="text-sm text-red-500">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="end_date">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date', { required: 'End date is required' })}
                />
                {errors.end_date && (
                  <p className="text-sm text-red-500">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="monthly_fee">
                  Monthly Fee (UZS) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  {...register('monthly_fee', {
                    required: 'Monthly fee is required',
                    valueAsNumber: true,
                  })}
                  placeholder="e.g., 500000"
                />
                {errors.monthly_fee && (
                  <p className="text-sm text-red-500">{errors.monthly_fee.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="contract_status">
                  Contract Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="contract_status"
                  {...register('contract_status', { required: true })}
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {isPending && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div className="text-sm">
                  {isCreatingStudent && (
                    <p className="text-blue-700 font-medium">Creating student profile...</p>
                  )}
                  {isCreatingContract && (
                    <p className="text-blue-700 font-medium">Creating contract...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Student & Contract
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
