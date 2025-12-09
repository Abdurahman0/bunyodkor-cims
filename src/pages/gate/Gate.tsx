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
import { apiClient } from '@/lib/api-client'
import {
  DoorOpen,
  CheckCircle,
  XCircle,
  X,
  Download,
  Clock,
  Shield,
} from 'lucide-react'
import { format, subDays } from 'date-fns'

interface GateLog {
  id: number
  allowed: boolean
  reason: string
  gate_timestamp: string
  student_id: number
  created_at: string
}

export default function Gate() {
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [studentId, setStudentId] = useState('')
  const [allowedFilter, setAllowedFilter] = useState<string>('')

  // Fetch gate logs
  const { data, isLoading } = useQuery({
    queryKey: ['gate-logs', page, fromDate, toDate, studentId, allowedFilter],
    queryFn: async () => {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        page_size: 15,
        from_date: fromDate + 'T00:00:00',
        to_date: toDate ? toDate + 'T23:59:59' : undefined,
      }
      if (studentId) params.student_id = parseInt(studentId)
      if (allowedFilter !== '') params.allowed = allowedFilter === 'true'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await apiClient.get<{ data: GateLog[]; meta: any }>('/gate/logs', { params })
      return response.data
    },
  })

  const clearFilters = () => {
    setFromDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
    setToDate(format(new Date(), 'yyyy-MM-dd'))
    setStudentId('')
    setAllowedFilter('')
  }

  const hasActiveFilters = studentId || allowedFilter !== ''

  // Calculate stats
  const stats = {
    total: data?.meta?.total || 0,
    allowed: data?.data?.filter((l) => l.allowed).length || 0,
    denied: data?.data?.filter((l) => !l.allowed).length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gate Logs</h1>
          <p className="text-muted-foreground mt-1">Monitor gate access and entry records</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Logs
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DoorOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Allowed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.allowed}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Denied</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.denied}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">From Date</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">To Date</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Student ID</label>
                <Input
                  type="number"
                  placeholder="Enter ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
                <Select
                  value={allowedFilter}
                  onChange={(e) => setAllowedFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="true">Allowed</option>
                  <option value="false">Denied</option>
                </Select>
              </div>
              <div className="flex items-end">
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gate Logs Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Access Logs
            </CardTitle>
          </CardHeader>
          <Table isLoading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">
                            {format(new Date(log.gate_timestamp), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(log.gate_timestamp), 'HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {log.student_id}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Student #{log.student_id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.allowed ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Allowed
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
                          <XCircle className="w-3 h-3" />
                          Denied
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.reason || '-'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty
                  icon={<DoorOpen className="w-12 h-12" />}
                  title="No gate logs found"
                  description="Gate access logs will appear here when students enter or exit"
                />
              )}
            </TableBody>
          </Table>
          {data?.meta && data.meta.total_pages > 1 && (
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

      {/* Live Activity Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
            </div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Gate System Active</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Monitoring gate access in real-time. Logs are updated automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
