import { useState, useMemo } from "react";
import { format } from "date-fns";

const DEFAULT_TO = format(new Date(), "yyyy-MM-dd");
const DEFAULT_FROM = format(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  "yyyy-MM-dd"
);
import { useQuery, useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatFullName, formatNameParts } from "@/lib/name-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableEmpty,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  Search,
} from "lucide-react";
import {
  attendanceService,
  headCoachService,
  groupService,
  studentService,
} from "@/services/api.service";
import type { AttendanceRead, SessionRead } from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";

export default function Attendance() {
  const { t } = useLanguageStore();
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("all");

  const { data: groupsFilterData } = useQuery({
    queryKey: ["attendance-groups-filter"],
    queryFn: async () => {
      const firstPage = await groupService.getGroups({ page: 1, page_size: 100 });
      const totalPages = firstPage.meta?.total_pages || 1;

      if (totalPages <= 1) {
        return firstPage.data || [];
      }

      const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, idx) =>
          groupService.getGroups({ page: idx + 2, page_size: 100 }),
        ),
      );

      return [
        ...(firstPage.data || []),
        ...restPages.flatMap((response) => response.data || []),
      ];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: [
      "all-attendances",
      page,
      fromDate,
      toDate,
      selectedGroupId,
    ],
    queryFn: () =>
      attendanceService.getAllAttendances({
        from_date: fromDate,
        to_date: toDate,
        group_id:
          selectedGroupId === "all" ? undefined : Number(selectedGroupId),
        page,
        page_size: 20,
      }),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions-for-attendance", fromDate, toDate, selectedGroupId],
    queryFn: async () => {
      const firstPage = await headCoachService.getAllSessions({
        from_date: fromDate,
        to_date: toDate,
        group_id:
          selectedGroupId === "all" ? undefined : Number(selectedGroupId),
        page: 1,
        page_size: 100,
      });

      const totalPages = firstPage.meta?.total_pages || 1;
      if (totalPages <= 1) {
        return firstPage.data || [];
      }

      const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, idx) =>
          headCoachService.getAllSessions({
            from_date: fromDate,
            to_date: toDate,
            group_id:
              selectedGroupId === "all" ? undefined : Number(selectedGroupId),
            page: idx + 2,
            page_size: 100,
          }),
        ),
      );

      return [
        ...(firstPage.data || []),
        ...restPages.flatMap((response) => response.data || []),
      ];
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const sessionsMap = useMemo(() => {
    const map = new Map<number, SessionRead>();
    (sessionsData || []).forEach((session) => {
      if (session?.id) {
        map.set(session.id, session);
      }
    });
    return map;
  }, [sessionsData]);

  const groupFilterOptions = useMemo(
    () => [
      { value: "all", label: t("allGroups") || "All groups" },
      ...(groupsFilterData || []).map((group) => ({
        value: String(group.id),
        label: group.name,
      })),
    ],
    [groupsFilterData, t],
  );

  const truncateTopic = (topic: string) => {
    const words = topic.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 3) return topic;
    return `${words.slice(0, 3).join(" ")}...`;
  };

  const getSessionLabel = (sessionId: number) => {
    const topic = sessionsMap.get(sessionId)?.topic;
    if (!topic) return `Session #${sessionId}`;
    return truncateTopic(topic);
  };

  // Extract unique student IDs from attendance data
  const uniqueStudentIds = useMemo(() => {
    if (!attendanceData?.data) return [];
    const ids = attendanceData.data.map((a) => a.student_id);
    return [...new Set(ids)]; // Remove duplicates
  }, [attendanceData]);

  // Fetch individual students using their IDs
  const studentQueries = useQueries({
    queries: uniqueStudentIds.map((studentId) => ({
      queryKey: ["student", studentId],
      queryFn: () => studentService.getStudent(studentId),
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    })),
  });

  // Create a map of student ID to student data for quick lookup
  const studentsMap = useMemo(() => {
    const map = new Map();
    studentQueries.forEach((query) => {
      if (query.data?.data) {
        map.set(query.data.data.id, query.data.data);
      }
    });
    return map;
  }, [studentQueries]);

  const getStudentName = (id: number) => {
    const student = studentsMap.get(id);
    if (!student) return "";
    // Some endpoints return `full_name`, others return `first_name` / `last_name`.
    const s = student as unknown as {
      full_name?: string;
      first_name?: string;
      last_name?: string;
    };
    const full =
      formatFullName(s.full_name) ||
      formatNameParts(s.last_name, s.first_name);
    return String(full).trim();
  };

  // group lookup not needed here; remove unused helper to avoid linter warnings

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present":
        return t("present");
      case "absent":
        return t("absent");
      case "late":
        return t("late");
      default:
        return status;
    }
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

  // Filter attendances by student search
  const filteredAttendances = (attendanceData?.data || []).filter(
    (attendance: AttendanceRead) => {
      if (!searchStudent) return true;
      const studentName = String(
        getStudentName(attendance.student_id)
      ).toLowerCase();
      return studentName.includes(searchStudent.toLowerCase());
    }
  );

  // Calculate statistics
  const stats = {
    total: filteredAttendances.length,
    present: filteredAttendances.filter(
      (a: AttendanceRead) => a.status === "present"
    ).length,
    absent: filteredAttendances.filter(
      (a: AttendanceRead) => a.status === "absent"
    ).length,
    late: filteredAttendances.filter((a: AttendanceRead) => a.status === "late")
      .length,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t("attendance") || "Attendance"}
            </h1>
            <p className="text-muted-foreground">
              {t("manageAttendanceRecords") ||
                "Manage and view attendance records"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalRecords") || "Total Records"}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("present")}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.present}
                </p>
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
                <p className="text-sm text-muted-foreground">{t("absent")}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.absent}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("late")}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.late}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
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
          <CardHeader className="border-b border-border p-4">
            <CardTitle className="text-lg">
              {t("filters") || "Filters"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(20rem,1.35fr)]">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t("fromDate") || "From Date"}
                </label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t("toDate") || "To Date"}
                </label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t("searchStudent") || "Search Student"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchByName") || "Search by name"}
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t("group") || "Group"}
                </label>
                <SearchableSelect
                  value={selectedGroupId}
                  onValueChange={(value) => {
                    setSelectedGroupId(value);
                    setPage(1);
                  }}
                  options={groupFilterOptions}
                  placeholder={t("allGroups") || "All groups"}
                  searchPlaceholder={`${t("search")}...`}
                  emptyText={t("noDataFound")}
                  triggerClassName="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border p-4">
            <CardTitle className="text-lg">
              {t("attendanceRecords") || "Attendance Records"}
            </CardTitle>
          </CardHeader>
          <Table isLoading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("date") || "Date"}</TableHead>
                <TableHead>{t("student") || "Student"}</TableHead>
                <TableHead>{t("session") || "Session"}</TableHead>
                <TableHead>{t("status") || "Status"}</TableHead>
                <TableHead>{t("comment") || "Comment"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendances.length > 0 ? (
                filteredAttendances.map(
                  (attendance: AttendanceRead, idx: number) => (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        <p className="font-medium">
                          {(page - 1) * 20 + idx + 1}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(
                            new Date(attendance.created_at),
                            "yyyy-MM-dd"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(attendance.created_at), "HH:mm")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {getStudentName(attendance.student_id)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {getSessionLabel(attendance.session_id)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(attendance.status)}
                          <span>{getStatusLabel(attendance.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {attendance.comment || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  )
                )
              ) : (
                <TableEmpty
                  icon={<AlertTriangle className="w-12 h-12" />}
                  title={t("noAttendanceRecords") || "No attendance records"}
                  description={
                    t("noRecordsForPeriod") ||
                    "No records found for the selected period"
                  }
                />
              )}
            </TableBody>
          </Table>
          {/* Ensure meta is available before rendering pagination */}
          {(attendanceData?.meta?.total_pages ?? 0) > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={attendanceData!.meta!.total_pages}
              totalItems={attendanceData!.meta!.total}
              pageSize={20}
              onPageChange={setPage}
            />
          )}
        </Card>
      </motion.div>
    </div>
  );
}
