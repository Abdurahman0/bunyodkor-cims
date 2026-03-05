/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type SetStateAction,
  type JSXElementConstructor,
  type Key,
  type ReactElement,
  type ReactNode,
  type ReactPortal,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Select } from "@/components/ui/select";
import {
  coachService,
  groupService,
  studentService,
} from "@/services/api.service";
import type {
  GroupRead,
  SessionRead,
  AttendanceCreateRequest,
} from "@/types/api";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Upload,
  History,
  GraduationCap,
  List,
  BarChart2,
  MapPin,
  AlignLeft,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { toast } from "react-hot-toast";
import { useLanguageStore } from "@/store/languageStore";
import { Badge } from "@/components/ui/badge";
import { DonutChart, StatsCard } from "@/components/ui/charts";

const normalizeSessionForUi = (
  session:
    | (Partial<SessionRead> & {
        notes?: string | null;
        comment?: string | null;
        location?: string | null;
      })
    | null
    | undefined,
) => {
  if (!session) return null;

  const normalizedDescription =
    session.description ?? session.notes ?? session.comment ?? "";
  const normalizedStation = session.station ?? session.location ?? "";

  return {
    ...session,
    description: normalizedDescription,
    station: normalizedStation,
    location: session.location ?? normalizedStation,
  } as SessionRead;
};

