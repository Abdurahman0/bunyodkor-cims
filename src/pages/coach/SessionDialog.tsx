import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { coachService } from '@/services/api.service';
import type { SessionCreateRequest, GroupRead } from '@/types/api';
import { useLanguageStore } from '@/store/languageStore';
import { Loader2 } from 'lucide-react';

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupRead[] | undefined;
  sessionDate: string;
  onSuccess?: () => void;
}

type SessionFormData = Omit<SessionCreateRequest, 'group_id'> & {
  group_id: string;
};

export function SessionDialog({
  open,
  onOpenChange,
  groups,
  sessionDate,
  onSuccess,
}: SessionDialogProps) {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SessionFormData>();

  useEffect(() => {
    if (open) {
      reset({
        session_date: sessionDate,
        topic: '',
        start_time: '09:00',
        end_time: '11:00',
        group_id: '',
      });
    }
  }, [open, sessionDate, reset]);

  const mutation = useMutation({
    mutationFn: (data: SessionCreateRequest) => coachService.createSession(data),
    onSuccess: () => {
      toast.success(t('sessionCreatedSuccess'));
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t('failedToCreateSession');

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: SessionFormData) => {
    mutation.mutate({
      ...data,
      group_id: parseInt(data.group_id, 10),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[450px] max-w-[95vw] border-2 border-primary/30" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{t('createNewSession')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="group_id">{t('group')}</Label>
            <Select
              id="group_id"
              {...register('group_id', { required: t('selectGroupRequired') })}
            >
              <option value="">{t('selectGroup')}</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            {errors.group_id && <p className="text-sm text-red-500">{errors.group_id.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="topic">{t('sessionTopic')}</Label>
            <Input
              id="topic"
              {...register('topic', { required: t('topicRequired') })}
              placeholder="e.g., Dribbling Drills"
            />
            {errors.topic && <p className="text-sm text-red-500">{errors.topic.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start_time">{t('startTime')}</Label>
              <Input
                id="start_time"
                type="time"
                {...register('start_time', { required: t('startTimeRequired') })}
              />
              {errors.start_time && <p className="text-sm text-red-500">{errors.start_time.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="end_time">{t('endTime')}</Label>
              <Input
                id="end_time"
                type="time"
                {...register('end_time', { required: t('endTimeRequired') })}
              />
              {errors.end_time && <p className="text-sm text-red-500">{errors.end_time.message}</p>}
            </div>
          </div>

          <input type="hidden" {...register('session_date')} value={sessionDate} />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('createSession')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
