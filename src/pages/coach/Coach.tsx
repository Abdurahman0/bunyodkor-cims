import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { coachService, attendanceService } from "@/services/api.service";
import type {
  GroupRead,
  SessionRead,
  StudentWithDebtInfo,
  ApiResponse,
  AttendanceRead,
} from "@/types/api";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  GraduationCap,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import toast from "react-hot-toast";
import { useLanguageStore } from "@/store/languageStore";

export default function Coach() {
  const { t } = useLanguageStore();
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<number, string>
  >({});
  const queryClient = useQueryClient();

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["coach-groups"],
    queryFn: () => coachService.getCoachGroups(),
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["coach-sessions", selectedDate],
    queryFn: () => coachService.getCoachSessions({ date: selectedDate }),
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["session-students", selectedSession],
    queryFn: () => {
      if (!selectedSession) return Promise.resolve(null);
      return coachService.getSessionStudentsWithDebt(selectedSession);
    },
    enabled: !!selectedSession,
  });

  // Fetch existing attendances for the selected session
  const { data: existingAttendancesData } = useQuery({
    queryKey: ["session-attendances", selectedSession, selectedDate],
    queryFn: () => {
      if (!selectedSession) return Promise.resolve(null);
      return attendanceService.getAllAttendances({
        from_date: selectedDate,
        to_date: selectedDate,
        page: 1,
        page_size: 100,
      });
    },
    enabled: !!selectedSession,
  });

  // Create a map of student_id -> attendance for the current session
  const existingAttendanceMap = useMemo(() => {
    if (!existingAttendancesData?.data || !selectedSession) return new Map();

    const map = new Map<number, AttendanceRead>();
    existingAttendancesData.data.forEach((attendance) => {
      if (attendance.session_id === selectedSession) {
        map.set(attendance.student_id, attendance);
      }
    });
    return map;
  }, [existingAttendancesData, selectedSession]);

  const attendanceMutation = useMutation<
    ApiResponse<Record<string, unknown>>, // ✔ API real qaytaradigan type
    Error,
    {
      session_id: number;
      student_id: number;
      status: "present" | "absent" | "late";
      comment: string;
    }
  >({
    mutationFn: (data) =>
      coachService.markAttendance(data.session_id, {
        student_id: data.student_id,
        status: data.status,
        comment: data.comment,
      }),

    onSuccess: () => {
      toast.success(t("attendanceMarked"));
      queryClient.invalidateQueries({
        queryKey: ["session-students", selectedSession],
      });
      queryClient.invalidateQueries({
        queryKey: ["session-attendances", selectedSession],
      });
    },

    onError: (error: unknown) => {
      let errorMessage = "Failed to mark attendance";

      // First: ensure error is an object
      if (typeof error === "object" && error !== null && "response" in error) {
        type ErrorResponse = {
          response?: {
            data?: {
              detail?: string | { msg?: string; message?: string }[];
            };
          };
        };

        const err = error as ErrorResponse;
        const detail = err.response?.data?.detail;

        if (Array.isArray(detail) && detail.length > 0) {
          errorMessage = detail[0].msg || detail[0].message || errorMessage;
        } else if (typeof detail === "string") {
          errorMessage = detail;
        }
      }

      toast.error(errorMessage);
    },
  });

  const handleDateChange = (days: number) => {
    const newDate =
      days > 0
        ? addDays(new Date(selectedDate), days)
        : subDays(new Date(selectedDate), Math.abs(days));
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
    setSelectedSession(null);
  };

  const handleMarkAttendance = (
    studentId: number,
    status: "present" | "absent" | "late"
  ) => {
    if (!selectedSession) return;
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
    attendanceMutation.mutate({
      session_id: selectedSession,
      student_id: studentId,
      status,
      comment: "",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "absent":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "late":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Coach Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage sessions and mark attendance
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateChange(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSession(null);
                  }}
                  className="w-44"
                />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {format(new Date(selectedDate), "EEEE")}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateChange(1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                My Groups
              </CardTitle>
              <CardDescription>Groups assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : groupsData?.data && groupsData.data.length > 0 ? (
                <div className="space-y-3">
                  {groupsData.data.map((group: GroupRead) => (
                    <div
                      key={group.id}
                      className="p-3 rounded-lg bg-muted/50 dark:bg-muted/20"
                    >
                      <p className="font-medium text-foreground">
                        {group.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.schedule_days} • {group.schedule_time}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No groups assigned
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Sessions
              </CardTitle>
              <CardDescription>
                {format(new Date(selectedDate), "MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sessionsData?.data && sessionsData.data.length > 0 ? (
                <div className="space-y-3">
                  {sessionsData.data.map((session: SessionRead) => {
                    const group = groupsData?.data?.find(
                      (g) => g.id === session.group_id
                    );
                    const isSelected = selectedSession === session.id;
                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session.id)}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 dark:bg-muted/20 hover:bg-muted"
                        }`}
                      >
                        <p className="font-medium">
                          {group?.name || `Group #${session.group_id}`}
                        </p>
                        {session.topic && (
                          <p
                            className={`text-xs mt-0.5 ${
                              isSelected
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {session.topic}
                          </p>
                        )}
                        <p
                          className={`text-sm mt-1 ${
                            isSelected
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {session.start_time} - {session.end_time}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions for this date
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Attendance
              </CardTitle>
              <CardDescription>
                {selectedSession
                  ? "Mark student attendance"
                  : "Select a session"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSession ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a session to mark attendance
                </div>
              ) : studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : studentsData?.data && studentsData.data.length > 0 ? (
                <div className="space-y-3">
                  {studentsData.data.map((student: StudentWithDebtInfo) => {
                    const existingAttendance = existingAttendanceMap.get(student.student_id);
                    const hasExistingAttendance = !!existingAttendance;
                    const displayStatus = hasExistingAttendance
                      ? existingAttendance.status
                      : attendanceStatus[student.student_id];

                    return (
                      <div
                        key={student.student_id}
                        className="p-3 rounded-lg bg-muted/50 dark:bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {student.first_name} {student.last_name}
                            </p>
                            {student.has_debt && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-500">
                                  Debt: {formatCurrency(student.debt_amount!)}
                                </span>
                              </div>
                            )}
                            {hasExistingAttendance && (
                              <div className="flex items-center gap-1 mt-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  Davomat olindi
                                </span>
                              </div>
                            )}
                          </div>
                          {displayStatus && getStatusIcon(displayStatus)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={
                              displayStatus === "present"
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              handleMarkAttendance(student.student_id, "present")
                            }
                            className="flex-1 gap-1"
                            disabled={attendanceMutation.isPending || hasExistingAttendance}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              displayStatus === "absent"
                                ? "destructive"
                                : "outline"
                            }
                            onClick={() =>
                              handleMarkAttendance(student.student_id, "absent")
                            }
                            className="flex-1 gap-1"
                            disabled={attendanceMutation.isPending || hasExistingAttendance}
                          >
                            <XCircle className="w-4 h-4" />
                            Absent
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              displayStatus === "late"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() =>
                              handleMarkAttendance(student.student_id, "late")
                            }
                            className="gap-1"
                            disabled={attendanceMutation.isPending || hasExistingAttendance}
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No students in this session
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
