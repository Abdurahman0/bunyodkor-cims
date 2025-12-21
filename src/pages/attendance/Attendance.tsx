import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  Search,
  Download,
} from "lucide-react";
import { attendanceService, studentService, groupService } from "@/services/api.service";
import type { AttendanceRead } from "@/types/api";
import { format } from "date-fns";
import { useLanguageStore } from "@/store/languageStore";
import toast from "react-hot-toast";

export default function Attendance() {
  const { t } = useLanguageStore();
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState(
    format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchStudent, setSearchStudent] = useState("");

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["all-attendances", page, fromDate, toDate],
    queryFn: () =>
      attendanceService.getAllAttendances({
        from_date: fromDate,
        to_date: toDate,
        page,
        page_size: 20,
      }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ["groups-list-all"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
  });

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
    return student?.full_name || `ID: ${id}`;
  };

  const getGroupName = (id: number) =>
    groupsData?.data?.find((g) => g.id === id)?.name || `Group #${id}`;

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

  const handleExport = async () => {
    try {
      toast.loading(t("exportingData") || "Exporting data...");

      // For now, create a simple CSV export
      const attendances = attendanceData?.data || [];
      const csvHeader = "Date,Student,Group,Session,Status,Comment\n";
      const csvRows = attendances
        .map((a: AttendanceRead) => {
          const studentName = getStudentName(a.student_id);
          const date = format(new Date(a.created_at), "yyyy-MM-dd HH:mm");
          const status = getStatusLabel(a.status);
          const comment = a.comment || "";
          return `"${date}","${studentName}","Session #${a.session_id}","${status}","${comment}"`;
        })
        .join("\n");

      const csvContent = csvHeader + csvRows;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(t("exportedSuccessfully") || "Data exported successfully!");
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(t("errorExportingData") || "Error exporting data");
    }
  };

  // Filter attendances by student search
  const filteredAttendances = (attendanceData?.data || []).filter(
    (attendance: AttendanceRead) => {
      if (!searchStudent) return true;
      const studentName = getStudentName(attendance.student_id).toLowerCase();
      return studentName.includes(searchStudent.toLowerCase());
    }
  );

  // Calculate statistics
  const stats = {
    total: filteredAttendances.length,
    present: filteredAttendances.filter((a: AttendanceRead) => a.status === "present").length,
    absent: filteredAttendances.filter((a: AttendanceRead) => a.status === "absent").length,
    late: filteredAttendances.filter((a: AttendanceRead) => a.status === "late").length,
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
              {t("manageAttendanceRecords") || "Manage and view attendance records"}
            </p>
          </div>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          {t("export") || "Export"}
        </Button>
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
            <CardTitle className="text-lg">{t("filters") || "Filters"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <TableHead>{t("date") || "Date"}</TableHead>
                <TableHead>{t("student") || "Student"}</TableHead>
                <TableHead>{t("session") || "Session"}</TableHead>
                <TableHead>{t("status") || "Status"}</TableHead>
                <TableHead>{t("comment") || "Comment"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendances.length > 0 ? (
                filteredAttendances.map((attendance: AttendanceRead) => (
                  <TableRow key={attendance.id}>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(attendance.created_at), "yyyy-MM-dd")}
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
                        Session #{attendance.session_id}
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
                ))
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
          {attendanceData?.meta && attendanceData.meta.total_pages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={attendanceData.meta.total_pages}
              totalItems={attendanceData.meta.total}
              pageSize={20}
              onPageChange={setPage}
            />
          )}
        </Card>
      </motion.div>
    </div>
  );
}
