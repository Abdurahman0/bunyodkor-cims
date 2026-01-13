import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { coachService, groupService } from '@/services/api.service'
import type {
  GroupRead,
  SessionRead,
  StudentWithDebtInfo,
  AttendanceCreateRequest,
  StudentRead,
} from '@/types/api'
import {
  GraduationCap,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguageStore } from '@/store/languageStore'
import { useAuthStore } from '@/store/authStore'
import { SessionDialog } from './SessionDialog'

export default function CoachPanel() {
  const { t } = useLanguageStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false)
  const [attendanceStatus, setAttendanceStatus] = useState<Record<number, 'present' | 'absent' | 'late'>>({})

  useEffect(() => {
    setAttendanceStatus({});
  }, [selectedSession]);

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['coach-groups'],
    queryFn: () => coachService.getCoachGroups(),
  })


  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['coach-sessions', selectedDate],
    queryFn: () => coachService.getCoachSessions({ date: selectedDate }),
  })

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['session-students', selectedSession],
    queryFn: () => {
      if (!selectedSession) return Promise.resolve(null)
      return coachService.getSessionStudentsWithDebt(selectedSession)
    },
    enabled: !!selectedSession,
  })

  const { data: groupStudentsData, isLoading: groupStudentsLoading } = useQuery({
    queryKey: ['group-students', selectedGroup],
    queryFn: () => {
      if (!selectedGroup) return Promise.resolve(null)
      return groupService.getGroupStudents(selectedGroup)
    },
    enabled: !!selectedGroup,
  })

  const bulkAttendanceMutation = useMutation({
    mutationFn: (data: { session_id: number; attendances: AttendanceCreateRequest[] }) =>
      coachService.bulkAttendance(data),
    onSuccess: () => {
      toast.success(t('attendanceSubmittedSuccessfully'))
      setAttendanceStatus({})
      queryClient.invalidateQueries({ queryKey: ['session-students', selectedSession] })
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t('failedToSubmitAttendance');

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  })

  const handleMarkAttendance = (
    studentId: number,
    status: 'present' | 'absent' | 'late'
  ) => {
    setAttendanceStatus((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  }

  const handleSubmitAttendance = () => {
    if (!selectedSession || Object.keys(attendanceStatus).length === 0) {
      toast.error(t('noAttendanceChangesToSubmit'))
      return
    }
    const attendances: AttendanceCreateRequest[] = Object.entries(attendanceStatus).map(
      ([student_id, status]) => ({
        student_id: parseInt(student_id),
        status: status as 'present' | 'absent' | 'late',
        comment: '',
      })
    );
    bulkAttendanceMutation.mutate({ session_id: selectedSession, attendances })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS'
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('coachPanel')}</h1>
          <p className="text-muted-foreground mt-1">{t('manageSessionsAttendance')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>
      </motion.div>

      {/* My Groups */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {t('myGroups')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : groupsData?.data && groupsData.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupsData.data.map((group: GroupRead) => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedGroup === group.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-semibold text-foreground">{group.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {group.schedule_days}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {group.schedule_time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('noGroupsAssigned')}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Selected Group Details */}
      {selectedGroup && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  {groupsData?.data?.find(g => g.id === selectedGroup)?.name} - {t('groupDetails')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGroup(null)}
                >
                  {t('close')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Group Info */}
              <div className="mb-4 p-4 bg-muted/30 dark:bg-muted/10 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('scheduleDays')}</p>
                    <p className="font-medium text-foreground mt-1">
                      {groupsData?.data?.find(g => g.id === selectedGroup)?.schedule_days}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('scheduleTime')}</p>
                    <p className="font-medium text-foreground mt-1">
                      {groupsData?.data?.find(g => g.id === selectedGroup)?.schedule_time}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('totalStudents')}</p>
                    <p className="font-medium text-foreground mt-1">
                      {groupStudentsData?.data?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('description')}</p>
                    <p className="font-medium text-foreground mt-1">
                      {groupsData?.data?.find(g => g.id === selectedGroup)?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Students List */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">{t('enrolledStudents')}</h3>
                {groupStudentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : groupStudentsData?.data && groupStudentsData.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupStudentsData.data.map((student: StudentRead) => (
                      <div
                        key={student.id}
                        className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {student.first_name} {student.last_name}
                            </p>
                          </div>
                        </div>
                        {student.phone && (
                          <p className="text-xs text-muted-foreground mt-2">
                            📞 {student.phone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('noStudentsEnrolled')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Sessions for Selected Date */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className='w-full '>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-8 h-6" />
              {t('sessionsForDate')} {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </CardTitle>
            {user?.role === 'head-coach' && (
              <Button size="sm" onClick={() => setIsSessionDialogOpen(true)}>
                {t('createSession')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sessionsData?.data && sessionsData.data.length > 0 ? (
              <div className="space-y-2">
                {sessionsData.data.map((session: SessionRead) => {
                  const group = groupsData?.data?.find((g) => g.id === session.group_id)
                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        selectedSession === session.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {group?.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {group?.name || `Group #${session.group_id}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {session.start_time} - {session.end_time}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={selectedSession === session.id ? 'default' : 'outline'}
                        size="sm"
                      >
                        {selectedSession === session.id ? t('selected') : t('select')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('noSessionsScheduled')}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance */}
      {selectedSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('markAttendance')}
              </CardTitle>
            </CardHeader>
            <Table isLoading={studentsLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('studentName')}</TableHead>
                  <TableHead>{t('debtStatus')}</TableHead>
                  <TableHead className="text-right">{t('attendance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsData?.data && studentsData.data.length > 0 ? (
                  studentsData.data.map((student: StudentWithDebtInfo) => (
                    <TableRow key={student.student_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {student.first_name} {student.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.has_debt ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              {formatCurrency(student.debt_amount!)}
                            </Badge>
                            <span className="text-xs text-red-500">
                              {t('studentOwes')} {formatCurrency(student.debt_amount!)}
                            </span>
                          </div>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                            {t('noDebt')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={attendanceStatus[student.student_id] === 'present' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleMarkAttendance(student.student_id, 'present')}
                            disabled={bulkAttendanceMutation.isPending}
                            className="gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={attendanceStatus[student.student_id] === 'late' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => handleMarkAttendance(student.student_id, 'late')}
                            disabled={bulkAttendanceMutation.isPending}
                            className="gap-1"
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={attendanceStatus[student.student_id] === 'absent' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => handleMarkAttendance(student.student_id, 'absent')}
                            disabled={bulkAttendanceMutation.isPending}
                            className="gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty
                    icon={<Users className="w-12 h-12" />}
                    title={t('noStudents')}
                    description={t('noStudentsInSession')}
                  />
                )}
              </TableBody>
            </Table>
            {studentsData?.data && studentsData.data.length > 0 && (
              <div className="flex justify-end p-4 border-t">
                <Button
                  onClick={handleSubmitAttendance}
                  disabled={bulkAttendanceMutation.isPending || Object.keys(attendanceStatus).length === 0}
                >
                  {bulkAttendanceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('submitAttendance')}
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      <SessionDialog
        open={isSessionDialogOpen}
        onOpenChange={setIsSessionDialogOpen}
        groups={groupsData?.data}
        sessionDate={selectedDate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['coach-sessions', selectedDate] });
        }}
      />
    </div>
  )
}