import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { authService } from '@/services/api.service'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { LogIn, Mail, Lock, GraduationCap, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LoginRequest, TokenResponse, UserRead, CurrentUserResponse } from '@/types/api'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>()

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      // 1. Login to get the token
      const tokenResponse = await authService.login(data)
      const token = tokenResponse.access_token
      const refreshToken = tokenResponse.refresh_token

      // 2. Get User Info using the new token
      const userRes = await apiClient.get<CurrentUserResponse>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      return {
        token,
        refreshToken,
        user: userRes.data.user,
        permissions: userRes.data.permissions,
      }
    },
    onSuccess: (data) => {
      setAuth(data.token, data.refreshToken, data.user, data.permissions)
      toast.success(`Xush kelibsiz, ${data.user.full_name}!`, {
        icon: '👋',
        duration: 3000,
      })
      navigate('/')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Noto\'g\'ri ma\'lumotlar'
      toast.error(message, { duration: 4000 })
    },
  })

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 dark:opacity-20"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 dark:opacity-20"
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 shadow-2xl border-0 dark:border dark:border-slate-800">
          <CardHeader className="space-y-4 pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                delay: 0.2,
              }}
              className="mx-auto"
            >
              <img src="/logo.png" alt="Bunyodkor" className="w-20 h-20 object-contain" />
            </motion.div>

            <CardTitle className="text-3xl text-center font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              Bunyodkor CIMS
            </CardTitle>
            <CardDescription className="text-center text-base">
              Kurs Ma'lumotlari Boshqaruv Tizimi
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email/Username Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="phone_or_email" className="text-sm font-medium">
                  Email yoki Telefon
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone_or_email"
                    placeholder="admin@bunyodkor.uz yoki +998901234567"
                    className="pl-10 h-11"
                    {...register('phone_or_email', {
                      required: 'Email yoki telefon talab qilinadi',
                    })}
                  />
                </div>
                {errors.phone_or_email && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.phone_or_email.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-sm font-medium">
                  Parol
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11"
                    {...register('password', {
                      required: 'Parol talab qilinadi',
                      minLength: {
                        value: 6,
                        message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak',
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Kirish...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Kirish
                    </div>
                  )}
                </Button>
              </motion.div>

              {/* Mock API Info */}
              {import.meta.env.VITE_USE_MOCK_API === 'true' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    🔵 Mock API Faol
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">Test ma'lumotlari:</p>
                  <div className="text-xs font-mono space-y-1 text-blue-800 dark:text-blue-200">
                    <p>admin@bunyodkor.uz / admin123</p>
                    <p>teacher@bunyodkor.uz / teacher123</p>
                    <p>manager@bunyodkor.uz / manager123</p>
                  </div>
                </motion.div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          © 2024 Bunyodkor. Barcha huquqlar himoyalangan.
        </motion.p>
      </motion.div>
    </div>
  )
}
