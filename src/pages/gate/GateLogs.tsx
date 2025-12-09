import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
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
import { gateService, studentService } from '@/services/api.service'
import type { GateLogRead, StudentRead } from '@/types/api'
import {
  DoorOpen,
  CheckCircle,
  XCircle,
  Clock,
  User,
  X,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { useLanguageStore } from '@/store/languageStore'
import { useDebounce } from '@/hooks/useDebounce'

export default function GateLogs() {
  const { t } = useLanguageStore()
  const [page, setPage] = useState(1)
  const [studentFilter, setStudentFilter] = useState('')
  const [allowedFilter, setAllowedFilter] = useState<string>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const debouncedStudentFilter = useDebounce(studentFilter, 500)

  const { data, isLoading } = useQuery({
    queryKey: ['gate-logs', page, debouncedStudentFilter, allowedFilter, fromDate, toDate],
    queryFn: () =>
      gateService.getGateLogs({
        page,
        page_size: 15,
        student_id: debouncedStudentFilter ? parseInt(debouncedStudentFilter, 10) : undefined,
        allowed: allowedFilter ? allowedFilter === 'true' : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.getStudents({ page: 1, page_size: 100 }),
  })

  const getStudentName = (studentId: number) => {
    const student = studentsData?.data?.find((s: StudentRead) => s.id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : `ID: ${studentId}`;
  }

  const clearFilters = () => {
    setStudentFilter('')
    setAllowedFilter('')
    setFromDate('')
    setToDate('')
  }

  const hasActiveFilters = studentFilter || allowedFilter || fromDate || toDate

  const stats = {
    total: data?.meta?.total || 0,
    allowed: data?.data?.filter((log: GateLogRead) => log.allowed).length || 0,
    denied: data?.data?.filter((log: GateLogRead) => !log.allowed).length || 0,
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('gateLogs')}</h1>
          <p className="text-muted-foreground mt-1">{t('monitorStudentAccess')}</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {t('exportLogs')}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalEntries')}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <DoorOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('allowed')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.allowed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('denied')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.denied}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('filterByStudentId')}
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={allowedFilter}
                onChange={(e) => setAllowedFilter(e.target.value)}
                className="w-full lg:w-40"
              >
                <option value="">{t('allStatus')}</option>
                <option value="true">{t('allowed')}</option>
                <option value="false">{t('denied')}</option>
              </Select>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full lg:w-40"
                placeholder={t('fromDate')}
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full lg:w-40"
                placeholder={t('toDate')}
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">{t('accessLogs')}</CardTitle>
          </CardHeader>
          <Table isLoading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>{t('time')}</TableHead>
                <TableHead>{t('student')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('reason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((log: GateLogRead) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {format(new Date(log.gate_timestamp), 'HH:mm:ss')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.gate_timestamp), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <span className="text-sm">{getStudentName(log.student_id)}</span>
                    </TableCell>
                    <TableCell>
                      {log.allowed ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {t('allowed')}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
                          <XCircle className="w-3 h-3" />
                          {t('denied')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {log.reason || '-'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty
                  icon={<DoorOpen className="w-12 h-12" />}
                  title={t('noLogsFound')}
                  description={t('gateAccessLogsWillAppear')}
                />
              )}
            </TableBody>
          </Table> 
          {data?.meta && data.meta.total_pages && data.meta.total_pages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={data.meta.total_pages}
              totalItems={data.meta.total}
              pageSize={15}
              onPageChange={setPage}
            />
          )}
        </Card>
      </motion.div>
    </div>
  )
}
