/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { contractService, groupService } from "@/services/api.service";
import { useGroupsStore } from "@/store/groupsStore";
import { useLanguageStore } from "@/store/languageStore";
import { useDebounce } from "@/hooks/useDebounce";
import { downloadFile } from "@/lib/export-utils";
import { ContractDialog } from "./ContractDialog";
import type {
  ContractWithStudentNameRead,
  TerminatedStudentItem,
  TerminatedUnpaidReportItem,
} from "@/types/api";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Edit,
  FileText,
  Loader2,
  Search,
  User,
  Users,
  X,
} from "lucide-react";

type ContractsView = "contracts" | "terminated-students" | "terminated-unpaid";

export default function Contracts() {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<ContractsView>("contracts");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState<number | undefined>(undefined);
  const [contractIdFilter, setContractIdFilter] = useState<number | undefined>(
    undefined,
  );
  const [archiveYearFilter, setArchiveYearFilter] = useState<
    number | undefined
  >(undefined);
  const [terminatedFrom, setTerminatedFrom] = useState("");
  const [terminatedTo, setTerminatedTo] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<ContractWithStudentNameRead | null>(null);

  const { groupsData: allGroupsData, isLoading: isLoadingGroups, fetchGroups } =
    useGroupsStore();

  useEffect(() => {
    if (!allGroupsData && !isLoadingGroups) {
      fetchGroups();
    }
  }, [allGroupsData, isLoadingGroups, fetchGroups]);

  useEffect(() => {
    const groupId = searchParams.get("group_id");
    const contractId = searchParams.get("contract_id");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroupFilter(groupId ? parseInt(groupId, 10) : undefined);
    setContractIdFilter(contractId ? parseInt(contractId, 10) : undefined);
  }, [searchParams]);

  const debouncedSearch = useDebounce(search, 500);

  const contractsQuery = useQuery({
    queryKey: [
      "contracts",
      page,
      debouncedSearch,
      statusFilter,
      groupFilter,
      archiveYearFilter,
      contractIdFilter,
      view,
    ],
    queryFn: async () => {
      const params = {
        page,
        page_size: 10,
        contract_number: debouncedSearch || undefined,
        status: statusFilter || undefined,
        group_id: groupFilter,
        archive_year: archiveYearFilter,
      };

      const [withNameRes, standardRes] = await Promise.all([
        contractService.getContractsWithStudentName(params),
        contractService.getContracts({
          ...params,
          contract_id: contractIdFilter,
        }),
      ]);

      const mergedData = withNameRes.data
        .map((contractWithName: any) => {
          const standardContract = standardRes.data.find(
            (c: any) => c.id === contractWithName.id,
          );
          return {
            ...contractWithName,
            student_id: standardContract?.student_id,
          };
        })
        .filter((contract: ContractWithStudentNameRead) =>
          contractIdFilter ? contract.id === contractIdFilter : true,
        );

      return {
        ...withNameRes,
        data: mergedData,
        meta: {
          ...withNameRes.meta,
          total: contractIdFilter ? mergedData.length : withNameRes.meta?.total,
          total_pages: contractIdFilter ? 1 : withNameRes.meta?.total_pages,
        },
      };
    },
    enabled: view === "contracts",
  });

  const terminatedStudentsQuery = useQuery({
    queryKey: [
      "contracts-terminated-students",
      page,
      debouncedSearch,
      groupFilter,
      archiveYearFilter,
      terminatedFrom,
      terminatedTo,
      view,
    ],
    queryFn: () =>
      contractService.getTerminatedStudents({
        archive_year: archiveYearFilter,
        group_id: groupFilter,
        search: debouncedSearch || undefined,
        terminated_from: terminatedFrom || undefined,
        terminated_to: terminatedTo || undefined,
        page,
        page_size: 10,
      }),
    enabled: view === "terminated-students",
  });

  const terminatedUnpaidQuery = useQuery({
    queryKey: [
      "contracts-terminated-unpaid",
      page,
      debouncedSearch,
      groupFilter,
      archiveYearFilter,
      terminatedFrom,
      terminatedTo,
      view,
    ],
    queryFn: () =>
      contractService.getTerminatedUnpaidReport({
        archive_year: archiveYearFilter,
        group_id: groupFilter,
        search: debouncedSearch || undefined,
        terminated_from: terminatedFrom || undefined,
        terminated_to: terminatedTo || undefined,
        page,
        page_size: 10,
      }),
    enabled: view === "terminated-unpaid",
  });

  const { data: groupData } = useQuery({
    queryKey: ["group", groupFilter],
    queryFn: () => groupService.getGroup(groupFilter!),
    enabled: !!groupFilter,
  });

  const currentData =
    view === "contracts"
      ? contractsQuery.data
      : view === "terminated-students"
        ? terminatedStudentsQuery.data
        : terminatedUnpaidQuery.data;

  const isLoading =
    view === "contracts"
      ? contractsQuery.isLoading
      : view === "terminated-students"
        ? terminatedStudentsQuery.isLoading
        : terminatedUnpaidQuery.isLoading;

  const handleOpenDialog = (contract?: ContractWithStudentNameRead) => {
    setSelectedContract(contract || null);
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return `${new Intl.NumberFormat("uz-UZ").format(amount)} UZS`;
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
      terminated: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
      },
      archived: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-700 dark:text-purple-400",
      },
      deleted: {
        bg: "bg-gray-100 dark:bg-gray-900/30",
        text: "text-gray-700 dark:text-gray-400",
      },
      cancelled: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
      },
    };
    return (
      <Badge
        className={`${variants[status]?.bg || "bg-muted"} ${variants[status]?.text || "text-foreground"} border-0`}
      >
        {t(status as any) || status}
      </Badge>
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleArchiveYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setArchiveYearFilter(year ? parseInt(year, 10) : undefined);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setGroupFilter(undefined);
    setContractIdFilter(undefined);
    setArchiveYearFilter(undefined);
    setTerminatedFrom("");
    setTerminatedTo("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
      groupFilter ||
      archiveYearFilter ||
      contractIdFilter ||
      (view === "contracts" && statusFilter) ||
      (view !== "contracts" && (terminatedFrom || terminatedTo)),
  );

  const handleViewChange = (nextView: ContractsView) => {
    setView(nextView);
    setPage(1);
    setStatusFilter("");
  };

  const handleExportTerminatedUnpaid = async () => {
    const promise = (async () => {
      const blob = await contractService.exportTerminatedUnpaidReport({
        archive_year: archiveYearFilter,
        group_id: groupFilter,
        search: debouncedSearch || undefined,
        terminated_from: terminatedFrom || undefined,
        terminated_to: terminatedTo || undefined,
      });

      if (!blob || blob.size === 0) {
        throw new Error("NO_DATA");
      }

      const date = format(new Date(), "yyyy-MM-dd");
      downloadFile(blob, `terminated-unpaid-report-${date}.xlsx`);
    })();

    toast.promise(promise, {
      loading: t("exportingData"),
      success: t("reportExported"),
      error: (error: Error) =>
        error.message === "NO_DATA"
          ? t("noDataToExport")
          : t("failedToExportReport"),
    });
  };

  const totalPages = currentData?.meta?.total_pages || 1;

  const getPaginationItems = () => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
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
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const paginationItems = getPaginationItems();

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

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={view === "contracts" ? "default" : "outline"}
            onClick={() => handleViewChange("contracts")}
          >
            {t("contractsList")}
          </Button>
          <Button
            variant={view === "terminated-students" ? "default" : "outline"}
            onClick={() => handleViewChange("terminated-students")}
          >
            Bekor qilingan talabalar
          </Button>
          <Button
            variant={view === "terminated-unpaid" ? "default" : "outline"}
            onClick={() => handleViewChange("terminated-unpaid")}
          >
            Bekor qilinganlar qarz hisoboti
          </Button>
          {view === "terminated-unpaid" && (
            <Button variant="outline" onClick={handleExportTerminatedUnpaid}>
              <Download className="w-4 h-4 mr-2" />
              {t("exportReport")}
            </Button>
          )}
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
                {view === "contracts" && (
                  <Select
                    value={statusFilter}
                    onChange={handleStatusChange}
                    className="w-40"
                  >
                    <option value="">{t("allStatuses")}</option>
                    <option value="active">{t("active")}</option>
                    <option value="expired">{t("expired")}</option>
                    <option value="cancelled">{t("cancelled")}</option>
                    <option value="archived">{t("archived")}</option>
                    <option value="deleted">{t("deleted")}</option>
                  </Select>
                )}

                <Select
                  value={archiveYearFilter?.toString() || ""}
                  onChange={handleArchiveYearChange}
                  className="w-40"
                >
                  <option value="">{t("allYears")}</option>
                  {Array.from({ length: 11 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </Select>

                <Select
                  value={groupFilter?.toString() || ""}
                  onChange={(e) => {
                    setGroupFilter(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    );
                    setPage(1);
                  }}
                  className="w-48"
                >
                  <option value="">{t("allGroups")}</option>
                  {allGroupsData && Array.isArray(allGroupsData)
                    ? allGroupsData.map((yearGroup: any) => {
                        if (
                          !yearGroup?.groups ||
                          !Array.isArray(yearGroup.groups)
                        ) {
                          return null;
                        }
                        return yearGroup.groups
                          .filter((group: any) => group && group.id && group.name)
                          .map((group: any) => (
                            <option
                              key={`group-${group.id}`}
                              value={String(group.id)}
                            >
                              {group.name}
                            </option>
                          ));
                      })
                    : null}
                </Select>

                {view !== "contracts" && (
                  <>
                    <Input
                      type="date"
                      value={terminatedFrom}
                      onChange={(e) => {
                        setTerminatedFrom(e.target.value);
                        setPage(1);
                      }}
                      className="w-40"
                    />
                    <Input
                      type="date"
                      value={terminatedTo}
                      onChange={(e) => {
                        setTerminatedTo(e.target.value);
                        setPage(1);
                      }}
                      className="w-40"
                    />
                  </>
                )}

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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("filteringByGroup")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {groupData.data.name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("clearFilter")}
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
            <CardTitle className="text-lg">
              {view === "contracts"
                ? t("contractsList")
                : view === "terminated-students"
                  ? "Bekor qilingan talabalar"
                  : "Bekor qilinganlar qarz hisoboti"}
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                {t("loading") || "Loading..."}
              </span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("contractNumber")}</TableHead>
                    <TableHead>{t("student")}</TableHead>
                    {view === "contracts" ? (
                      <>
                        <TableHead className="hidden lg:table-cell">
                          {t("period")}
                        </TableHead>
                        <TableHead>{t("monthlyFee")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-right [&>div]:justify-end">
                          {t("actions")}
                        </TableHead>
                      </>
                    ) : view === "terminated-students" ? (
                      <>
                        <TableHead>{t("group")}</TableHead>
                        <TableHead>{t("terminatedAt")}</TableHead>
                        <TableHead>To'lovlar jami</TableHead>
                        <TableHead>{t("reason") || "Reason"}</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>{t("group")}</TableHead>
                        <TableHead>{t("terminatedAt")}</TableHead>
                        <TableHead>{t("paid") || "Paid"}</TableHead>
                        <TableHead>{t("unpaid") || "Unpaid"}</TableHead>
                        <TableHead>{t("debt") || "Debt"}</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {view === "contracts" ? (
                    currentData?.data && currentData.data.length > 0 ? (
                      (currentData.data as ContractWithStudentNameRead[]).map(
                        (contract) => (
                          <TableRow key={contract.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {contract.contract_number}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div
                                className="flex items-center gap-2 cursor-pointer group select-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (contract.student_id) {
                                    navigate(`/students/${contract.student_id}`);
                                  }
                                }}
                              >
                                <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="font-medium text-foreground group-hover:text-primary group-hover:underline transition-colors">
                                  {contract.student_full_name ||
                                    t("unknown") ||
                                    "Noma'lum"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3 text-muted-foreground" />
                                  {contract.start_date
                                    ? format(
                                        new Date(contract.start_date),
                                        "MMM d, yyyy",
                                      )
                                    : "-"}
                                </div>
                                <div className="text-muted-foreground">
                                  to{" "}
                                  {contract.end_date
                                    ? format(new Date(contract.end_date), "MMM d, yyyy")
                                    : "-"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatCurrency(contract.monthly_fee)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {contract.status ? (
                                getStatusBadge(contract.status)
                              ) : (
                                <Badge variant="secondary">
                                  {t("unknown") || "Noma'lum"}
                                </Badge>
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
                              </div>
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    ) : (
                      <TableEmpty
                        icon={<FileText className="w-12 h-12" />}
                        title={t("noContractsFound")}
                        description={t("contractsCreatedHere")}
                      />
                    )
                  ) : view === "terminated-students" ? (
                    currentData?.data && currentData.data.length > 0 ? (
                      (currentData.data as TerminatedStudentItem[]).map((item) => (
                        <TableRow key={item.contract_id}>
                          <TableCell>{item.contract_number}</TableCell>
                          <TableCell>
                            {`${item.student_first_name || ""} ${item.student_last_name || ""}`.trim() ||
                              "-"}
                          </TableCell>
                          <TableCell>{item.student_group_name || "-"}</TableCell>
                          <TableCell>
                            {item.terminated_at
                              ? format(
                                  new Date(item.terminated_at),
                                  "MMM d, yyyy HH:mm",
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(item.successful_payments_total)}
                          </TableCell>
                          <TableCell>{item.termination_reason || "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableEmpty
                        icon={<FileText className="w-12 h-12" />}
                        title={t("noDataToExport")}
                        description={"Bekor qilingan talabalar topilmadi."}
                      />
                    )
                  ) : currentData?.data && currentData.data.length > 0 ? (
                    (currentData.data as TerminatedUnpaidReportItem[]).map((item) => (
                      <TableRow key={item.contract_id}>
                        <TableCell>{item.contract_number}</TableCell>
                        <TableCell>
                          {`${item.student_first_name || ""} ${item.student_last_name || ""}`.trim() ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          {item.contract_group_name ||
                            item.current_student_group_name ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          {item.terminated_at
                            ? format(new Date(item.terminated_at), "MMM d, yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell>{item.paid_months_count}</TableCell>
                        <TableCell>{item.unpaid_months_count}</TableCell>
                        <TableCell>{formatCurrency(item.debt_amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableEmpty
                      icon={<FileText className="w-12 h-12" />}
                      title={t("noDataToExport")}
                      description={"Bekor qilinganlar bo'yicha qarz ma'lumoti topilmadi."}
                    />
                  )}
                </TableBody>
              </Table>

              {currentData?.meta && (currentData.meta.total_pages || 0) > 1 && (
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
                      ),
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
