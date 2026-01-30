/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { Badge } from '@/components/ui/badge'
import { userService, roleService } from '@/services/api.service'
import type { UserRead, UserCreate, RoleWithPermissions, PermissionRead } from '@/types/api'
import toast from 'react-hot-toast'
import { Check, ShieldCheck } from 'lucide-react'

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRead | null
  onSuccess: () => void
}

interface UserFormData {
  email: string
  phone: string
  full_name: string
  password?: string
  role_id: number
  is_super_admin: boolean
  status: 'active' | 'inactive'
}

import { useLanguageStore } from '@/store/languageStore'

const UserDialog = ({ open, onOpenChange, user, onSuccess }: UserDialogProps) => {
  const { t } = useLanguageStore()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormData>()

  const selectedRoleId = watch('role_id')

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles({}).then((res) => res.data),
  })

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleService.getPermissions().then((res) => res.data),
  })

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          email: user.email,
          phone: user.phone,
          full_name: user.full_name,
          role_id: user.roles?.[0]?.id || 0,
          is_super_admin: user.is_super_admin,
          status: user.status as 'active' | 'inactive',
        })
      } else {
        reset({
          email: '',
          phone: '',
          full_name: '',
          password: '',
          role_id: 0,
          is_super_admin: false,
          status: 'active',
        })
      }
    }
  }, [open, user, reset])

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const { role_id, ...userData } = data

      if (user) {
        // --- UPDATE USER ---
        const updatePayload: Partial<UserCreate> = { ...userData }
        if (!updatePayload.password) {
          delete updatePayload.password
        }

        const updatePromises: Promise<any>[] = [
          userService.updateUser(user.id, updatePayload),
        ]

        // Only update roles if a role is selected
        if (role_id) {
          updatePromises.push(
            userService.updateUserRoles(user.id, { role_ids: [role_id] }),
          )
        }
        await Promise.all(updatePromises)
      } else {
        // --- CREATE USER ---
        const createPayload: UserCreate = {
          ...userData,
          password: userData.password || '', // Ensure password is a string
        }

        const response = await userService.createUser(createPayload)
        const newUserId = response.data.id

        if (role_id) {
          await userService.updateUserRoles(newUserId, { role_ids: [role_id] })
        }
      }
    },
    onSuccess: () => {
      toast.success(user ? t('userUpdatedSuccessfully') : t('userCreatedSuccessfully'))
      onSuccess()
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || t('anErrorOccurred')
      toast.error(errorMsg)
    },
  })

  const onSubmit = (data: UserFormData) => {
    if (!data.role_id && !data.is_super_admin) {
      toast.error(t('userMustHaveRoleOrSuperAdmin'))
      return
    }
    if (!user && !data.password) {
      toast.error(t('passwordIsRequiredForNewUsers'))
      return
    }
    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{user ? t('editUser') : t('addUser')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div>
            <Label htmlFor="full_name">
              {t('fullName')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              {...register('full_name', { required: t('fullNameIsRequired') })}
              placeholder={t('enterFullName')}
            />
            {errors.full_name && (
              <p className="text-sm text-red-600 mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">
              {t('email')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: t('emailIsRequired'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('invalidEmailAddress'),
                },
              })}
              placeholder={t('enterEmail')}
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone">
              {t('phoneNumber')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              {...register('phone', { required: t('phoneIsRequired') })}
              placeholder="+998901234567"
            />
            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <Label htmlFor="password">
              {t('password')} {!user && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password', {
                minLength: {
                  value: 6,
                  message: t('passwordMinLength'),
                },
              })}
              placeholder={user ? t('leaveBlankToKeepPassword') : t('enterPassword')}
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role_id">{t('role')}</Label>
            <Select
              id="role_id"
              {...register('role_id', { valueAsNumber: true })}
            >
              <option value={0}>{t('selectRole')}</option>
              {rolesData?.map((role: RoleWithPermissions) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Permissions Display */}
          {selectedRoleId > 0 && permissionsData && permissionsData.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <Label className="text-base font-semibold text-blue-900 dark:text-blue-100">
                  {t('rolePermissions')}
                </Label>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                {t('selectedRoleIncludesPermissions')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {permissionsData.map((permission: PermissionRead) => {
                  const selectedRole = rolesData?.find((r: RoleWithPermissions) => r.id === selectedRoleId)
                  const isIncluded = selectedRole?.permissions?.some((p) => p.id === permission.id) || false

                  return (
                    <div
                      key={permission.id}
                      className={`flex items-center gap-2 p-2 rounded-md ${
                        isIncluded
                          ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700'
                          : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isIncluded
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}>
                        {isIncluded && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          isIncluded
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {permission.code}
                        </p>
                        {permission.description && (
                          <p className={`text-xs truncate ${
                            isIncluded
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-gray-500 dark:text-gray-500'
                          }`}>
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="status">{t('status')}</Label>
            <Select id="status" {...register('status')}>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </Select>
          </div>

          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/30 dark:border-yellow-800">
            <input
              id="is_super_admin"
              type="checkbox"
              {...register('is_super_admin')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <Label htmlFor="is_super_admin" className="cursor-pointer dark:text-yellow-300">
              {t('grantSuperAdminPrivileges')}
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('saving') : user ? t('updateUser') : t('createUser')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UserDialog
