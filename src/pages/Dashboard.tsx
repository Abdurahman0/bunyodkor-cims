import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard, DonutChart, LineChart } from '@/components/ui/charts'
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Activity
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLanguageStore } from '@/store/languageStore'
import { reportService, transactionService, groupService, studentService, userService } from '@/services/api.service'
import type { DashboardSummary, TransactionRead, GroupRead, StudentRead, UserRead, FinanceReport } from '@/types/api'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { t } = useLanguageStore()

  const { data: summaryData } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => reportService.getDashboardSummary(),
  })
  const summary = summaryData?.data

  const { data: transactionsData } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionService.getTransactions({ page: 1, page_size: 5 }),
  })

  const { data: groupsData } = useQuery({
    queryKey: ['groups-stats'],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 4 }),
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students-list-short'],
    queryFn: () => studentService.getStudents({ page: 1, page_size: 100 }),
  })

  const { data: coachesData } = useQuery({
    queryKey: ['coaches-list'],
    queryFn: () => userService.getCoaches({}),
  })

  const { data: financeData } = useQuery({
    queryKey: ['dashboard-finance'],
    queryFn: () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      return reportService.getFinanceReport({ from_date: weekAgo, to_date: today })
    },
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) + ' UZS'
  }

  const formatSource = (source: string) => {
    // Remove any "Paymentsource." or "PaymentSource." prefix and format properly
    const cleanSource = source?.toString().replace(/^.*\./, '').toLowerCase() || ''
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1)
  }

  const getStudentName = (id: number) => studentsData?.data?.find(s => s.id === id)?.full_name || `ID: ${id}`
  const getCoachName = (id: number) => coachesData?.data?.find(c => c.id === id)?.full_name || `ID: ${id}`

  const paymentSourcesData = financeData?.data?.breakdown?.map((item) => ({
    label: formatSource(item.source),
    value: item.transaction_count,
  })) || []

  // NOTE: Revenue and Attendance charts use static placeholder data as there are no backend endpoints for this yet.
  const revenueData = [
    { label: 'Mon', value: 2400 },
    { label: 'Tue', value: 1800 },
    { label: 'Wed', value: 3200 },
    { label: 'Thu', value: 2800 },
    { label: 'Fri', value: 4100 },
    { label: 'Sat', value: 3500 },
    { label: 'Sun', value: 2900 },
  ]
  const attendanceData = [
    { label: 'Present', value: 85, color: 'hsl(142, 71%, 45%)' },
    { label: 'Absent', value: 10, color: 'hsl(0, 84%, 60%)' },
    { label: 'Late', value: 5, color: 'hsl(47, 96%, 53%)' },
  ]

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t('welcomeBack')}, {user?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">{t('todayActivity')}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          <Calendar className="inline-block w-4 h-4 mr-1" />
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <motion.div variants={itemVariants}>
          <StatsCard title={t('todayRevenue')} value={formatCurrency(summary?.today_revenue || 0)} icon={<CreditCard className="w-6 h-6" />} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title={t('activeStudents')} value={summary?.active_students || 0} icon={<Users className="w-6 h-6" />} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title={t('totalDebtors')} value={summary?.total_debtors || 0} icon={<AlertTriangle className="w-6 h-6" />} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard title={t('todaySessions')} value={summary?.today_sessions || 0} icon={<GraduationCap className="w-6 h-6" />} />
        </motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">{t('revenueOverview')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('weeklyRevenueTrends')}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <LineChart data={revenueData} height={250} showArea showDots showValues={false} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">{t('paymentSources')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('distributionByMethod')}</p>
            </CardHeader>
            <CardContent>
              <DonutChart data={paymentSourcesData} size={160} centerValue={paymentSourcesData.reduce((a: any, b: any) => a + b.value, 0)} centerLabel="Total" showLegend />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">{t('todayAttendance')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('studentAttendanceStatus')}</p>
            </CardHeader>
            <CardContent>
              <DonutChart data={attendanceData} size={160} centerValue="85%" centerLabel="Present" showLegend />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">{t('recentTransactions')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('latestPaymentActivity')}</p>
              </div>
              <Link to="/finance"><Button variant="ghost" size="sm" className="gap-1">{t('viewAll')} <ArrowUpRight className="w-4 h-4" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactionsData?.data?.slice(0, 5).map((tx: TransactionRead) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : tx.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {tx.status === 'success' ? <CheckCircle className="w-4 h-4" /> : tx.status === 'pending' ? <Clock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{formatCurrency(tx.amount)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{tx.source} • {getStudentName(tx.student_id!) || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium capitalize ${tx.status === 'success' ? 'text-green-600 dark:text-green-400' : tx.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{tx.status}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.paid_at!), 'HH:mm')}</p>
                    </div>
                  </div>
                )) || <div className="text-center py-8 text-muted-foreground">{t('noRecentTransactions')}</div>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">{t('quickActions')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('commonTasks')}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/students"><Button variant="outline" className="w-full justify-start gap-3 h-12"><Users className="w-5 h-5 text-blue-500" /><div className="text-left"><p className="font-medium">{t('addNewStudent')}</p><p className="text-xs text-muted-foreground">{t('registerNewStudent')}</p></div></Button></Link>
              <Link to="/finance"><Button variant="outline" className="w-full justify-start gap-3 h-12"><CreditCard className="w-5 h-5 text-green-500" /><div className="text-left"><p className="font-medium">{t('recordPayment')}</p><p className="text-xs text-muted-foreground">{t('addManualTransaction')}</p></div></Button></Link>
              <Link to="/groups"><Button variant="outline" className="w-full justify-start gap-3 h-12"><GraduationCap className="w-5 h-5 text-purple-500" /><div className="text-left"><p className="font-medium">{t('viewGroups')}</p><p className="text-xs text-muted-foreground">{t('manageCourseGroups')}</p></div></Button></Link>
              <Link to="/reports"><Button variant="outline" className="w-full justify-start gap-3 h-12"><Activity className="w-5 h-5 text-orange-500" /><div className="text-left"><p className="font-medium">{t('viewReports')}</p><p className="text-xs text-muted-foreground">{t('analyticsInsights')}</p></div></Button></Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">{t('activeGroups')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('currentTrainingGroups')}</p>
              </div>
              <Link to="/groups"><Button variant="ghost" size="sm" className="gap-1">{t('viewAll')} <ArrowUpRight className="w-4 h-4" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupsData?.data?.slice(0, 4).map((group: GroupRead) => (
                  <div key={group.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">{group.name?.charAt(0) || 'G'}</div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.schedule_days} • {group.schedule_time}</p>
                      </div>
                    </div>
                    <div className="text-right"><p className="text-xs text-muted-foreground">{getCoachName(group.coach_id)}</p></div>
                  </div>
                )) || <div className="text-center py-8 text-muted-foreground">{t('noActiveGroups')}</div>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {import.meta.env.VITE_USE_MOCK_API === 'true' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"><Activity className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">{t('mockApiActive')}</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{t('mockApiMessage')} {t('mockApiConnectMessage')} <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded">VITE_USE_MOCK_API=false</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
