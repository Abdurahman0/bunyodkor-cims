import { useState, useMemo, useEffect } from "react";
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
// FAQAT Select ni import qilamiz
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
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { toast } from "react-hot-toast";
import { useLanguageStore } from "@/store/languageStore";
import { Badge } from "@/components/ui/badge";
import { DonutChart, StatsCard } from "@/components/ui/charts";

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
  const [selectedStudentForStats, setSelectedStudentForStats] = useState<
    string | null
  >(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupRead | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<number, "present" | "absent" | "late">
  >({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSession(null);
    setAttendanceStatus({});
  }, [selectedDate]);

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["coach-groups"],
    queryFn: () => coachService.getCoachGroups(),
    select: (res) => {
      // normalize in case API wraps data twice: { data: { data: [...] } }
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
      if (Array.isArray((res as any).data)) return (res as any).data;
      return (res as any).data?.data || (res as any).data || [];
    },
  });

  const { data: allSessions, isLoading: allSessionsLoading } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: () => coachService.getCoachSessions({}),
    select: (res) => {
      if (!res) return [];
      if (Array.isArray((res as any).data)) return (res as any).data;
      return (res as any).data?.data || (res as any).data || [];
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
      select: (res) => res.data,
      enabled: !!selectedGroup,
    },
  );

  const { data: myAttendancesData, isLoading: myAttendancesLoading } = useQuery(
    {
      queryKey: ["my-attendances"],
      queryFn: () => coachService.getMyAttendances({}),
      select: (res) => res.data,
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

  const { data: studentStats, isLoading: studentStatsLoading } = useQuery({
    queryKey: ["student-stats", selectedStudentForStats],
    queryFn: () => {
      if (!selectedStudentForStats) return null;
      return coachService.getStudentAttendanceStats(
        Number(selectedStudentForStats),
      );
    },
    enabled: !!selectedStudentForStats,
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
    return new Map(allStudents.map((s) => [s.id, s]));
  }, [allStudents]);

  const sessionMap = useMemo(() => {
    if (!allSessions) return new Map();
    return new Map(allSessions.map((s) => [s.id, s]));
  }, [allSessions]);

  const groupMap = useMemo(() => {
    if (!groupsData) return new Map();
    return new Map(groupsData.map((g) => [g.id, g]));
  }, [groupsData]);

  // helper to get a student's display name from different possible API shapes
  const getStudentDisplayName = (item: any) => {
    if (!item) return t("unknownStudent") || "Unknown Student";
    // APIs may return either direct fields or nested `student` object
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
    // fallback to id-based label
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

  const studentStatsChartData = useMemo(() => {
    if (!studentStats) return [];
    return [
      {
        label: t("present"),
        value: studentStats.present_count,
        color: "hsl(142, 71%, 45%)",
      },
      {
        label: t("absent"),
        value: studentStats.absent_count,
        color: "hsl(0, 84%, 60%)",
      },
      {
        label: t("late"),
        value: studentStats.late_count,
        color: "hsl(48, 96%, 53%)",
      },
    ];
  }, [studentStats, t]);

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
                    {sessionsData.map((session) => {
                      const group = groupsData?.find(
                        (g) => Number(g.id) === Number(session.group_id),
                      );
                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedSession?.id === session.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <p className="font-semibold">
                            {group?.name || t("unknownGroup")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.topic}
                          </p>
                          <p className="text-sm font-mono mt-1">
                            {session.start_time} - {session.end_time}
                          </p>
                        </button>
                      );
                    })}
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
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <List className="w-5 h-5" />
                            {t("attendanceList") || "Attendance List"}
                          </CardTitle>
                          <CardDescription>
                            {selectedSession.topic} (
                            {
                              groupsData?.find(
                                (g) => g.id === selectedSession.group_id,
                              )?.name
                            }
                            )
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
                              studentsData.map((student) => (
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
                                        {" "}
                                        <CheckCircle className="w-4 h-4" />{" "}
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
                                        {" "}
                                        <Clock className="w-4 h-4" />{" "}
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
                                        {" "}
                                        <XCircle className="w-4 h-4" />{" "}
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
                    {groupsData.map((group) => (
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
                    ))}
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
                            groupStudentsData.map((student) => (
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
                            ))
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
                    myAttendancesData.map((attendance) => {
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
                {/* O'ZGARTIRILGAN SELECT */}
                <Select
                  value={selectedGroupForStats || ""}
                  onChange={(e) => setSelectedGroupForStats(e.target.value)}
                  className="w-full md:w-1/3"
                >
                  <option value="" disabled>
                    {t("selectGroup")}
                  </option>
                  {groupsData?.map((group) => (
                    <option key={group.id} value={group.id.toString()}>
                      {group.name}
                    </option>
                  ))}
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

            {selectedGroupForStats && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("studentStatistics")}</CardTitle>
                  {/* O'ZGARTIRILGAN SELECT */}
                  <Select
                    value={selectedStudentForStats || ""}
                    onChange={(e) => setSelectedStudentForStats(e.target.value)}
                    className="w-full md:w-1/3"
                  >
                    <option value="" disabled>
                      {t("selectStudent")}
                    </option>
                    {(() => {
                      const filtered = allStudents?.filter(
                        (s) =>
                          Number(s.group_id) === Number(selectedGroupForStats),
                      );
                      if (!filtered || filtered.length === 0) {
                        return (
                          <option value="" disabled>
                            {t("noStudentsInGroup")}
                          </option>
                        );
                      }

                      return filtered.map((student) => (
                        <option key={student.id} value={student.id.toString()}>
                          {student.first_name} {student.last_name}
                        </option>
                      ));
                    })()}
                  </Select>
                </CardHeader>
                {studentStatsLoading && (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                )}
                {studentStats && (
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DonutChart
                      data={studentStatsChartData}
                      centerLabel={t("attendanceRate")}
                      centerValue={`${studentStats.attendance_rate}%`}
                    />
                    <div className="space-y-4">
                      <StatsCard
                        title={t("totalSessions")}
                        value={studentStats.total_sessions}
                      />
                      <StatsCard
                        title={t("present")}
                        value={studentStats.present_count}
                      />
                      <StatsCard
                        title={t("absent")}
                        value={studentStats.absent_count}
                      />
                      <StatsCard
                        title={t("late")}
                        value={studentStats.late_count}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("uploadKonspekt")}</DialogTitle>
            <DialogDescription>
              {t("uploadKonspektDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                {selectedFile.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleUploadKonspekt}
              disabled={!selectedFile || uploadKonspektMutation.isPending}
            >
              {uploadKonspektMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                t("upload")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
