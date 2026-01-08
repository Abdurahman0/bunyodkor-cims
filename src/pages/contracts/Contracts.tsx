/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { contractService, studentService, groupService } from "@/services/api.service";
import {
  Plus,
  Search,
  Edit,
  FileText,
  CalendarDays,
  User,
  Users,
  CreditCard,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguageStore } from "@/store/languageStore";
import type { ContractRead, StudentRead } from "@/types/api";
import { ContractDialog } from "./ContractDialog";

export default function Contracts() {
  const { t } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState<number | undefined>(undefined);
  const [contractIdFilter, setContractIdFilter] = useState<number | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractRead | null>(
    null
  );
  const queryClient = useQueryClient();

  // Read group_id and contract_id from URL parameters
  useEffect(() => {
    const groupId = searchParams.get("group_id");
    if (groupId) {
      setGroupFilter(parseInt(groupId, 10));
    }

    const contractId = searchParams.get("contract_id");
    if (contractId) {
      setContractIdFilter(parseInt(contractId, 10));
    }
  }, [searchParams]);

  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contracts", page, debouncedSearch, statusFilter, groupFilter, contractIdFilter],
    queryFn: async () => {
      console.log('[CONTRACTS] Fetching contracts with params:', {
        page,
        page_size: 10,
        contract_number: debouncedSearch || undefined,
        status: statusFilter || undefined,
        group_id: groupFilter,
        contract_id: contractIdFilter,
      });

      try {
        const response = await contractService.getContracts({
          page,
          page_size: 10,
          contract_number: debouncedSearch || undefined,
          status: statusFilter || undefined,
          group_id: groupFilter,
          contract_id: contractIdFilter,
        });

        console.log('[CONTRACTS] Response:', response);
        console.log('[CONTRACTS] Data:', response?.data);
        console.log('[CONTRACTS] Meta:', response?.meta);

        return response;
      } catch (err) {
        console.error('[CONTRACTS] Error fetching contracts:', err);
        throw err;
      }
    },
  });

  // Log error if exists
  if (error) {
    console.error('[CONTRACTS] Query error:', error);
  }

  const { data: studentsData, error: studentsError } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      console.log('[CONTRACTS] Fetching students list');
      try {
        const response = await studentService.getStudents({ page: 1, page_size: 100 });
        console.log('[CONTRACTS] Students response:', response);
        return response;
      } catch (err) {
        console.error('[CONTRACTS] Error fetching students:', err);
        throw err;
      }
    },
  });

  // Fetch all groups for dropdown
  const { data: allGroupsData, error: groupsError } = useQuery({
    queryKey: ["groups-list"],
    queryFn: async () => {
      console.log('[CONTRACTS] Fetching groups');
      try {
        const response = await groupService.getGroupsGroupedByYear();
        console.log('[CONTRACTS] Groups response:', response);
        return response;
      } catch (err) {
        console.error('[CONTRACTS] Error fetching groups:', err);
        throw err;
      }
    },
  });

  // Log errors
  if (studentsError) {
    console.error('[CONTRACTS] Students query error:', studentsError);
  }
  if (groupsError) {
    console.error('[CONTRACTS] Groups query error:', groupsError);
  }

  // Fetch group details if filtering by group
  const { data: groupData } = useQuery({
    queryKey: ["group", groupFilter],
    queryFn: () => groupService.getGroup(groupFilter!),
    enabled: !!groupFilter,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contractService.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success(
        t("contractDeletedSuccess" as any) || "Contract deleted successfully"
      );
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = "Failed to delete contract";

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const handleOpenDialog = (contract?: ContractRead) => {
    setSelectedContract(contract || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (contract: ContractRead) => {
    if (
      confirm(
        t("confirmDeleteContract", {
          number: contract.contract_number,
        }) as string
      )
    ) {
      deleteMutation.mutate(contract.id);
    }
  };

  const getStudentName = (studentId: number | null | undefined) => {
    if (!studentId) return t("unknown") || "Noma'lum";

    const student = studentsData?.data?.find(
      (s: StudentRead) => s.id === studentId
    );
    return student
      ? `${student.first_name} ${student.last_name}`
      : `ID: ${studentId}`;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      active: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
      },
      expired: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-400",
      },
      cancelled: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
      },
    };
    return (
      <Badge
        className={`${variants[status]?.bg} ${variants[status]?.text} border-0`}
      >
        {t(status as any) || status}
      </Badge>
    );
  };

  // --- Handlers for Filters & Search ---

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page on search
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1); // Reset page on filter
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setGroupFilter(undefined);
    setContractIdFilter(undefined);
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter || groupFilter || contractIdFilter;

  // --- Pagination Logic ---
  const totalPages = data?.meta?.total_pages || 1;

  const getPaginationItems = () => {
    if (totalPages <= 1) return [];

    // If 7 or fewer pages, show all
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // If current page is near the start
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    // If current page is near the end
    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    // If current page is in the middle
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const paginationItems = getPaginationItems();

  // Debug log for render
  console.log('[CONTRACTS] Rendering with state:', {
    isLoading,
    hasData: !!data,
    dataLength: data?.data?.length,
    hasError: !!error,
    studentsCount: studentsData?.data?.length,
    groupsCount: allGroupsData?.data?.length,
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("contracts")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("manageContracts")}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchByContractNumber")}
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10"
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
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={statusFilter}
                  onChange={handleStatusChange}
                  className="w-40"
                >
                  <option value="">{t("allStatuses")}</option>
                  <option value="active">{t("active")}</option>
                  <option value="expired">{t("expired")}</option>
                  <option value="cancelled">{t("cancelled")}</option>
                </Select>
                <Select
                  value={groupFilter?.toString() || ""}
                  onChange={(e) => {
                    console.log('[CONTRACTS] Group filter changed:', e.target.value);
                    setGroupFilter(e.target.value ? parseInt(e.target.value) : undefined);
                  }}
                  className="w-48"
                >
                  <option value="">{t("allGroups")}</option>
                  {allGroupsData?.data && Array.isArray(allGroupsData.data) ? (
                    allGroupsData.data.map((yearGroup: any, yearIndex: number) => {
                      if (!yearGroup?.groups || !Array.isArray(yearGroup.groups)) {
                        console.log('[CONTRACTS] Invalid yearGroup at index', yearIndex, yearGroup);
                        return null;
                      }

                      return yearGroup.groups
                        .filter((group: any) => {
                          const isValid = group && group.id && group.name;
                          if (!isValid) {
                            console.log('[CONTRACTS] Filtering out invalid group:', group);
                          }
                          return isValid;
                        })
                        .map((group: any) => {
                          console.log('[CONTRACTS] Rendering group option:', group.id, group.name);
                          return (
                            <option key={`group-${group.id}`} value={group.id}>
                              {group.name}
                            </option>
                          );
                        });
                    })
                  ) : null}
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {groupFilter && groupData?.data && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {t("filteringByGroup") || "Guruh bo'yicha filtrlangan"}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {groupData.data.name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("clearFilter") || "Filtrni tozalash"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">{t("contractsList")}</CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("contractNumber")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("student")}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {t("period")}
                    </TableHead>
                    <TableHead>{t("monthlyFee")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    {/* O'zgartirish: [&>div]:justify-end klassi qo'shildi */}
                    <TableHead className="text-right [&>div]:justify-end">
                      {t("actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data && data.data.length > 0 ? (
                    data.data.map((contract: ContractRead) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {contract.contract_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {contract.student_id ? (
                              <Link
                                to={`/students/${contract.student_id}`}
                                className="hover:underline text-primary hover:text-primary/80"
                              >
                                {getStudentName(contract.student_id)}
                              </Link>
                            ) : (
                              getStudentName(contract.student_id)
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-muted-foreground" />
                              {contract.start_date ? (
                                format(
                                  new Date(contract.start_date),
                                  "MMM d, yyyy"
                                )
                              ) : (
                                "-"
                              )}
                            </div>
                            <div className="text-muted-foreground">
                              to{" "}
                              {contract.end_date ? (
                                format(
                                  new Date(contract.end_date),
                                  "MMM d, yyyy"
                                )
                              ) : (
                                "-"
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {contract.monthly_fee ? formatCurrency(contract.monthly_fee) : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {contract.status ? getStatusBadge(contract.status) : (
                            <Badge variant="secondary">{t("unknown") || "Noma'lum"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(contract)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(contract)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableEmpty
                      icon={<FileText className="w-12 h-12" />}
                      title={t("noContractsFound")}
                      description={t("contractsCreatedWithStudents")}
                    />
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {data?.meta && data.meta.total_pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-9 w-9 p-0 lg:w-auto lg:px-4 lg:py-2"
                  >
                    <ChevronLeft className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">{t("previous")}</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {paginationItems.map((item, index) =>
                      typeof item === "number" ? (
                        <Button
                          key={`${item}-${index}`}
                          variant={page === item ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(item)}
                          className="w-9 h-9 p-0 font-medium"
                        >
                          {item}
                        </Button>
                      ) : (
                        <span
                          key={`dots-${index}`}
                          className="flex items-center justify-center w-9 h-9 text-muted-foreground"
                        >
                          ...
                        </span>
                      )
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-9 w-9 p-0 lg:w-auto lg:px-4 lg:py-2"
                  >
                    <span className="hidden lg:inline">{t("next")}</span>
                    <ChevronRight className="h-4 w-4 lg:ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>

      <ContractDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contract={selectedContract}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["contracts"] });
        }}
      />
    </div>
  );
}
