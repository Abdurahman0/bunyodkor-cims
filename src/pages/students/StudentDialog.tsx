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
import { studentService, groupService } from '@/services/api.service'
import type { StudentRead, StudentCreate, StudentUpdate, GroupRead } from '@/types/api'
import { format } from 'date-fns'

interface StudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentRead | null
  onSuccess?: () => void
}

type StudentFormData = Omit<StudentCreate, 'group_id'> & {
  group_id: number | string
}

export function StudentDialog({ open, onOpenChange, student, onSuccess }: StudentDialogProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>()

  const { data: groupsData } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }), // Fetch groups (max allowed by API)
  })

  useEffect(() => {
    if (open) {
      if (student) {
        reset({
          ...student,
          date_of_birth: student.date_of_birth
            ? format(new Date(student.date_of_birth), 'yyyy-MM-dd')
            : '',
          group_id: student.group_id || '',
        })
      } else {
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
        })
      }
    }
  }, [student, open, reset])

  const mutation = useMutation({
    mutationFn: (data: StudentCreate | StudentUpdate) => {
      if (student) {
        return studentService.updateStudent(student.id, data)
      } else {
        return studentService.createStudent(data as StudentCreate)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['students-count'] })
      toast.success(student ? 'Student updated successfully' : 'Student created successfully')
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = 'An error occurred';

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  })

  const onSubmit = (data: StudentFormData) => {
    const payload = {
      ...data,
      group_id: Number(data.group_id),
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
              <Input
                id="first_name"
                {...register('first_name', { required: 'First name is required' })}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
              <Input
                id="last_name"
                {...register('last_name', { required: 'Last name is required' })}
              />
              {errors.last_name && (
                <p className="text-sm text-red-500">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="date_of_birth">Date of Birth <span className="text-red-500">*</span></Label>
            <Input
              id="date_of_birth"
              type="date"
              {...register('date_of_birth', { required: 'Date of birth is required' })}
            />
            {errors.date_of_birth && <p className="text-sm text-red-500">{errors.date_of_birth.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
            <Input
              id="phone"
              placeholder="+998901234567"
              {...register('phone', { required: 'Phone is required' })}
            />
            {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
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

          <div className="space-y-1">
            <Label htmlFor="photo_url">Photo URL (Optional)</Label>
            <Input id="photo_url" {...register('photo_url')} placeholder="https://example.com/photo.jpg" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="face_id">Face ID (Optional)</Label>
            <Input id="face_id" {...register('face_id')} placeholder="Face recognition identifier" />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