export default function CoachPanel() {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(
    null,
  );
  const [selectedGroupForStats, setSelectedGroupForStats] = useState<
    string | null
  >(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupRead | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<number, "present" | "absent" | "late">
  >({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSession(null);
    setAttendanceStatus({});
  }, [selectedDate]);

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["coach-groups"],
    queryFn: () => coachService.getCoachGroups(),
    select: (res) => {
      if (!res) return [];
      if (Array.isArray((res as any).data)) return (res as any).data;
      return (res as any).data?.data || (res as any).data || [];
    },
  });

  const { data: allStudents, isLoading: allStudentsLoading } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => studentService.getStudents({ page_size: 10000 }),
    select: (res) => {
      if (!res) return [];
      if (Array.isArray((res as any).data)) return (res as any).data;
      return (res as any).data?.data || (res as any).data || [];
    },
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["coach-sessions", selectedDate],
    queryFn: () => coachService.getCoachSessions({ date: selectedDate }),
    select: (res) => {
      if (!res) return [];
      const rawSessions = Array.isArray((res as any).data)
        ? (res as any).data
        : (res as any).data?.data || (res as any).data || [];
      if (!Array.isArray(rawSessions)) return [];
      return rawSessions
        .map((session) => normalizeSessionForUi(session))
        .filter(Boolean) as SessionRead[];
    },
  });

  const { data: allSessions, isLoading: allSessionsLoading } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: () => coachService.getCoachSessions({}),
    select: (res) => {
      if (!res) return [];
      const rawSessions = Array.isArray((res as any).data)
        ? (res as any).data
        : (res as any).data?.data || (res as any).data || [];
      if (!Array.isArray(rawSessions)) return [];
      return rawSessions
        .map((session) => normalizeSessionForUi(session))
        .filter(Boolean) as SessionRead[];
    },
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["session-students", selectedSession?.id],
    queryFn: () => {
      if (!selectedSession) return null;
      return coachService
        .getSessionStudentsWithDebt(selectedSession.id)
        .then((res) => res.data);
    },
    enabled: !!selectedSession,
  });

  const { data: groupStudentsData, isLoading: groupStudentsLoading } = useQuery(
    {
      queryKey: ["group-students", selectedGroup?.id],
      queryFn: () => {
        if (!selectedGroup) return Promise.resolve({ data: [] });
        return groupService.getGroupStudents(selectedGroup.id);
      },
      select: (res: any) => res.data,
      enabled: !!selectedGroup,
    },
  );

  const { data: myAttendancesData, isLoading: myAttendancesLoading } = useQuery(
    {
      queryKey: ["my-attendances"],
      queryFn: () => coachService.getMyAttendances({}),
      select: (res: any) => res.data,
    },
  );

  const { data: groupStats, isLoading: groupStatsLoading } = useQuery({
    queryKey: ["group-stats", selectedGroupForStats],
    queryFn: () => {
      if (!selectedGroupForStats) return null;
      return coachService.getGroupAttendanceStats(
        Number(selectedGroupForStats),
      );
    },
    enabled: !!selectedGroupForStats,
    select: (res) => res?.data,
  });

  const bulkAttendanceMutation = useMutation({
    mutationFn: (data: {
      session_id: number;
      attendances: AttendanceCreateRequest[];
    }) => coachService.bulkAttendance(data),
    onSuccess: () => {
      toast.success(
        t("attendanceSubmittedSuccessfully") ||
          "Attendance submitted successfully",
      );
      setAttendanceStatus({});
      queryClient.invalidateQueries({
        queryKey: ["session-students", selectedSession?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["my-attendances"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail ||
          t("failedToSubmitAttendance") ||
          "Failed to submit attendance",
      );
    },
  });

  const uploadKonspektMutation = useMutation({
    mutationFn: ({ sessionId, file }: { sessionId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return coachService.uploadKonspekt(sessionId, formData);
    },
    onSuccess: () => {
      toast.success(t("konspektUploaded") || "Konspekt uploaded successfully!");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({
        queryKey: ["coach-sessions", selectedDate],
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          t("errorUploadingKonspekt") ||
          "Error uploading konspekt",
      );
    },
  });

  const handleDateChange = (days: number) => {
    const newDate =
      days > 0
        ? addDays(new Date(selectedDate), days)
        : subDays(new Date(selectedDate), Math.abs(days));
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const handleSessionSelect = async (session: SessionRead) => {
    const normalizedSession = normalizeSessionForUi(session) || session;
    setSelectedSession(normalizedSession);

    try {
      const response = await coachService.getSessionDetails(session.id);

      const rawSession =
        (response as { data?: Partial<SessionRead> }).data &&
        typeof (response as { data?: Partial<SessionRead> }).data === "object"
          ? (response as { data?: Partial<SessionRead> }).data
          : (response as Partial<SessionRead>);

      const normalizedDetails = normalizeSessionForUi(rawSession);
      if (normalizedDetails) {
        setSelectedSession((prev) => {
          if (!prev || prev.id !== session.id) return prev;
          return { ...prev, ...normalizedDetails };
        });
      }
    } catch {
      // Keep list payload as fallback if details endpoint fails.
    }
  };

  const handleMarkAttendance = (
    studentId: number,
    status: "present" | "absent" | "late",
  ) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmitAttendance = () => {
    if (!selectedSession || Object.keys(attendanceStatus).length === 0) {
      toast.error(
        t("noAttendanceChangesToSubmit") || "No attendance changes to submit",
      );
      return;
    }
    const attendances: AttendanceCreateRequest[] = Object.entries(
      attendanceStatus,
    ).map(([student_id, status]) => ({
      student_id: parseInt(student_id, 10),
      status,
      comment: "",
    }));
    bulkAttendanceMutation.mutate({
      session_id: selectedSession.id,
      attendances,
    });
  };

  const handleUploadKonspekt = () => {
    if (!selectedSession || !selectedFile) {
      toast.error(t("pleaseSelectFile") || "Please select a file");
      return;
    }
    uploadKonspektMutation.mutate({
      sessionId: selectedSession.id,
      file: selectedFile,
    });
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";

  const getStatusBadge = (status: "present" | "absent" | "late") => {
    switch (status) {
      case "present":
        return (
          <Badge variant="default" className="bg-green-500">
            {t("present")}
          </Badge>
        );
      case "absent":
        return <Badge variant="destructive">{t("absent")}</Badge>;
      case "late":
        return <Badge variant="secondary">{t("late")}</Badge>;
      default:
        return null;
    }
  };

  const studentMap = useMemo(() => {
    if (!allStudents) return new Map();
    return new Map(allStudents.map((s: { id: any }) => [s.id, s]));
  }, [allStudents]);

  const sessionMap = useMemo(() => {
    if (!allSessions) return new Map();
    return new Map(allSessions.map((s: { id: any }) => [s.id, s]));
  }, [allSessions]);

  const groupMap = useMemo(() => {
    if (!groupsData) return new Map();
    return new Map(groupsData.map((g: { id: any }) => [g.id, g]));
  }, [groupsData]);

  const getStudentDisplayName = (item: any) => {
    if (!item) return t("unknownStudent") || "Unknown Student";
    const first =
      item.first_name ||
      item.firstName ||
      item.student?.first_name ||
      item.student?.firstName;
    const last =
      item.last_name ||
      item.lastName ||
      item.student?.last_name ||
      item.student?.lastName;
    if (first || last) return `${first || ""} ${last || ""}`.trim();
    if (item.student_id || item.id) return `#${item.student_id || item.id}`;
    return t("unknownStudent") || "Unknown Student";
  };

  const groupStatsChartData = useMemo(() => {
    if (!groupStats) return [];
    return [
      {
        label: t("present"),
        value: groupStats.present_count,
        color: "hsl(142, 71%, 45%)",
      },
      {
        label: t("absent"),
        value: groupStats.absent_count,
        color: "hsl(0, 84%, 60%)",
      },
      {
        label: t("late"),
        value: groupStats.late_count,
        color: "hsl(48, 96%, 53%)",
      },
    ];
  }, [groupStats, t]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t("coachPanel") || "Coach Panel"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("manageSessionsAndAttendance") ||
            "Manage your sessions and student attendance."}
        </p>
      </motion.div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="attendance">
            <Calendar className="w-4 h-4 mr-2" />
            {t("attendance") || "Attendance"}
          </TabsTrigger>
          <TabsTrigger value="groups">
            <GraduationCap className="w-4 h-4 mr-2" />
            {t("myGroups") || "My Groups"}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            {t("history") || "History"}
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart2 className="w-4 h-4 mr-2" />
            {t("statistics") || "Statistics"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateChange(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border bg-background text-foreground"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateChange(1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Card className="lg:col-span-1 h-full">
              <CardHeader>
                <CardTitle>
                  {format(new Date(selectedDate), "MMMM d, yyyy")}
                </CardTitle>
                <CardDescription>
                  {t("todaysSessions") || "Today's training sessions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : sessionsData && sessionsData.length > 0 ? (
                  <div className="space-y-3">
                    {sessionsData.map(
                      (session: SetStateAction<SessionRead | null> | any) => {
                        const group = groupsData?.find(
                          (g: { id: any }) =>
                            Number(g.id) === Number(session.group_id),
                        );
                        return (
                          <button
                            key={session.id}
                            onClick={() => void handleSessionSelect(session)}
                            className={`w-full text-left p-4 rounded-lg border transition-all ${
                              selectedSession?.id === session.id
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-start justify-between">
                                <p className="font-bold text-slate-900 dark:text-slate-100">
                                  {group?.name || t("unknownGroup")}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {session.topic}
                              </p>
                              {session.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                                  {session.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs font-mono font-medium">
                                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  {session.start_time} - {session.end_time}
                                </span>
                              {(session.location || session.station) && (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {session.location || session.station}
                                </span>
                              )}
                              </div>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p>
                      {t("noSessionsForDate") || "No sessions for this date."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedSession ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <List className="w-5 h-5" />
                            {t("attendanceList") || "Attendance List"}
                          </CardTitle>
                          <CardDescription className="space-y-3 mt-3">
                            <div className="flex flex-wrap items-center gap-2 text-base font-medium text-slate-800 dark:text-slate-200">
                              <span>{selectedSession.topic}</span>
                              <span className="text-slate-400">•</span>
                              <span>
                                {
                                  groupsData?.find(
                                    (g: { id: number }) =>
                                      g.id === selectedSession.group_id,
                                  )?.name
                                }
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm font-medium">
                              <span className="flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                <Clock className="w-4 h-4" />
                                {selectedSession.start_time} -{" "}
                                {selectedSession.end_time}
                              </span>
                              {(selectedSession.location ||
                                selectedSession.station) && (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                                  <MapPin className="w-4 h-4" />
                                  {selectedSession.location ||
                                    selectedSession.station}
                                </span>
                              )}
                            </div>

                            {selectedSession.description && (
                              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                {selectedSession.description}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUploadDialogOpen(true)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t("uploadKonspekt") || "Upload Konspekt"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("student")}</TableHead>
                              <TableHead>{t("debtStatus")}</TableHead>
                              <TableHead className="text-right">
                                {t("markAttendance")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentsLoading ? (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  className="h-24 text-center"
                                >
                                  <Loader2 className="mx-auto animate-spin text-primary" />
                                </TableCell>
                              </TableRow>
                            ) : studentsData && studentsData.length > 0 ? (
                              studentsData.map((student: any) => (
                                <TableRow
                                  key={student.student_id || student.id}
                                >
                                  <TableCell className="font-medium">
                                    {getStudentDisplayName(student)}
                                  </TableCell>
                                  <TableCell>
                                    {student.has_debt ? (
                                      <Badge
                                        variant="destructive"
                                        className="gap-1.5"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                        {formatCurrency(student.debt_amount)}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">
                                        {t("noDebt")}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div
                                      className="inline-flex rounded-md shadow-sm"
                                      role="group"
                                    >
                                      <Button
                                        size="sm"
                                        variant={
                                          attendanceStatus[
                                            student.student_id
                                          ] === "present"
                                            ? "default"
                                            : "outline"
                                        }
                                        className="rounded-r-none"
                                        onClick={() =>
                                          handleMarkAttendance(
                                            student.student_id,
                                            "present",
                                          )
                                        }
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={
                                          attendanceStatus[
                                            student.student_id
                                          ] === "late"
                                            ? "secondary"
                                            : "outline"
                                        }
                                        className="rounded-none"
                                        onClick={() =>
                                          handleMarkAttendance(
                                            student.student_id,
                                            "late",
                                          )
                                        }
                                      >
                                        <Clock className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={
                                          attendanceStatus[
                                            student.student_id
                                          ] === "absent"
                                            ? "destructive"
                                            : "outline"
                                        }
                                        className="rounded-l-none"
                                        onClick={() =>
                                          handleMarkAttendance(
                                            student.student_id,
                                            "absent",
                                          )
                                        }
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  className="h-24 text-center"
                                >
                                  {t("noStudentsInSession") ||
                                    "No students in this session."}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button
                        onClick={handleSubmitAttendance}
                        disabled={bulkAttendanceMutation.isPending}
                      >
                        {bulkAttendanceMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {t("submitAttendance") || "Submit Attendance"}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-full">
                  <Users className="w-12 h-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {t("selectSession")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("selectSessionToViewStudents") ||
                      "Select a session from the list to view students and mark attendance."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="groups">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Card className="lg:col-span-1 h-full">
              <CardHeader>
                <CardTitle>{t("myGroups")}</CardTitle>
                <CardDescription>{t("groupsAssignedToYou")}</CardDescription>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : groupsData && groupsData.length > 0 ? (
                  <div className="space-y-3">
                    {groupsData.map(
                      (group: SetStateAction<GroupRead | null> | any) => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroup(group)}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedGroup?.id === group.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <p className="font-semibold">{group.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {group.schedule_days} {group.schedule_time}
                          </p>
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p>{t("noGroupsAssigned")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedGroup ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedGroup.name}</CardTitle>
                      <CardDescription>{t("studentsInGroup")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("studentName")}</TableHead>
                            <TableHead>{t("dateOfBirth")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupStudentsLoading ? (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className="h-24 text-center"
                              >
                                <Loader2 className="mx-auto animate-spin text-primary" />
                              </TableCell>
                            </TableRow>
                          ) : groupStudentsData &&
                            groupStudentsData.length > 0 ? (
                            groupStudentsData.map(
                              (student: {
                                id: Key | null | undefined;
                                date_of_birth: string | number | Date;
                              }) => (
                                <TableRow key={student.id}>
                                  <TableCell className="font-medium">
                                    {getStudentDisplayName(student)}
                                  </TableCell>
                                  <TableCell>
                                    {format(
                                      new Date(student.date_of_birth),
                                      "dd.MM.yyyy",
                                    )}
                                  </TableCell>
                                </TableRow>
                              ),
                            )
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className="h-24 text-center"
                              >
                                {t("noStudentsInGroup")}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-full">
                  <GraduationCap className="w-12 h-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {t("selectGroup")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("selectGroupToViewStudents")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t("attendanceHistory")}</CardTitle>
              <CardDescription>
                {t("allAttendancesMarkedByYou")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("student")}</TableHead>
                    <TableHead>{t("group")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAttendancesLoading ||
                  allStudentsLoading ||
                  allSessionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="mx-auto animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : myAttendancesData && myAttendancesData.length > 0 ? (
                    myAttendancesData.map((attendance: any) => {
                      const student = studentMap.get(attendance.student_id);
                      const session = sessionMap.get(attendance.session_id);
                      const group = session
                        ? groupMap.get(session.group_id)
                        : null;
                      return (
                        <TableRow key={attendance.id}>
                          <TableCell>
                            {format(
                              new Date(attendance.created_at),
                              "dd.MM.yyyy HH:mm",
                            )}
                          </TableCell>
                          <TableCell>
                            {student
                              ? `${student.first_name} ${student.last_name}`
                              : t("unknownStudent")}
                          </TableCell>
                          <TableCell>
                            {group ? group.name : t("unknownGroup")}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(attendance.status)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        {t("noAttendanceHistory")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics")}</CardTitle>
                <CardDescription>{t("selectGroupToSeeStats")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedGroupForStats || ""}
                  onChange={(e) => {
                    setSelectedGroupForStats(e.target.value);
                  }}
                >
                  <option value="" disabled>
                    {t("selectGroup")}
                  </option>
                  {Array.isArray(groupsData) && (groupsData as any[]).map(
                    (group: {
                      id: Key | null | undefined;
                      name: ReactNode;
                    }) => (
                      <option
                        key={group.id}
                        value={(group.id as any).toString()}
                      >
                        {group.name}
                      </option>
                    ),
                  )}
                </Select>
              </CardContent>
            </Card>

            {groupStatsLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-primary" />
              </div>
            )}

            {groupStats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {groupMap.get(Number(selectedGroupForStats))?.name} -{" "}
                      {t("groupAttendance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DonutChart
                      data={groupStatsChartData}
                      centerLabel={t("attendanceRate")}
                      centerValue={`${groupStats.attendance_rate}%`}
                    />
                    <div className="space-y-4">
                      <StatsCard
                        title={t("totalSessions")}
                        value={groupStats.total_sessions}
                      />
                      <StatsCard
                        title={t("present")}
                        value={groupStats.present_count}
                      />
                      <StatsCard
                        title={t("absent")}
                        value={groupStats.absent_count}
                      />
                      <StatsCard
                        title={t("late")}
                        value={groupStats.late_count}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open && !uploadKonspektMutation.isPending) {
            clearSelectedFile();
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/70 dark:bg-slate-900/40">
            <DialogTitle>{t("uploadKonspekt")}</DialogTitle>
            <DialogDescription className="mt-1">
              {t("uploadKonspektDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            {selectedSession && (
              <div className="rounded-lg border bg-slate-50/60 dark:bg-slate-900/30 p-4 space-y-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedSession.topic || t("attendanceList")}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {groupsData?.find(
                    (g: { id: number }) => g.id === selectedSession.group_id,
                  )?.name || t("unknownGroup")}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedSession.start_time} - {selectedSession.end_time}
                  </span>
                  {(selectedSession.location || selectedSession.station) && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedSession.location || selectedSession.station}
                    </span>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              id="konspekt-file-upload"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />

            <label
              htmlFor="konspekt-file-upload"
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                selectedFile
                  ? "border-primary/40 bg-primary/5"
                  : "border-slate-300 dark:border-slate-700 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900/20"
              }`}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {selectedFile
                  ? "Fayl tanlandi"
                  : "PDF yoki DOC faylni tanlang"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Klik qiling va faylni yuklang (PDF, DOC, DOCX)
              </p>
            </label>

            {selectedFile ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(selectedFile.size)}
                    {selectedFile.type ? ` • ${selectedFile.type}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={clearSelectedFile}
                  disabled={uploadKonspektMutation.isPending}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/20 p-3 text-xs text-slate-600 dark:text-slate-400">
                Konspekt fayli darsga biriktiriladi va keyin ko'rish/yuklab olish
                uchun saqlanadi.
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-slate-50/70 dark:bg-slate-900/40">
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploadKonspektMutation.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleUploadKonspekt}
              disabled={!selectedFile || uploadKonspektMutation.isPending}
              className="min-w-28"
            >
              {uploadKonspektMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("upload") || "Yuklash"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {t("upload") || "Yuklash"}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
