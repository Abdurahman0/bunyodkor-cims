import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import toast from 'react-hot-toast'
import { groupService, userService } from '@/services/api.service'
import type { Group, GroupCreate, GroupUpdate, UserRead } from '@/types'
import { useLanguageStore } from '@/store/languageStore'

interface GroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group | null
  onSuccess?: () => void
}

type GroupFormData = Omit<GroupCreate, 'coach_id'> & {
  coach_id: number | string
}

export function GroupDialog({ open, onOpenChange, group, onSuccess }: GroupDialogProps) {
  const { t } = useLanguageStore()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormData>()

  const { data: coachesData } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => userService.getCoaches(),
  })

  useEffect(() => {
    if (open) {
      if (group) {
        reset(group)
      } else {
        reset({
          name: '',
          description: '',
          schedule_days: 'Mon-Wed-Fri',
          schedule_time: '14:00-16:00',
          coach_id: '',
        })
      }
    }
  }, [group, open, reset])

  const mutation = useMutation({
    mutationFn: (data: GroupCreate | GroupUpdate) => {
      if (group) {
        return groupService.updateGroup(group.id, data)
      } else {
        return groupService.createGroup(data as GroupCreate)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success(group ? t('groupUpdatedSuccess') : t('groupCreatedSuccess'))
      onOpenChange(false)
      if (onSuccess) onSuccess()
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
  })

  const onSubmit = (data: GroupFormData) => {
    const payload = {
      ...data,
      coach_id: Number(data.coach_id),
    }
    if (!payload.coach_id) {
      toast.error('Please select a coach.')
      return
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{group ? t('editGroup') : t('addNewGroup')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t('groupName')} <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              placeholder="e.g., U-15 Elite"
              {...register('name', { required: 'Group name is required' })}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">{t('description')}</Label>
            <Input
              id="description"
              placeholder="Advanced training for the under-15 team"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="schedule_days">{t('scheduleDays')} <span className="text-red-500">*</span></Label>
              <Input
                id="schedule_days"
                placeholder="Mon, Wed, Fri"
                {...register('schedule_days', { required: 'Schedule days are required' })}
              />
               {errors.schedule_days && <p className="text-sm text-red-500">{errors.schedule_days.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="schedule_time">{t('scheduleTime')} <span className="text-red-500">*</span></Label>
              <Input
                id="schedule_time"
                placeholder="15:00 - 17:00"
                {...register('schedule_time', { required: 'Schedule time is required' })}
              />
              {errors.schedule_time && <p className="text-sm text-red-500">{errors.schedule_time.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="coach_id">{t('coach')} <span className="text-red-500">*</span></Label>
            <Select
              id="coach_id"
              {...register('coach_id', { required: 'Please select a coach' })}
            >
              <option value="">{t('selectCoach')}</option>
              {coachesData?.data?.map((coach: UserRead) => (
                <option key={coach.id} value={coach.id}>
                  {coach.full_name}
                </option>
              ))}
            </Select>
            {errors.coach_id && <p className="text-sm text-red-500">{errors.coach_id.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
