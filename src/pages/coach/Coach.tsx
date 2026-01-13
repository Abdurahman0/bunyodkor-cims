import { useState, useMemo, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Upload,
  FileText,
  History,
  TrendingUp,
  CalendarDays,
  List as ListIcon,
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { useLanguageStore } from "@/store/languageStore";
import WeeklyTimeTable from "@/components/timetable/WeeklyTimeTable";
import SessionDetailsDialog from "@/components/timetable/SessionDetailsDialog";

export default function Coach() {
  const { t } = useLanguageStore();
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<number, string>
  >({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentTab, setCurrentTab] = useState("attendance");
  const [viewMode, setViewMode] = useState<"timetable" | "list">("timetable");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<SessionRead | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["coach-groups"],
    queryFn: () => coachService.getCoachGroups(),
  });

  // For timetable view, fetch sessions for the entire week
  const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(selectedDate), { weekStartsOn: 1 });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["coach-sessions", selectedDate],
    queryFn: () => coachService.getCoachSessions({ date: selectedDate }),
  });

  // Fetch all sessions for the current week for timetable view
  const { data: weekSessionsData } = useQuery({
    queryKey: ["coach-week-sessions", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      // Fetch sessions for each day of the week
      const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
      const allSessions = await Promise.all(
        days.map((date) => coachService.getCoachSessions({ date }))
      );
      return {
        data: allSessions.flatMap((response) => response.data || []),
      };
    },
    enabled: viewMode === "timetable",
  });

  // Fetch my attendances for history view
  const { data: myAttendancesData } = useQuery({
    queryKey: ["my-attendances"],
    queryFn: () => coachService.getMyAttendances(),
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
        page_size: 100000,
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
    ApiResponse<Record<string, unknown>>,
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
      queryClient.invalidateQueries({
        queryKey: ["my-attendances"],
      });
    },

    onError: (error: unknown) => {
      let errorMessage = "Failed to mark attendance";

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

  // Upload konspekt mutation
  const uploadKonspektMutation = useMutation({
    mutationFn: ({ sessionId, file }: { sessionId: number; file: File }) => {
      const formData = new FormData();
      formData.append("konspekt", file);
      return coachService.uploadKonspekt(sessionId, formData);
    },
    onSuccess: () => {
      toast.success(t("konspektUploaded") || "Konspekt uploaded successfully!");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          t("errorUploadingKonspekt") ||
          "Error uploading konspekt"
      );
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

  const handleUploadKonspekt = () => {
    if (!selectedSession || !selectedFile) {
      toast.error(t("pleaseSelectFile") || "Please select a file");
      return;
    }
    uploadKonspektMutation.mutate({
      sessionId: selectedSession,
      file: selectedFile,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
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

  const handleSessionClickInTimetable = (session: SessionRead) => {
    setSelectedSessionForDetails(session);
    setDetailsDialogOpen(true);
  };

  // Calculate stats
  const totalSessions = sessionsData?.data?.length || 0;
  const totalGroups = groupsData?.data?.length || 0;
  const totalAttendances = myAttendancesData?.data?.length || 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("coachPanel") || "Coach Panel"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("manageSessionsAndAttendance") || "Manage sessions and mark attendance"}
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("myGroups") || "My Groups"}</p>
                <p className="text-2xl font-bold mt-1">{totalGroups}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("todaySessions") || "Today's Sessions"}</p>
                <p className="text-2xl font-bold mt-1">{totalSessions}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("totalAttendances") || "Total Attendances"}</p>
                <p className="text-2xl font-bold mt-1">{totalAttendances}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Date Picker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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

      {/* Tabs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="timetable" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              {t("timetable") || "Timetable"}
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Users className="w-4 h-4" />
              {t("markAttendance") || "Mark Attendance"}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              {t("attendanceHistory") || "Attendance History"}
            </TabsTrigger>
          </TabsList>

          {/* Timetable Tab */}
          <TabsContent value="timetable" className="mt-0">
            <div className="space-y-4">
              {weekSessionsData ? (
                <WeeklyTimeTable
                  sessions={weekSessionsData.data || []}
                  groups={groupsData?.data || []}
                  onSessionClick={handleSessionClickInTimetable}
                  showCreateButton={false}
                />
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Groups Column */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    {t("myGroups") || "My Groups"}
                  </CardTitle>
                  <CardDescription>
                    {t("groupsAssignedToYou") || "Groups assigned to you"}
                  </CardDescription>
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
                      {t("noGroupsAssigned") || "No groups assigned"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sessions Column */}
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {t("sessions") || "Sessions"}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(selectedDate), "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                    {selectedSession && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUploadDialogOpen(true)}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {t("uploadKonspekt") || "Upload Konspekt"}
                      </Button>
                    )}
                  </div>
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
                      {t("noSessionsForDate") || "No sessions for this date"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attendance Column */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {t("attendance") || "Attendance"}
                  </CardTitle>
                  <CardDescription>
                    {selectedSession
                      ? t("markStudentAttendance") || "Mark student attendance"
                      : t("selectSession") || "Select a session"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedSession ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("selectSessionToMark") || "Select a session to mark attendance"}
                    </div>
                  ) : studentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : studentsData?.data && studentsData.data.length > 0 ? (
                    <div className="space-y-3">
                      {studentsData.data.map((student: StudentWithDebtInfo) => {
                        const existingAttendance = existingAttendanceMap.get(
                          student.student_id
                        );
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
                                      {t("debt") || "Debt"}: {formatCurrency(student.debt_amount!)}
                                    </span>
                                  </div>
                                )}
                                {hasExistingAttendance && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      {t("attendanceMarked") || "Davomat olindi"}
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
                                  displayStatus === "present" ? "default" : "outline"
                                }
                                onClick={() =>
                                  handleMarkAttendance(student.student_id, "present")
                                }
                                className="flex-1 gap-1"
                                disabled={
                                  attendanceMutation.isPending || hasExistingAttendance
                                }
                              >
                                <CheckCircle className="w-4 h-4" />
                                {t("present") || "Present"}
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  displayStatus === "absent" ? "destructive" : "outline"
                                }
                                onClick={() =>
                                  handleMarkAttendance(student.student_id, "absent")
                                }
                                className="flex-1 gap-1"
                                disabled={
                                  attendanceMutation.isPending || hasExistingAttendance
                                }
                              >
                                <XCircle className="w-4 h-4" />
                                {t("absent") || "Absent"}
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  displayStatus === "late" ? "secondary" : "outline"
                                }
                                onClick={() =>
                                  handleMarkAttendance(student.student_id, "late")
                                }
                                className="gap-1"
                                disabled={
                                  attendanceMutation.isPending || hasExistingAttendance
                                }
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
                      {t("noStudentsInSession") || "No students in this session"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {t("myAttendanceHistory") || "My Attendance History"}
                </CardTitle>
                <CardDescription>
                  {t("allAttendancesMarked") || "All attendances you've marked"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myAttendancesData?.data && myAttendancesData.data.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("date") || "Date"}</TableHead>
                          <TableHead>{t("student") || "Student"}</TableHead>
                          <TableHead>{t("group") || "Group"}</TableHead>
                          <TableHead>{t("status") || "Status"}</TableHead>
                          <TableHead>{t("time") || "Time"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myAttendancesData.data.map((attendance: AttendanceRead) => (
                          <TableRow key={attendance.id}>
                            <TableCell>
                              {format(new Date(attendance.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="font-medium">
                              {t("studentId") || "Student"} #{attendance.student_id}
                            </TableCell>
                            <TableCell>
                              {groupsData?.data?.find(
                                (g) =>
                                  sessionsData?.data?.find(
                                    (s) => s.id === attendance.session_id
                                  )?.group_id === g.id
                              )?.name || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(attendance.status)}
                                <span className="capitalize">{attendance.status}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {attendance.marked_at
                                ? format(new Date(attendance.marked_at), "HH:mm")
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t("noAttendanceHistory") || "No attendance history yet"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Session Details Dialog */}
      <SessionDetailsDialog
        session={selectedSessionForDetails}
        group={groupsData?.data?.find((g) => g.id === selectedSessionForDetails?.group_id)}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      {/* Upload Konspekt Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t("uploadKonspekt") || "Upload Konspekt"}
            </DialogTitle>
            <DialogDescription>
              {t("uploadKonspektDescription") || "Upload a konspekt file for this session"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="konspekt-file">
                {t("selectFile") || "Select File"}
              </Label>
              <Input
                id="konspekt-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
              }}
              disabled={uploadKonspektMutation.isPending}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleUploadKonspekt}
              disabled={!selectedFile || uploadKonspektMutation.isPending}
            >
              {uploadKonspektMutation.isPending
                ? t("uploading") || "Uploading..."
                : t("upload") || "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
