/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { BarChart, DonutChart, StatsCard } from "@/components/ui/charts";
import {
  reportService,
  groupService,
  studentService,
} from "@/services/api.service";
import type { DebtorItem, GroupRead } from "@/types/api";

import PayersReport from "./PayersReport";
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  Download,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import toast from "react-hot-toast";
import { downloadFile, exportReport } from "@/lib/export-utils";
import { useLanguageStore } from "@/store/languageStore";
import {
  formatCurrency as formatCurrencyUtil,
} from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const [activeTab, setActiveTab] = useState<
    "finance" | "attendance" | "debtors" | "payers"
  >("finance");
  const [dateRange, setDateRange] = useState({
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`,
  });
  const [debtorsPage, setDebtorsPage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [minDebtAmount, setMinDebtAmount] = useState<number | "">("");
  const [unpaidYear, setUnpaidYear] = useState<number | "">(currentYear);
  const [unpaidMonth, setUnpaidMonth] = useState<number | "">(currentMonth);
  const [unpaidMonths, setUnpaidMonths] = useState("");
  const [unpaidFromDate, setUnpaidFromDate] = useState("");
  const [unpaidToDate, setUnpaidToDate] = useState("");
  const debtorsPageSize = 20;
  const monthOptions = useMemo(
    () => [
      { value: 1, label: t("january") || "January" },
      { value: 2, label: t("february") || "February" },
      { value: 3, label: t("march") || "March" },
      { value: 4, label: t("april") || "April" },
      { value: 5, label: t("may") || "May" },
      { value: 6, label: t("june") || "June" },
      { value: 7, label: t("july") || "July" },
      { value: 8, label: t("august") || "August" },
      { value: 9, label: t("september") || "September" },
      { value: 10, label: t("october") || "October" },
      { value: 11, label: t("november") || "November" },
      { value: 12, label: t("december") || "December" },
    ],
    [t],
  );

  const { data: financeReport, isLoading: financeLoading } = useQuery({
    queryKey: ["finance-report", dateRange],
    queryFn: () =>
      reportService.getFinanceReport({
        from_date: dateRange.from,
        to_date: dateRange.to,
      }),
    enabled: activeTab === "finance",
  });

  const { data: attendanceReport, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance-report"],
    queryFn: () => reportService.getGroupAttendanceReports(),
    enabled: activeTab === "attendance",
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups-list-all"],
    queryFn: async () => {
      const firstPage = await groupService.getGroups({ page: 1, page_size: 100 });
      const firstData = firstPage.data || [];
      const totalPages = firstPage.meta?.total_pages || 1;

      if (totalPages <= 1) {
        return { data: firstData };
      }

      const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, idx) =>
          groupService.getGroups({ page: idx + 2, page_size: 100 }),
        ),
      );

      return {
        data: [...firstData, ...restPages.flatMap((page) => page.data || [])],
      };
    },
    enabled: activeTab === "debtors",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Normalize groups response in case API returns nested `data` (e.g. { data: { data: [...] } })
  const groupsList: GroupRead[] = useMemo(() => {
    if (!groupsData?.data) return [];
    return groupsData.data;
  }, [groupsData]);

  const hasUnpaidListFilter = Boolean(
    unpaidYear !== "" ||
      unpaidMonth !== "" ||
      unpaidMonths.trim() !== "" ||
      unpaidFromDate ||
      unpaidToDate,
  );
  const hasAdvancedUnpaidListFilter = Boolean(
    unpaidMonths.trim() !== "" || unpaidFromDate || unpaidToDate,
  );

  const getUnpaidFilterParams = () => {
    const params: {
      year?: number;
      month?: number;
      months?: string;
      from_date?: string;
      to_date?: string;
      group_id?: number;
    } = {
      group_id: selectedGroupId || undefined,
    };

    const hasDateRange = Boolean(unpaidFromDate || unpaidToDate);
    if (hasDateRange) {
      params.from_date = unpaidFromDate || undefined;
      params.to_date = unpaidToDate || undefined;
      return params;
    }

    params.year = unpaidYear === "" ? undefined : Number(unpaidYear);
    params.month = unpaidMonth === "" ? undefined : Number(unpaidMonth);
    params.months = unpaidMonths.trim() === "" ? undefined : unpaidMonths.trim();
    return params;
  };

  const getDebtorsExportParams = () => ({
    group_id: selectedGroupId || undefined,
    min_debt_amount: minDebtAmount === "" ? undefined : Number(minDebtAmount),
    year: unpaidYear === "" ? undefined : Number(unpaidYear),
    month: unpaidMonth === "" ? undefined : Number(unpaidMonth),
  });

  const { data: debtorsData, isLoading: isDebtorsBaseLoading } = useQuery({
    queryKey: [
      "debtors-report",
      debtorsPage,
      selectedGroupId,
      minDebtAmount,
      unpaidYear,
      unpaidMonth,
    ],
    queryFn: () =>
      reportService.getDebtorsReport({
        page: debtorsPage,
        page_size: debtorsPageSize,
        group_id: selectedGroupId || undefined,
        min_debt_amount:
          minDebtAmount === "" ? undefined : Number(minDebtAmount),
        year: unpaidYear === "" ? undefined : Number(unpaidYear),
        month: unpaidMonth === "" ? undefined : Number(unpaidMonth),
      }),
    enabled: activeTab === "debtors" && !hasAdvancedUnpaidListFilter,
    placeholderData: (prev) => prev,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: debtorsFilteredData, isLoading: isDebtorsFilteredLoading } = useQuery({
    queryKey: [
      "debtors-report-filtered-unpaid",
      debtorsPage,
      selectedGroupId,
      minDebtAmount,
      unpaidYear,
      unpaidMonth,
      unpaidMonths,
      unpaidFromDate,
      unpaidToDate,
    ],
    queryFn: async () => {
      const debtorsFirstPage = await reportService.getDebtorsReport({
        page: 1,
        page_size: 100,
        group_id: selectedGroupId || undefined,
        min_debt_amount:
          minDebtAmount === "" ? undefined : Number(minDebtAmount),
      });

      const debtorsPages = debtorsFirstPage.meta?.total_pages || 1;
      const debtorsRestPages =
        debtorsPages > 1
          ? await Promise.all(
              Array.from({ length: debtorsPages - 1 }, (_, idx) =>
                reportService.getDebtorsReport({
                  page: idx + 2,
                  page_size: 100,
                  group_id: selectedGroupId || undefined,
                  min_debt_amount:
                    minDebtAmount === "" ? undefined : Number(minDebtAmount),
                }),
              ),
            )
          : [];

      const allDebtors = [
        ...(debtorsFirstPage.data || []),
        ...debtorsRestPages.flatMap((page) => page.data || []),
      ];

      const unpaidFirstPage = await studentService.getUnpaidStudents({
        ...getUnpaidFilterParams(),
        page: 1,
        page_size: 100,
      });

      const unpaidPages = unpaidFirstPage.meta?.total_pages || 1;
      const unpaidRestPages =
        unpaidPages > 1
          ? await Promise.all(
              Array.from({ length: unpaidPages - 1 }, (_, idx) =>
                studentService.getUnpaidStudents({
                  ...getUnpaidFilterParams(),
                  page: idx + 2,
                  page_size: 100,
                }),
              ),
            )
          : [];

      const allUnpaid = [
        ...(unpaidFirstPage.data || []),
        ...unpaidRestPages.flatMap((page) => page.data || []),
      ];

      const unpaidStudentIds = new Set<number>();
      allUnpaid.forEach((item: any) => {
        const studentId = Number(item.student_id ?? item.student?.id);
        if (Number.isFinite(studentId)) {
          unpaidStudentIds.add(studentId);
        }
      });

      const filteredDebtors = allDebtors.filter((debtor) =>
        unpaidStudentIds.has(debtor.student_id),
      );

      const total = filteredDebtors.length;
      const total_pages = Math.max(1, Math.ceil(total / debtorsPageSize));
      const startIndex = (debtorsPage - 1) * debtorsPageSize;
      const paginated = filteredDebtors.slice(
        startIndex,
        startIndex + debtorsPageSize,
      );
      const totalDebt = filteredDebtors.reduce(
        (sum, debtor) => sum + (debtor.debt_amount || 0),
        0,
      );

      return {
        data: paginated,
        meta: {
          page: debtorsPage,
          page_size: debtorsPageSize,
          total,
          total_pages,
        },
        total_debt: totalDebt,
      };
    },
    enabled: activeTab === "debtors" && hasAdvancedUnpaidListFilter,
    placeholderData: (prev) => prev,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: totalDebtData, isLoading: totalDebtLoading } = useQuery({
    queryKey: [
      "debtors-total-debt",
      selectedGroupId,
      minDebtAmount,
      unpaidYear,
      unpaidMonth,
    ],
    queryFn: async () => {
      const firstPage = await reportService.getDebtorsReport({
        page: 1,
        page_size: 100,
        group_id: selectedGroupId || undefined,
        min_debt_amount:
          minDebtAmount === "" ? undefined : Number(minDebtAmount),
        year: unpaidYear === "" ? undefined : Number(unpaidYear),
        month: unpaidMonth === "" ? undefined : Number(unpaidMonth),
      });

      const pages = firstPage.meta?.total_pages || 1;
      const allPages =
        pages > 1
          ? await Promise.all(
              Array.from({ length: pages - 1 }, (_, idx) =>
                reportService.getDebtorsReport({
                  page: idx + 2,
                  page_size: 100,
                  group_id: selectedGroupId || undefined,
                  min_debt_amount:
                    minDebtAmount === "" ? undefined : Number(minDebtAmount),
                  year: unpaidYear === "" ? undefined : Number(unpaidYear),
                  month: unpaidMonth === "" ? undefined : Number(unpaidMonth),
                }),
              ),
            )
          : [];

      const combined = [
        ...(firstPage.data || []),
        ...allPages.flatMap((page) => page.data || []),
      ];
      const totalDebt = combined.reduce(
        (sum, debtor) => sum + (debtor.debt_amount || 0),
        0,
      );
      return { total_debt: totalDebt };
    },
    enabled: activeTab === "debtors" && !hasAdvancedUnpaidListFilter,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const effectiveDebtorsData = hasAdvancedUnpaidListFilter ? debtorsFilteredData : debtorsData;
  const debtorsLoading = hasUnpaidListFilter
    ? (hasAdvancedUnpaidListFilter ? isDebtorsFilteredLoading : isDebtorsBaseLoading)
    : isDebtorsBaseLoading;
  const totalDebtAmount = hasAdvancedUnpaidListFilter
    ? debtorsFilteredData?.total_debt || 0
    : totalDebtData?.total_debt || 0;
  const isTotalDebtLoading = hasUnpaidListFilter
    ? (hasAdvancedUnpaidListFilter ? isDebtorsFilteredLoading : totalDebtLoading)
    : totalDebtLoading;

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, "UZS", "uz-UZ", false);
  };

  const formatPhone = (phone?: string | null) => {
    const value = phone?.trim();
    return value ? value : "-";
  };

  const handleOpenStudentDetail = (studentId?: number) => {
    if (!studentId) return;

    void queryClient.prefetchQuery({
      queryKey: ["student-full-info", studentId],
      queryFn: () => studentService.getStudentFullInfo(studentId),
    });

    navigate(`/students/${studentId}`);
  };

  const formatSource = (source: string) => {
    const cleanSource =
      source?.toString().replace(/^.*\./, "").toLowerCase() || "";
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1);
  };

  const tabs = [
    { id: "finance", label: t("financeReport"), icon: CreditCard },
    { id: "attendance", label: t("attendanceReport"), icon: Users },
    { id: "debtors", label: t("debtors"), icon: AlertTriangle },
    { id: "payers", label: t("payersReport"), icon: Users },
  ];

  const paymentSourcesData =
    financeReport?.data?.breakdown?.map((item: any) => ({
      label: formatSource(item.source),
      value: item.total_amount,
    })) || [];

  const transactionCountData =
    financeReport?.data?.breakdown?.map((item: any) => ({
      label: formatSource(item.source),
      value: item.transaction_count,
    })) || [];

  const attendanceChartData =
    attendanceReport?.data?.map((group: any) => ({
      label: group.group_name,
      value: group.attendance_percentage,
    })) || [];

  const handleDebtorsExport = async () => {
    const promise = (async () => {
      const blob = await reportService.exportDebtorsReport(
        getDebtorsExportParams(),
      );
      if (!blob || blob.size === 0) {
        throw new Error("NO_DATA");
      }
      const date = format(new Date(), "yyyy-MM-dd");
      downloadFile(blob, `debtors-report-${date}.xlsx`);
    })();

    toast.promise(promise, {
      loading: t("exportingData"),
      success: t("exportedSuccessfully"),
      error: (error: Error) =>
        error.message === "NO_DATA" ? t("noDataToExport") : t("errorExportingData"),
    });
  };

  const handleExport = async () => {
    try {
      let dataToExport: any[] | null = null;
      let reportType = "";

      switch (activeTab) {
        case "finance":
          if (!financeReport?.data?.breakdown?.length) {
            toast.error(t("noFinanceDataToExport"));
            return;
          }
          dataToExport = financeReport.data.breakdown.map((item) => ({
            "Payment Method": formatSource(item.source),
            "Transaction Count": item.transaction_count,
            "Total Amount": item.total_amount,
            "Average Amount": Math.round(
              item.total_amount / (item.transaction_count || 1),
            ),
          }));
          reportType = `finance-report-${dateRange.from}-to-${dateRange.to}`;
          break;

        case "attendance":
          if (!attendanceReport?.data?.length) {
            toast.error(t("noAttendanceDataToExport"));
            return;
          }
          dataToExport = attendanceReport.data.map((group) => ({
            "Group Name": group.group_name,
            "Total Sessions": group.total_sessions,
            "Total Students": group.total_students,
            "Attendance Rate": `${group.attendance_percentage}%`,
          }));
          reportType = "attendance-report";
          break;
      }

      if (dataToExport) {
        exportReport(dataToExport, reportType);
        toast.success(t("exportedSuccessfully"));
      }
    } catch (error) {
      toast.error(t("errorExportingData"));
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
            {t("reports")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("analyticsAndInsights")}
          </p>
        </div>
        {activeTab !== "payers" && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={activeTab === "debtors" ? handleDebtorsExport : handleExport}
          >
            <Download className="w-4 h-4" />
            {t("exportReport")}
          </Button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id as any)}
            className="gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </motion.div>

      {/* FINANCE TAB */}
      {activeTab === "finance" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("fromDate")}
                  </label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, from: e.target.value })
                    }
                    className="w-40"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("toDate")}
                  </label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, to: e.target.value })
                    }
                    className="w-40"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: format(subDays(new Date(), 7), "yyyy-MM-dd"),
                        to: format(new Date(), "yyyy-MM-dd"),
                      })
                    }
                  >
                    {t("last7Days")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
                        to: format(new Date(), "yyyy-MM-dd"),
                      })
                    }
                  >
                    {t("last30Days")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                        to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
                      })
                    }
                  >
                    {t("thisMonth")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title={t("totalRevenue")}
              value={formatCurrency(financeReport?.data?.total_revenue || 0)}
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <StatsCard
              title={t("transactions")}
              value={
                financeReport?.data?.breakdown?.reduce(
                  (acc: number, item: any) => acc + item.transaction_count,
                  0,
                ) || 0
              }
              icon={<CreditCard className="w-6 h-6" />}
            />
            <StatsCard
              title={t("paymentMethods")}
              value={financeReport?.data?.breakdown?.length || 0}
              icon={<BarChart3 className="w-6 h-6" />}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                  <CardTitle className="text-lg shrink-0">
                    {t("revenueBySource")}
                  </CardTitle>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <div className="text-xl sm:text-2xl font-bold text-foreground break-words overflow-wrap-anywhere">
                      {formatCurrency(financeReport?.data?.total_revenue || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("total")}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paymentSourcesData.length > 0 ? (
                  <DonutChart data={paymentSourcesData} size={180} showLegend />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    {t("noData")}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("transactionsBySource")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionCountData.length > 0 ? (
                  <BarChart
                    data={transactionCountData}
                    height={200}
                    horizontal
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    {t("noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("detailedBreakdown")}
              </CardTitle>
            </CardHeader>
            <Table isLoading={financeLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("paymentMethod")}</TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("transactions")}
                  </TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("average")}
                  </TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("totalAmount")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeReport?.data?.breakdown?.map((item) => (
                  <TableRow key={item.source}>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatSource(item.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.transaction_count}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(
                        Math.round(
                          item.total_amount / (item.transaction_count || 1),
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_amount)}
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableEmpty
                    title={t("noData")}
                    description={t("selectDateRangeForReport")}
                  />
                )}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === "attendance" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("groupAttendanceRates")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceChartData.length > 0 ? (
                <BarChart data={attendanceChartData} height={300} showValues />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  {t("noAttendanceData")}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("groupAttendanceDetails")}
              </CardTitle>
            </CardHeader>
            <Table isLoading={attendanceLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("totalSessions")}
                  </TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("totalStudents")}
                  </TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("attendanceRate")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceReport?.data?.map((group: any) => (
                  <TableRow key={group.group_id}>
                    <TableCell className="font-medium">
                      {group.group_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {group.total_sessions}
                    </TableCell>
                    <TableCell className="text-right">
                      {group.total_students}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          group.attendance_percentage >= 80
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : group.attendance_percentage >= 60
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }
                      >
                        {group.attendance_percentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableEmpty
                    title={t("noAttendanceData")}
                    description={t("attendanceDataWillAppear")}
                  />
                )}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      {/* DEBTORS TAB */}
      {activeTab === "debtors" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-64">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("group")}
                  </label>
                  <select
                    value={selectedGroupId || ""}
                    onChange={(e) => {
                      setSelectedGroupId(
                        e.target.value ? Number(e.target.value) : null,
                      );
                      setDebtorsPage(1);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={groupsLoading}
                  >
                    <option value="">{t("allGroups")}</option>
                    {groupsLoading ? (
                      <option value="" disabled>
                        {t("loading")}
                      </option>
                    ) : groupsList && groupsList.length > 0 ? (
                      groupsList.map((group: GroupRead) => (
                        <option key={group.id} value={String(group.id)}>
                          {group.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {t("noGroupsAvailable")}
                      </option>
                    )}
                  </select>
                </div>

                <div className="w-56">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("paymentYear") || "Year"}
                  </label>
                  <select
                    value={unpaidYear}
                    onChange={(e) => {
                      setUnpaidYear(e.target.value ? Number(e.target.value) : "");
                      setDebtorsPage(1);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t("allYears") || "All years"}</option>
                    {[
                      currentYear - 2,
                      currentYear - 1,
                      currentYear,
                      currentYear + 1,
                    ].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-56">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("month") || "Month"}
                  </label>
                  <select
                    value={unpaidMonth}
                    onChange={(e) => {
                      setUnpaidMonth(e.target.value ? Number(e.target.value) : "");
                      if (e.target.value) {
                        setUnpaidMonths("");
                      }
                      setDebtorsPage(1);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{t("allMonths") || "All months"}</option>
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-56">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("months") || "Months"}
                  </label>
                  <Input
                    type="text"
                    value={unpaidMonths}
                    onChange={(e) => {
                      setUnpaidMonths(e.target.value);
                      if (e.target.value.trim() !== "") {
                        setUnpaidMonth("");
                      }
                      setDebtorsPage(1);
                    }}
                    placeholder="1,2,3"
                    className="h-10"
                  />
                </div>

                <div className="w-56">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("fromDate")}
                  </label>
                  <Input
                    type="date"
                    value={unpaidFromDate}
                    onChange={(e) => {
                      setUnpaidFromDate(e.target.value);
                      setDebtorsPage(1);
                    }}
                    className="h-10"
                  />
                </div>

                <div className="w-56">
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {t("toDate")}
                  </label>
                  <Input
                    type="date"
                    value={unpaidToDate}
                    onChange={(e) => {
                      setUnpaidToDate(e.target.value);
                      setDebtorsPage(1);
                    }}
                    className="h-10"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedGroupId(null);
                    setMinDebtAmount("");
                    setUnpaidYear(currentYear);
                    setUnpaidMonth(currentMonth);
                    setUnpaidMonths("");
                    setUnpaidFromDate("");
                    setUnpaidToDate("");
                    setDebtorsPage(1);
                  }}
                >
                  {t("clearFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard
              title={t("totalDebtors")}
              value={
                debtorsLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground text-base font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("calculating")}
                  </span>
                ) : (
                  effectiveDebtorsData?.meta?.total || 0
                )
              }
              icon={
                debtorsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )
              }
            />
            <StatsCard
              title={t("totalDebtAmount")}
              value={
                isTotalDebtLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground text-base font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("calculating")}
                  </span>
                ) : (
                  formatCurrency(totalDebtAmount)
                )
              }
              icon={
                isTotalDebtLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <CreditCard className="w-6 h-6" />
                )
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("debtorsList")}</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentId") || "Student ID"}</TableHead>
                  <TableHead>{t("student")}</TableHead>
                  <TableHead>{t("guardian") || "Guardian"}</TableHead>
                  <TableHead>Ota/Ona</TableHead>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("contractNumber")}</TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("debtAmount")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtorsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">
                          Qarzdorlar hisoblanmoqda...
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : effectiveDebtorsData?.data && effectiveDebtorsData.data.length > 0 ? (
                  effectiveDebtorsData.data.map((debtor: DebtorItem) => (
                    <TableRow key={`${debtor.student_id}-${debtor.contract_number}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{debtor.student_id}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium text-left hover:underline hover:text-primary transition-colors"
                          onClick={() => handleOpenStudentDetail(debtor.student_id)}
                        >
                          {debtor.student_name}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-xs leading-5">
                        <div>
                          <span className="text-muted-foreground mr-1">Vasiy:</span>
                          <span>{formatPhone(debtor.primary_phone)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs leading-5 space-y-1">
                        <div>
                          <span className="text-muted-foreground mr-1">Ota:</span>
                          <span>{formatPhone(debtor.father_phone)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground mr-1">Ona:</span>
                          <span>{formatPhone(debtor.mother_phone)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {debtor.group_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{debtor.contract_number}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(debtor.debt_amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty
                    icon={<CheckCircle className="w-12 h-12 text-green-500" />}
                    title={t("noDebtors")}
                    description={t("allStudentsPaid")}
                  />
                )}
              </TableBody>
            </Table>

            {effectiveDebtorsData?.meta && effectiveDebtorsData.meta.total_pages > 1 && (
              <TablePagination
                currentPage={debtorsPage}
                totalPages={effectiveDebtorsData.meta.total_pages}
                totalItems={effectiveDebtorsData.meta.total}
                pageSize={debtorsPageSize}
                onPageChange={setDebtorsPage}
              />
            )}
          </Card>
        </motion.div>
      )}

      {activeTab === "payers" && <PayersReport />}
    </div>
  );
}
