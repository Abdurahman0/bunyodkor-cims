import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { waitingListService, studentService, groupService } from '@/services/api.service';
import type { WaitingListRead, WaitingListCreate, StudentRead, GroupRead } from '@/types/api';
import { useLanguageStore } from '@/store/languageStore';
import { Loader2 } from 'lucide-react';

interface WaitingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: WaitingListRead | null;
  onSuccess?: () => void;
}

type WaitingListFormData = {
  student_id: number | string;
  group_id: number | string;
  priority: number | string;
  notes: string;
};

export function WaitingListDialog({ open, onOpenChange, entry, onSuccess }: WaitingListDialogProps) {
  const { t } = useLanguageStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WaitingListFormData>();

  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.getStudents({ page: 1, page_size: 100 }),
    enabled: open,
  });

  const { data: groupsData } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (entry) {
        reset({
          student_id: entry.student_id,
          group_id: entry.group_id,
          priority: entry.priority,
          notes: entry.notes || '',
        });
      } else {
        reset({
          student_id: '',
          group_id: '',
          priority: 50,
          notes: '',
        });
      }
    }
  }, [entry, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: WaitingListCreate) => {
      if (entry) {
        return waitingListService.updateWaitingListEntry(entry.id, {
          priority: data.priority,
          notes: data.notes,
        });
      }
      return waitingListService.addToWaitingList(data);
    },
    onSuccess: () => {
      toast.success(entry ? t('waitingListUpdatedSuccess') : t('waitingListAddedSuccess'));
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

  const onSubmit = (data: WaitingListFormData) => {
    const payload: WaitingListCreate = {
      student_id: Number(data.student_id),
      group_id: Number(data.group_id),
      priority: Number(data.priority),
      notes: data.notes || undefined,
    };

    if (!payload.student_id) {
      toast.error(t('pleaseSelectStudent') || 'Please select a student');
      return;
    }

    if (!payload.group_id) {
      toast.error(t('pleaseSelectGroup') || 'Please select a group');
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {entry ? t('editWaitingListEntry') : t('addToWaitingList')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          {/* Student Select - disabled when editing */}
          <div className="space-y-1">
            <Label htmlFor="student_id">
              {t('student')} <span className="text-red-500">*</span>
            </Label>
            <Select
              id="student_id"
              {...register('student_id', { required: t('selectStudentRequired') })}
              disabled={!!entry}
            >
              <option value="">{t('selectStudent')}</option>
              {studentsData?.data?.map((student: StudentRead) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} (ID: {student.id})
                </option>
              ))}
            </Select>
            {errors.student_id && <p className="text-sm text-red-500">{errors.student_id.message}</p>}
          </div>

          {/* Group Select - disabled when editing */}
          <div className="space-y-1">
            <Label htmlFor="group_id">
              {t('group')} <span className="text-red-500">*</span>
            </Label>
            <Select
              id="group_id"
              {...register('group_id', { required: t('selectGroupRequired') })}
              disabled={!!entry}
            >
              <option value="">{t('selectGroup')}</option>
              {groupsData?.data?.map((group: GroupRead) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            {errors.group_id && <p className="text-sm text-red-500">{errors.group_id.message}</p>}
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <Label htmlFor="priority">
              {t('priority')} (0-100) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="100"
              {...register('priority', {
                required: t('priorityRequired'),
                min: { value: 0, message: t('priorityMin') || 'Priority must be at least 0' },
                max: { value: 100, message: t('priorityMax') || 'Priority must be at most 100' },
              })}
              placeholder="50"
            />
            {errors.priority && <p className="text-sm text-red-500">{errors.priority.message}</p>}
            <p className="text-xs text-muted-foreground">
              {t('priorityHelp') || 'Higher priority students will be prioritized (0-100)'}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder={t('waitingListNotesPlaceholder') || 'Add any notes about this waiting list entry...'}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
