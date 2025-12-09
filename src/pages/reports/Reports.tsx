import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableEmpty,
} from '@/components/ui/table'
import { BarChart, DonutChart, StatsCard } from '@/components/ui/charts'
import { reportService } from '@/services/api.service'
import type { FinanceReport, DebtorItem, GroupAttendanceReport } from '@/types/api'
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  Download,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import { exportReport } from '@/lib/export-utils'
import { useLanguageStore } from '@/store/languageStore'

export default function Reports() {
  const { t } = useLanguageStore()
  const [activeTab, setActiveTab] = useState<'finance' | 'attendance' | 'debtors'>('finance')
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [debtorsPage, setDebtorsPage] = useState(1)

  const { data: financeReport, isLoading: financeLoading } = useQuery({
    queryKey: ['finance-report', dateRange],
    queryFn: () =>
      reportService.getFinanceReport({ from_date: dateRange.from, to_date: dateRange.to }),
    enabled: activeTab === 'finance',
  })

  const { data: attendanceReport, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-report'],
    queryFn: () => reportService.getGroupAttendanceReport(),
    enabled: activeTab === 'attendance',
  })

  const { data: debtorsData, isLoading: debtorsLoading } = useQuery({
    queryKey: ['debtors-report', debtorsPage],
    queryFn: () =>
      reportService.getDebtorsReport({ page: debtorsPage, page_size: 10 }),
    enabled: activeTab === 'debtors',
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) + ' UZS';
  }

  const formatSource = (source: string) => {
    // Remove any "Paymentsource." or "PaymentSource." prefix and format properly
    const cleanSource = source?.toString().replace(/^.*\./, '').toLowerCase() || ''
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1)
  }

  const tabs = [
    { id: 'finance', label: t('financeReport'), icon: CreditCard },
    { id: 'attendance', label: t('attendanceReport'), icon: Users },
    { id: 'debtors', label: t('debtors'), icon: AlertTriangle },
  ]

  const paymentSourcesData = financeReport?.data?.breakdown?.map((item) => ({
    label: formatSource(item.source),
    value: item.total_amount,
  })) || []

  const transactionCountData = financeReport?.data?.breakdown?.map((item) => ({
    label: formatSource(item.source),
    value: item.transaction_count,
  })) || []

  const attendanceChartData = attendanceReport?.data?.map((group) => ({
    label: group.group_name,
    value: group.attendance_percentage,
  })) || []

  const handleExport = () => {
    try {
      let dataToExport: any[] | null = null;
      let reportType = '';

      switch (activeTab) {
        case 'finance':
          if (!financeReport?.data?.breakdown?.length) {
            toast.error('No finance data to export');
            return;
          }
          dataToExport = financeReport.data.breakdown.map((item) => ({
            'Payment Method': formatSource(item.source),
            'Transaction Count': item.transaction_count,
            'Total Amount': item.total_amount,
            'Average Amount': Math.round(item.total_amount / (item.transaction_count || 1)),
          }));
          reportType = `finance-report-${dateRange.from}-to-${dateRange.to}`;
          break;

        case 'attendance':
          if (!attendanceReport?.data?.length) {
            toast.error('No attendance data to export');
            return;
          }
          dataToExport = attendanceReport.data.map((group) => ({
            'Group Name': group.group_name,
            'Total Sessions': group.total_sessions,
            'Total Students': group.total_students,
            'Attendance Rate': `${group.attendance_percentage}%`,
          }));
          reportType = 'attendance-report';
          break;

        case 'debtors':
          if (!debtorsData?.data?.length) {
            toast.error('No debtors data to export');
            return;
          }
          dataToExport = debtorsData.data.map((debtor) => ({
            'Student ID': debtor.student_id,
            'Student Name': debtor.student_name,
            'Contract Number': debtor.contract_number,
            'Group Name': debtor.group_name,
            'Debt Amount': debtor.debt_amount,
          }));
          reportType = 'debtors-report';
          break;
      }

      if (dataToExport) {
        exportReport(dataToExport, reportType);
        toast.success('Report exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export report');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('reports')}</h1>
          <p className="text-muted-foreground mt-1">{t('analyticsAndInsights')}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />
          {t('exportReport')}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id as any)}
            className="gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </motion.div>

      {activeTab === 'finance' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('fromDate')}</label>
                  <Input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="w-40" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('toDate')}</label>
                  <Input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="w-40" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })}>
                    {t('last7Days')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })}>
                    {t('last30Days')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') })}>
                    {t('thisMonth')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title={t('totalRevenue')} value={formatCurrency(financeReport?.data?.total_revenue || 0)} icon={<TrendingUp className="w-6 h-6" />} />
            <StatsCard title={t('transactions')} value={financeReport?.data?.breakdown?.reduce((acc, item) => acc + item.transaction_count, 0) || 0} icon={<CreditCard className="w-6 h-6" />} />
            <StatsCard title={t('paymentMethods')} value={financeReport?.data?.breakdown?.length || 0} icon={<BarChart3 className="w-6 h-6" />} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">{t('revenueBySource')}</CardTitle></CardHeader>
              <CardContent>
                {paymentSourcesData.length > 0 ? <DonutChart data={paymentSourcesData} size={180} centerValue={formatCurrency(financeReport?.data?.total_revenue || 0)} centerLabel="Total" /> : <div className="h-48 flex items-center justify-center text-muted-foreground">No data available</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">{t('transactionsBySource')}</CardTitle></CardHeader>
              <CardContent>
                {transactionCountData.length > 0 ? <BarChart data={transactionCountData} height={200} horizontal /> : <div className="h-48 flex items-center justify-center text-muted-foreground">No data available</div>}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">{t('detailedBreakdown')}</CardTitle></CardHeader>
            <Table isLoading={financeLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('paymentMethod')}</TableHead>
                  <TableHead className="text-right">{t('transactions')}</TableHead>
                  <TableHead className="text-right">{t('average')}</TableHead>
                  <TableHead className="text-right">{t('totalAmount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeReport?.data?.breakdown?.map((item) => (
                  <TableRow key={item.source}>
                    <TableCell><Badge variant="secondary">{formatSource(item.source)}</Badge></TableCell>
                    <TableCell className="text-right">{item.transaction_count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(Math.round(item.total_amount / (item.transaction_count || 1)))}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                  </TableRow>
                )) || <TableEmpty title={t('noData')} description={t('selectDateRangeForReport')} />}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      {activeTab === 'attendance' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t('groupAttendanceRates')}</CardTitle></CardHeader>
            <CardContent>
              {attendanceChartData.length > 0 ? <BarChart data={attendanceChartData} height={300} showValues /> : <div className="h-64 flex items-center justify-center text-muted-foreground">{t('noAttendanceData')}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">{t('groupAttendanceDetails')}</CardTitle></CardHeader>
            <Table isLoading={attendanceLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('group')}</TableHead>
                  <TableHead className="text-right">{t('totalSessions')}</TableHead>
                  <TableHead className="text-right">{t('totalStudents')}</TableHead>
                  <TableHead className="text-right">{t('attendanceRate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceReport?.data?.map((group) => (
                  <TableRow key={group.group_id}>
                    <TableCell className="font-medium">{group.group_name}</TableCell>
                    <TableCell className="text-right">{group.total_sessions}</TableCell>
                    <TableCell className="text-right">{group.total_students}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={group.attendance_percentage >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : group.attendance_percentage >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                        {group.attendance_percentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) || <TableEmpty title={t('noAttendanceData')} description={t('attendanceDataWillAppear')} />}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      {activeTab === 'debtors' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard title={t('totalDebtors')} value={debtorsData?.meta?.total || 0} icon={<AlertTriangle className="w-6 h-6" />} />
            <StatsCard title={t('totalDebtAmount')} value={formatCurrency(debtorsData?.data?.reduce((acc, item) => acc + item.debt_amount, 0) || 0)} icon={<CreditCard className="w-6 h-6" />} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">{t('debtorsList')}</CardTitle></CardHeader>
            <Table isLoading={debtorsLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('student')}</TableHead>
                  <TableHead>{t('contract')}</TableHead>
                  <TableHead>{t('group')}</TableHead>
                  <TableHead className="text-right">{t('debtAmount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtorsData?.data?.map((debtor) => (
                  <TableRow key={debtor.student_id}>
                    <TableCell className="font-medium">{debtor.student_name}</TableCell>
                    <TableCell><Badge variant="outline">{debtor.contract_number}</Badge></TableCell>
                    <TableCell>{debtor.group_name}</TableCell>
                    <TableCell className="text-right"><span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(debtor.debt_amount)}</span></TableCell>
                  </TableRow>
                )) || <TableEmpty icon={<CheckCircle className="w-12 h-12 text-green-500" />} title={t('noDebtors')} description={t('allStudentsPaid')} />}
              </TableBody>
            </Table>
            {debtorsData?.meta && debtorsData.meta.total_pages > 1 && (
              <TablePagination currentPage={debtorsPage} totalPages={debtorsData.meta.total_pages} totalItems={debtorsData.meta.total} pageSize={10} onPageChange={setDebtorsPage} />
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}
