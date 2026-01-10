import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users as UsersIcon,
  Calendar,
  Filter,
  Download,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { studentService } from "@/services/api.service";
import type { StudentRead } from "@/types/api";
import { StudentDialog } from "./StudentDialog";
import { StudentWithContractDialog } from "./StudentWithContractDialog";
import { exportStudents } from "@/lib/export-utils";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguageStore } from "@/store/languageStore";
import { useGroupsStore } from "@/store/groupsStore";

export default function Students() {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [archiveYearFilter, setArchiveYearFilter] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRead | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCombinedDialogOpen, setIsCombinedDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentRead | null>(
    null
  );
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(search, 500);

  // Use global groups store
  const {
    groupsData,
    isLoading: isLoadingGroups,
    fetchGroups,
  } = useGroupsStore();

  // Flatten grouped data into single array
  const allGroups = groupsData?.flatMap((yearGroup) => yearGroup.groups) || [];

  // Fetch groups on component mount if not already loaded
  useEffect(() => {
    if (!groupsData && !isLoadingGroups) {
      console.log("[STUDENTS] No groups data, fetching from store...");
      fetchGroups();
    } else if (groupsData) {
      console.log("[STUDENTS] Groups already loaded:", groupsData);
      console.log("[STUDENTS] Flattened groups:", allGroups);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsData, isLoadingGroups, fetchGroups]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "students",
      page,
      pageSize,
      debouncedSearch,
      statusFilter,
      groupFilter,
      archiveYearFilter,
    ],
    queryFn: () =>
      studentService.getStudents({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        group_id: groupFilter ? parseInt(groupFilter, 10) : undefined,
        archive_year: archiveYearFilter
          ? parseInt(archiveYearFilter, 10)
          : undefined,
      }),
  });

  // Get total count for each status (independent of pagination)
  const { data: activeCountData } = useQuery({
    queryKey: ["students-count", "active"],
    queryFn: () =>
      studentService.getStudents({ status: "active", page: 1, page_size: 1 }),
  });

  const { data: suspendedCountData } = useQuery({
    queryKey: ["students-count", "suspended"],
    queryFn: () =>
      studentService.getStudents({
        status: "suspended",
        page: 1,
        page_size: 1,
      }),
  });

  const { data: droppedCountData } = useQuery({
    queryKey: ["students-count", "dropped"],
    queryFn: () =>
      studentService.getStudents({ status: "dropped", page: 1, page_size: 1 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentService.deleteStudent(id),
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates after cascade delete
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-count"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(t("studentDeleted"));
    },
    onError: () => {
      toast.error(t("failedToDeleteStudent"));
    },
  });

  const handleDelete = (student: StudentRead) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      deleteMutation.mutate(studentToDelete.id);
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleEdit = (student: StudentRead) => {
    setSelectedStudent(student);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedStudent(null);
    setIsCombinedDialogOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setGroupFilter("");
    setArchiveYearFilter("");
  };

  const hasActiveFilters =
    search || statusFilter || groupFilter || archiveYearFilter;

  const handleExport = () => {
    try {
      if (!data?.data || data.data.length === 0) {
        toast.error(t("noStudentsToExport"));
        return;
      }
      exportStudents(data.data);
      toast.success(t("studentsExported"));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error(t("failedToExportStudents"));
    }
  };

  const handleExportComprehensiveData = async () => {
    try {
      toast.loading(t("exportingData") || "Exporting data...");

      // Get date range for current year
      const currentYear = new Date().getFullYear();
      const fromDate = `${currentYear}-01-01`;
      const toDate = new Date().toISOString().split("T")[0];

      const blob = await studentService.exportComprehensiveStudentData({
        from_date: fromDate,
        to_date: toDate,
        status: statusFilter || undefined,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all_students_comprehensive_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
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

  const getStatusBadge = (status: StudentRead["status"]) => {
    const variants: Record<string, { bg: string; text: string }> = {
      active: {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-700 dark:text-emerald-400",
      },
      graduated: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-700 dark:text-purple-400",
      },
      dropped: {
        bg: "bg-rose-100 dark:bg-rose-900/30",
        text: "text-rose-700 dark:text-rose-400",
      },
      suspended: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-400",
      },
    };
    const variant = variants[status!] || variants.active;
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0 font-medium`}>
        {t(status!)}
      </Badge>
    );
  };

  const stats = {
    total: data?.meta?.total || 0,
    active: activeCountData?.meta?.total || 0,
    suspended: suspendedCountData?.meta?.total || 0,
    dropped: droppedCountData?.meta?.total || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("students")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("manageStudents")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
            title={t("export") || "Export"}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t("export")}</span>
            <span className="sm:hidden">1</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary/10 hover:bg-primary/20"
            onClick={handleExportComprehensiveData}
            title={
              t("exportAllStudentsData") ||
              "Barcha talabalarni ma'lumotlarini yuklab olish"
            }
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">
              {t("exportAllStudentsData") ||
                "Barcha talabalarni ma'lumotlarini yuklab olish"}
            </span>
            <span className="hidden sm:inline lg:hidden">
              {t("exportAll") || "Barchasi"}
            </span>
            <span className="sm:hidden font-bold">Full</span>
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("addStudent")}</span>
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            label: t("totalStudents"),
            value: stats.total,
            icon: UsersIcon,
            color: "blue",
          },
          {
            label: t("active"),
            value: stats.active,
            icon: UsersIcon,
            color: "green",
          },
          {
            label: t("suspended"),
            value: stats.suspended,
            icon: UsersIcon,
            color: "yellow",
          },
          {
            label: t("dropped"),
            value: stats.dropped,
            icon: UsersIcon,
            color: "red",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="border-border/50 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
                >
                  <stat.icon
                    className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchByName")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-border/50"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-40"
                >
                  <option value="">{t("allStatuses")}</option>
                  <option value="active">{t("active")}</option>
                  <option value="dropped">{t("dropped")}</option>
                  <option value="suspended">{t("suspended")}</option>
                </Select>
                <Select
                  value={groupFilter}
                  onChange={(e) => {
                    console.log(
                      "[STUDENTS] Group filter changed:",
                      e.target.value
                    );
                    setGroupFilter(e.target.value);
                  }}
                  className="w-full sm:w-40"
                  disabled={isLoadingGroups}
                >
                  <option value="">
                    {isLoadingGroups ? t("loading") : t("allGroups")}
                  </option>
                  {!isLoadingGroups && allGroups.length > 0
                    ? allGroups.map((group: any) => (
                        <option
                          key={`group-${group.id}`}
                          value={String(group.id)}
                        >
                          {group.name}
                        </option>
                      ))
                    : null}
                </Select>
                <Input
                  type="number"
                  placeholder={t("archiveYear") || "Arxiv yili"}
                  value={archiveYearFilter}
                  onChange={(e) => setArchiveYearFilter(e.target.value)}
                  className="w-full sm:w-40"
                  min="2020"
                  max="2050"
                />
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>{t("activeFilters")}</span>
                {search && (
                  <Badge variant="secondary">
                    {t("search")}: {search}
                  </Badge>
                )}
                {statusFilter && (
                  <Badge variant="secondary">
                    {t("status")}: {t(statusFilter)}
                  </Badge>
                )}
                {groupFilter && (
                  <Badge variant="secondary">
                    {t("group")}:{" "}
                    {
                      allGroups.find(
                        (g: any) => g?.id?.toString() === groupFilter
                      )?.name
                    }
                  </Badge>
                )}
                {archiveYearFilter && (
                  <Badge variant="secondary">
                    {t("archiveYear") || "Arxiv yili"}: {archiveYearFilter}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-lg">{t("studentsList")}</CardTitle>
          </CardHeader>
          <Table isLoading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("contact")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("group")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("dateOfBirth")}
                </TableHead>
                <TableHead>{t("status")}</TableHead>
                {/* O'zgartirish: [&>div]:justify-end klassi qo'shildi */}
                <TableHead className="text-right [&>div]:justify-end">
                  {t("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((student) => (
                  <TableRow
                    key={student.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {student.first_name?.[0]}
                          {student.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/students/${student.id}`}
                            className="font-medium text-foreground truncate hover:underline"
                          >
                            {student.first_name} {student.last_name}
                          </Link>
                          <p className="text-sm text-muted-foreground md:hidden truncate">
                            {student.phone}
                          </p>
                          {student.created_at && (
                            <p className="text-xs text-muted-foreground/70 truncate">
                              {format(
                                new Date(student.created_at),
                                "dd-MM-yyyy"
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="text-sm text-foreground">
                          {student.phone}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {student.address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline">
                        {allGroups.find((g) => g.id === student.group_id)
                          ?.name || t("noGroup")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {student.date_of_birth &&
                          format(new Date(student.date_of_birth), "dd-MM-yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(student);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(student);
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty
                  icon={<UsersIcon className="w-12 h-12" />}
                  title={t("noStudentsFound")}
                  description={
                    hasActiveFilters
                      ? t("adjustFiltersMessage")
                      : t("getStartedByCreating")
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        {t("clearFilters")}
                      </Button>
                    ) : (
                      <Button onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("addStudent")}
                      </Button>
                    )
                  }
                />
              )}
            </TableBody>
          </Table>
          {data?.meta && data.meta.total_pages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={data.meta.total_pages}
              totalItems={data.meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </Card>
      </motion.div>

      {/* Student Dialog (for editing existing students) */}
      <StudentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        student={selectedStudent}
      />

      {/* Combined Student + Contract Dialog (for creating new students) */}
      <StudentWithContractDialog
        open={isCombinedDialogOpen}
        onOpenChange={setIsCombinedDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["students-count"] });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-xl">
                {t("confirmDelete") || "Confirm Delete"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base mt-4">
              {t("deleteStudentWarning") || "Are you sure you want to delete"}{" "}
              <span className="font-semibold text-foreground">
                {studentToDelete?.first_name} {studentToDelete?.last_name}
              </span>
              ?
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                  {t("deletionWarning") || "This will permanently delete:"}
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>{t("studentProfile") || "Student profile"}</li>
                  <li>{t("allContracts") || "All contracts"}</li>
                  <li>{t("paymentHistory") || "Payment history"}</li>
                  <li>{t("attendanceRecords") || "Attendance records"}</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setStudentToDelete(null);
              }}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="flex-1"
            >
              {deleteMutation.isPending ? t("deleting") : t("deleteStudent")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
