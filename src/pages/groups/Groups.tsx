/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  groupService,
  userService,
  studentService,
  contractService,
} from "@/services/api.service";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Calendar,
  Clock,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  FileText,
  CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguageStore } from "@/store/languageStore";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {
  GroupRead,
  UserRead,
  StudentRead,
  ContractRead,
} from "@/types/api";
import { GroupDialog } from "./GroupDialog";
import { GroupDetailsDialog } from "./GroupDetailsDialog";

// Component to display individual group card with capacity
function GroupCard({
  group,
  coachName,
  onEdit,
  onDelete,
  onOpenDetails,
  onViewContracts,
  onViewStudents,
  t,
}: {
  group: GroupRead;
  coachName: string;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDetails: () => void;
  onViewContracts: () => void;
  onViewStudents: () => void;
  t: any;
}) {
  // Use student count from group data (no need for extra API calls)
  // The API already returns active_students_count with each group
  const studentCount = group.active_students_count || 0;
  const availableSlots = group.capacity - studentCount;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="hover:shadow-lg transition-all duration-200 cursor-pointer group h-full border-border/50 hover:border-border"
        onClick={onOpenDetails}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {group.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {group.identifier && (
                    <Badge variant="outline" className="text-xs">
                      {group.identifier}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="w-3 h-3" />
                    {coachName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{group.schedule_days}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{group.schedule_time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">
                {studentCount} / {group.capacity}
              </span>
              <Badge
                variant={availableSlots > 0 ? "default" : "destructive"}
                className="ml-auto"
              >
                {availableSlots > 0
                  ? `${availableSlots} ${t("availableSlots") || "slots"}`
                  : t("full") || "Full"}
              </Badge>
            </div>
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {group.description}
            </p>
          )}
          <div
            className="flex flex-col gap-2 pt-2 border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                {t("edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                {t("delete")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewStudents();
                }}
                className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <Users className="w-4 h-4" />
                <span className="truncate">{t("viewStudents")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewContracts();
                }}
                className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <FileText className="w-4 h-4" />
                <span className="truncate">{t("viewContracts")}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Groups() {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false);
  const [isContractsDialogOpen, setIsContractsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupRead | null>(null);
  const [selectedGroupForStudents, setSelectedGroupForStudents] =
    useState<GroupRead | null>(null);
  const [selectedGroupForContracts, setSelectedGroupForContracts] =
    useState<GroupRead | null>(null);
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(search, 500);

  // Fetch groups organized by birth year
  const { data: groupedData, isLoading } = useQuery({
    queryKey: ["groups-grouped-by-year"],
    queryFn: () => groupService.getGroupsGroupedByYear(),
  });

  // Apply search filter to grouped data
  const getFilteredGroupedData = () => {
    if (!groupedData?.data) return [];

    if (!debouncedSearch) return groupedData.data;

    return groupedData.data
      .map((yearData) => ({
        ...yearData,
        groups: yearData.groups.filter((group) =>
          group.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        ),
        total_groups: yearData.groups.filter((group) =>
          group.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        ).length,
      }))
      .filter((yearData) => yearData.groups.length > 0);
  };

  const filteredGroupedData = getFilteredGroupedData();

  const { data: coachesData } = useQuery({
    queryKey: ["coaches"],
    queryFn: () => userService.getCoaches(),
  });

  // Fetch students for selected group with fallback
  const { data: groupStudentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["group-students", selectedGroupForStudents?.id],
    queryFn: async () => {
      if (!selectedGroupForStudents) return [];

      console.log(
        "[DEBUG] Fetching group students for group:",
        selectedGroupForStudents
      );

      // Try the primary endpoint first
      const response = await groupService.getGroupStudents(
        selectedGroupForStudents.id
      );
      console.log("[DEBUG] Group students response:", response);
      console.log("[DEBUG] Group students data:", response.data);
      console.log("[DEBUG] Group students data length:", response.data?.length);

      // If primary endpoint returns empty or null, use fallback
      if (!response.data || response.data.length === 0) {
        console.log(
          "[DEBUG] Primary endpoint returned empty, trying fallback /students endpoint"
        );

        const fallbackResponse = await studentService.getStudents({
          group_id: selectedGroupForStudents.id,
          page: 1,
          page_size: 100,
        });

        console.log("[DEBUG] Fallback students response:", fallbackResponse);
        console.log("[DEBUG] Fallback students data:", fallbackResponse.data);

        if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          console.log(
            "[DEBUG] Using fallback data with",
            fallbackResponse.data.length,
            "students"
          );
          return fallbackResponse.data;
        }
      }

      return response.data || [];
    },
    enabled: !!selectedGroupForStudents,
  });

  // Fetch contracts for selected group
  const { data: groupContractsData, isLoading: isLoadingContracts } = useQuery({
    queryKey: ["group-contracts", selectedGroupForContracts?.id],
    queryFn: () =>
      groupService.getGroupContracts(selectedGroupForContracts!.id, {
        page: 1,
        page_size: 100,
      }),
    enabled: !!selectedGroupForContracts,
  });

  // Fetch students for contracts (to show student names)
  const { data: studentsForContracts } = useQuery({
    queryKey: ["students-for-contracts", selectedGroupForContracts?.id],
    queryFn: async () => {
      if (!selectedGroupForContracts) return { data: [], meta: {} };

      console.log(
        "[DEBUG] Fetching students via /students for group:",
        selectedGroupForContracts.id
      );
      const response = await studentService.getStudents({
        group_id: selectedGroupForContracts.id,
        page: 1,
        page_size: 100,
      });
      console.log("[DEBUG] Students via /students response:", response);

      return response;
    },
    enabled: !!selectedGroupForContracts,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => groupService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups-grouped-by-year"] });
      toast.success(t("groupDeletedSuccess"));
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = "Failed to delete group";

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const handleOpenDialog = (group?: GroupRead) => {
    setSelectedGroup(group || null);
    setIsDialogOpen(true);
  };

  const handleOpenDetailsDialog = (group: GroupRead) => {
    setSelectedGroup(group);
    setIsDetailsDialogOpen(true);
  };

  const handleDelete = (group: GroupRead) => {
    const message =
      t("confirmDeleteGroup") ||
      `Are you sure you want to delete group "${group.name}"?`;

    if (confirm(message.replace("{{name}}", group.name))) {
      deleteMutation.mutate(group.id);
    }
  };

  const handleViewContracts = (group: GroupRead) => {
    setSelectedGroupForContracts(group);
    setIsContractsDialogOpen(true);
  };

  const handleViewStudents = (group: GroupRead) => {
    setSelectedGroupForStudents(group);
    setIsStudentsDialogOpen(true);
  };

  const getCoachName = (coachId: number) => {
    const coach = coachesData?.data?.find((c) => c.id === coachId);
    return coach ? coach.full_name : `ID: ${coachId}`;
  };

  const getStudentName = (studentId: number | null | undefined) => {
    if (!studentId) return t("noStudentName");
    const student = studentsForContracts?.data?.find(
      (s: StudentRead) => s.id === studentId
    );
    return student
      ? `${student.first_name} ${student.last_name}`
      : t("noStudentName");
  };

  // --- Handlers for Search ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleClearSearch = () => {
    setSearch("");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("groups")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("manageGroups")}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("newGroup")}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("searchByGroupName")}
                value={search}
                onChange={handleSearchChange}
                className="pl-10 pr-10 border-border/50"
              />
              {search && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredGroupedData && filteredGroupedData.length > 0 ? (
        <div className="space-y-8">
          {filteredGroupedData.map((yearData) => (
            <motion.div
              key={yearData.birth_year}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                  <CardTitle className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    {yearData.birth_year} {t("birthYear") || "yil tug'ilganlar"}
                    <Badge variant="secondary" className="ml-auto">
                      {yearData.total_groups} {t("group")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {yearData.groups.map((group: GroupRead) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        coachName={getCoachName(group.coach_id)}
                        onEdit={() => handleOpenDialog(group)}
                        onDelete={() => handleDelete(group)}
                        onOpenDetails={() => handleOpenDetailsDialog(group)}
                        onViewContracts={() => handleViewContracts(group)}
                        onViewStudents={() => handleViewStudents(group)}
                        t={t}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("noGroupsFound")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("getStartedGroup")}
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              {t("createGroup")}
            </Button>
          </CardContent>
        </Card>
      )}

      <GroupDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        group={selectedGroup}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["groups-grouped-by-year"],
          });
        }}
      />

      {selectedGroup && (
        <GroupDetailsDialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          group={selectedGroup}
        />
      )}

      {/* Students Dialog */}
      <Dialog
        open={isStudentsDialogOpen}
        onOpenChange={setIsStudentsDialogOpen}
      >
        <DialogContent
          className="max-w-5xl max-h-[80vh] overflow-y-auto"
          onClose={() => setIsStudentsDialogOpen(false)}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedGroupForStudents?.name} - {t("groupStudents")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("student") || "Talaba"}</TableHead>
                      <TableHead>{t("phone") || "Telefon"}</TableHead>
                      <TableHead>{t("birthYear")}</TableHead>
                      <TableHead>{t("address")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupStudentsData && groupStudentsData.length > 0 ? (
                      groupStudentsData.map((student: StudentRead) => (
                        <TableRow
                          key={student.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            navigate(`/students/${student.id}`);
                            setIsStudentsDialogOpen(false);
                          }}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {student.first_name?.[0]}
                                {student.last_name?.[0]}
                              </div>
                              <div>
                                {student.first_name} {student.last_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{student.phone}</TableCell>
                          <TableCell>
                            {student.date_of_birth
                              ? new Date(student.date_of_birth).getFullYear()
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {student.address || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                student.status === "active"
                                  ? "default"
                                  : student.status === "inactive"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {student.status === "active"
                                ? t("active")
                                : student.status === "inactive"
                                ? t("inactive")
                                : t("archived")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>
                            {t("noStudentsInGroup") || "Guruhda talabalar yo'q"}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Contracts Dialog */}
      <Dialog
        open={isContractsDialogOpen}
        onOpenChange={setIsContractsDialogOpen}
      >
        <DialogContent
          className="max-w-5xl max-h-[80vh] overflow-y-auto"
          onClose={() => setIsContractsDialogOpen(false)}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedGroupForContracts?.name} - {t("contracts")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {isLoadingContracts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : groupContractsData?.data &&
              groupContractsData.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupContractsData.data.map((contract: ContractRead) => (
                  <Card
                    key={contract.id}
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer border-border/50 hover:border-border"
                    onClick={() => {
                      navigate(`/contracts?contract_id=${contract.id}`);
                      setIsContractsDialogOpen(false);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {contract.contract_number}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {getStudentName(contract.student_id)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            contract.status === "active"
                              ? "default"
                              : contract.status === "expired"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {contract.status === "active"
                            ? t("active")
                            : contract.status === "expired"
                            ? t("expired")
                            : t("cancelled")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
                          {contract.start_date && contract.end_date
                            ? `${new Date(
                                contract.start_date
                              ).toLocaleDateString()} - ${new Date(
                                contract.end_date
                              ).toLocaleDateString()}`
                            : t("noDates")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {contract.monthly_fee
                            ? `${Number(
                                contract.monthly_fee
                              ).toLocaleString()} UZS`
                            : t("noFee")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t("noContractsInGroup") || "Guruhda shartnomalar yo'q"}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
