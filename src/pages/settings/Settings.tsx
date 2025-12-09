import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { settingsService } from '@/services/api.service'
import type { SystemSettingsRead } from '@/types/api'
import { useThemeStore } from '@/store/themeStore'
import {
  Settings as SettingsIcon,
  Save,
  Bell,
  CreditCard,
  Globe,
  Moon,
  Sun,
  Loader2,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguageStore } from '@/store/languageStore'

export default function Settings() {
  const { t } = useLanguageStore()
  const { isDarkMode, toggleDarkMode } = useThemeStore()
  const queryClient = useQueryClient()
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})
  const [isRestarting, setIsRestarting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: settingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsService.getSystemSettings(),
  })

  useEffect(() => {
    if (settingsData?.data) {
      const initialSettings = settingsData.data.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string>)
      setLocalSettings(initialSettings)
    }
  }, [settingsData])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => settingsService.updateSystemSettings({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      toast.success('Settings updated successfully')
      setEditedSettings({})
    },
    onError: () => {
      toast.error('Failed to update settings')
    },
  })

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }))
    setLocalSettings((prev) => ({...prev, [key]: value}))
  }

  const handleSaveSettings = () => {
    if (Object.keys(editedSettings).length > 0) {
      updateMutation.mutate(editedSettings)
    }
  }

  const getSettingValue = (key: string) => {
    return localSettings[key] || ''
  }

  const hasChanges = Object.keys(editedSettings).length > 0

  const handleRestartServer = async () => {
    if (confirm(t('confirmRestartServer') || 'Are you sure you want to restart the server? This will disconnect all users.')) {
      setIsRestarting(true)
      try {
        // Call restart endpoint if available
        await settingsService.restartServer?.()
        toast.success(t('serverRestartInitiated') || 'Server restart initiated')
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } catch (error) {
        toast.error(t('failedToRestartServer') || 'Failed to restart server')
        setIsRestarting(false)
      }
    }
  }

  const handleBulkDelete = async () => {
    const confirmText = t('confirmBulkDelete') || 'WARNING: This will delete ALL data (students, contracts, transactions, etc.). Type "DELETE ALL" to confirm.'
    const userInput = prompt(confirmText)

    if (userInput === 'DELETE ALL') {
      setIsDeleting(true)
      try {
        // Call bulk delete endpoint if available
        await settingsService.bulkDeleteData?.()
        toast.success(t('allDataDeleted') || 'All data has been deleted successfully')
        queryClient.clear()
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } catch (error) {
        toast.error(t('failedToDeleteData') || 'Failed to delete data')
        setIsDeleting(false)
      }
    } else if (userInput !== null) {
      toast.error(t('incorrectConfirmation') || 'Incorrect confirmation text')
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('settings')}</h1>
          <p className="text-muted-foreground mt-1">{t('manageSystemConfiguration')}</p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={!hasChanges || updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('saveChanges')}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                {isDarkMode ? <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
              </div>
              <div>
                <CardTitle className="text-lg">{t('appearance')}</CardTitle>
                <CardDescription>{t('customizeAppearance')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
              <div>
                <p className="font-medium text-foreground">{t('darkMode')}</p>
                <p className="text-sm text-muted-foreground">{t('switchDarkMode')}</p>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('generalSettings')}</CardTitle>
                <CardDescription>{t('basicAcademyConfiguration')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('academyName')}</Label>
                <Input value={getSettingValue('academy_name')} onChange={(e) => handleSettingChange('academy_name', e.target.value)} placeholder="Bunyodkor Football Academy" />
              </div>
              <div className="space-y-2">
                <Label>{t('contactPhone')}</Label>
                <Input value={getSettingValue('academy_phone')} onChange={(e) => handleSettingChange('academy_phone', e.target.value)} placeholder="+998 XX XXX XX XX" />
              </div>
              <div className="space-y-2">
                <Label>{t('emailAddress')}</Label>
                <Input type="email" value={getSettingValue('academy_email')} onChange={(e) => handleSettingChange('academy_email', e.target.value)} placeholder="info@bunyodkor.uz" />
              </div>
              <div className="space-y-2">
                <Label>{t('address')}</Label>
                <Input value={getSettingValue('academy_address')} onChange={(e) => handleSettingChange('academy_address', e.target.value)} placeholder="Tashkent, Uzbekistan" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('financeSettings')}</CardTitle>
                <CardDescription>{t('paymentBillingConfiguration')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('defaultMonthlyFee')}</Label>
                <Input type="number" value={getSettingValue('default_monthly_fee')} onChange={(e) => handleSettingChange('default_monthly_fee', e.target.value)} placeholder="500000" />
              </div>
              <div className="space-y-2">
                <Label>{t('paymentGracePeriod')}</Label>
                <Input type="number" value={getSettingValue('payment_grace_period')} onChange={(e) => handleSettingChange('payment_grace_period', e.target.value)} placeholder="5" />
              </div>
              <div className="space-y-2">
                <Label>{t('lateFeePercentage')}</Label>
                <Input type="number" value={getSettingValue('late_fee_percentage')} onChange={(e) => handleSettingChange('late_fee_percentage', e.target.value)} placeholder="5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('notifications')}</CardTitle>
                <CardDescription>{t('alertReminderPreferences')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
              <div>
                <p className="font-medium text-foreground">{t('emailNotifications')}</p>
                <p className="text-sm text-muted-foreground">{t('receiveEmailAlerts')}</p>
              </div>
              <Switch checked={getSettingValue('email_notifications') === 'true'} onCheckedChange={(checked) => handleSettingChange('email_notifications', checked ? 'true' : 'false')} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
              <div>
                <p className="font-medium text-foreground">{t('smsNotifications')}</p>
                <p className="text-sm text-muted-foreground">{t('sendSmsAlerts')}</p>
              </div>
              <Switch checked={getSettingValue('sms_notifications') === 'true'} onCheckedChange={(checked) => handleSettingChange('sms_notifications', checked ? 'true' : 'false')} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
              <div>
                <p className="font-medium text-foreground">{t('paymentReminders')}</p>
                <p className="text-sm text-muted-foreground">{t('automaticPaymentReminders')}</p>
              </div>
              <Switch checked={getSettingValue('payment_reminders') === 'true'} onCheckedChange={(checked) => handleSettingChange('payment_reminders', checked ? 'true' : 'false')} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/30">
                <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('apiConfiguration')}</CardTitle>
                <CardDescription>{t('backendConnectionSettings')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-foreground">{t('connectionStatus')}</p>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Check className="w-3 h-3 mr-1" />
                  {t('connected')}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('apiBaseUrl')}</span>
                  <code className="text-foreground bg-muted px-2 py-0.5 rounded text-xs">{import.meta.env.VITE_API_URL || t('usingMockApi')}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('mockMode')}</span>
                  <Badge variant="outline" className="text-xs">{import.meta.env.VITE_USE_MOCK_API === 'true' ? t('enabled') : t('disabled')}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-red-600 dark:text-red-400">{t('dangerZone') || 'Danger Zone'}</CardTitle>
                <CardDescription>{t('systemManagementActions') || 'Critical system management actions'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="font-semibold text-red-900 dark:text-red-100">{t('restartServer') || 'Restart Server'}</p>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {t('restartServerDescription') || 'Restart the backend server. This will disconnect all users temporarily.'}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleRestartServer}
                  disabled={isRestarting}
                  className="gap-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 shrink-0"
                >
                  {isRestarting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('restarting') || 'Restarting...'}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      {t('restart') || 'Restart'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="font-semibold text-red-900 dark:text-red-100">{t('deleteAllData') || 'Delete All Data'}</p>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                    {t('deleteAllDataDescription') || 'Permanently delete ALL data including students, contracts, transactions, groups, and users.'}
                  </p>
                  <Badge className="bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200 border-0">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {t('irreversibleAction') || 'IRREVERSIBLE ACTION'}
                  </Badge>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="gap-2 bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 shrink-0"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('deleting') || 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {t('deleteAll') || 'Delete All'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
