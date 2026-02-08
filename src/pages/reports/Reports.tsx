/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import type { GroupRead, UnpaidStudentInfo } from "@/types/api";

import PayersReport from "./PayersReport";
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  Download,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import toast from "react-hot-toast";
import { exportReport, downloadFile } from "@/lib/export-utils";
import { useLanguageStore } from "@/store/languageStore";
import {
  formatCurrency as formatCurrencyUtil,
  formatNumber,
} from "@/lib/utils";

export default function Reports() {
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<
    "finance" | "attendance" | "debtors" | "payers"
  >("finance");
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [debtorsPage, setDebtorsPage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // Unpaid students filters
  const [filterMode, setFilterMode] = useState<"month" | "dateRange">("month");
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    currentMonth,
  );
  const [selectedMonths, setSelectedMonths] = useState<string>(""); // comma-separated months
  const [unpaidDateRange, setUnpaidDateRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

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
      let allGroups: GroupRead[] = [];
      let currentPage = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await groupService.getGroups({ page: currentPage, page_size: 100 });
        if (response.data && response.data.length > 0) {
          allGroups = [...allGroups, ...response.data];
          if (response.meta && currentPage < response.meta.total_pages) {
            currentPage++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return { data: allGroups };
    },
    enabled: activeTab === "debtors",
  });

  // Normalize groups response in case API returns nested `data` (e.g. { data: { data: [...] } })
  const groupsList: GroupRead[] = useMemo(() => {
    if (!groupsData?.data) return [];
    return groupsData.data;
  }, [groupsData]);

  // Use unpaid students API instead of debtors report
  const { data: debtorsData, isLoading: debtorsLoading } = useQuery({
    queryKey: [
      "unpaid-students",
      debtorsPage,
      selectedGroupId,
      filterMode,
      selectedYear,
      selectedMonth,
      selectedMonths,
      unpaidDateRange,
    ],
    queryFn: () => {
      const params: any = {
        page: debtorsPage,
        page_size: 10,
        group_id: selectedGroupId || undefined,
      };

      if (filterMode === "month") {
        params.year = selectedYear;
        if (selectedMonths) {
          params.months = selectedMonths;
        } else if (selectedMonth) {
          params.month = selectedMonth;
        }
      } else {
        params.from_date = unpaidDateRange.from;
        params.to_date = unpaidDateRange.to;
      }

      return studentService.getUnpaidStudents(params);
    },
    enabled: activeTab === "debtors",
  });

  // Query to get the total debt amount
  const { data: totalDebtData } = useQuery({
    queryKey: [
      "unpaid-students-total",
      selectedGroupId,
      filterMode,
      selectedYear,
      selectedMonth,
      selectedMonths,
      unpaidDateRange,
    ],
    queryFn: async () => {
      const params: any = {
        page: 1,
        page_size: 100,
        group_id: selectedGroupId || undefined,
      };

      if (filterMode === "month") {
        params.year = selectedYear;
        if (selectedMonths) {
          params.months = selectedMonths;
        } else if (selectedMonth) {
          params.month = selectedMonth;
        }
      } else {
        params.from_date = unpaidDateRange.from;
        params.to_date = unpaidDateRange.to;
      }

      let allDebtors: any[] = [];
      let hasMore = true;
      let currentPage = 1;

      while (hasMore) {
        params.page = currentPage;
        const response = await studentService.getUnpaidStudents(params);
        if (response.data && response.data.length > 0) {
          allDebtors = [...allDebtors, ...response.data];
          if (response.meta && currentPage < response.meta.total_pages) {
            currentPage++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return { data: allDebtors };
    },
    enabled: activeTab === "debtors",
  });

  const totalDebtAmount =
    totalDebtData?.data?.reduce((acc, item) => acc + item.debt_amount, 0) || 0;

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, "UZS", "uz-UZ", false);
  };

  const formatSource = (source: string) => {
    const cleanSource =
      source?.toString().replace(/^.*\./, "").toLowerCase() || "";
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1);
  };

  // Helper to get Group Name by ID
  const getGroupName = (groupId: number | undefined) => {
    if (!groupId) return "N/A";
    // Use loose equality to handle string/number mismatches
    const group = groupsList.find((g: any) => g.id == groupId);
    return group ? group.name : "N/A";
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
    const params: any = {
      group_id: selectedGroupId || undefined,
      page_size: 10000,
    };

    if (filterMode === "month") {
      params.year = selectedYear;
      if (selectedMonths) {
        params.months = selectedMonths;
      } else if (selectedMonth) {
        params.month = selectedMonth;
      }
    } else {
      params.from_date = unpaidDateRange.from;
      params.to_date = unpaidDateRange.to;
    }

    const promise = studentService.exportUnpaidStudents(params);

    toast.promise(promise, {
      loading: t("exportingDebtorsReport"),
      success: (blob) => {
        const date = format(new Date(), "yyyy-MM-dd");
        downloadFile(blob, `unpaid-students-report-${date}.xlsx`);
        return t("reportExportedSuccessfully");
      },
      error: t("failedToExportReport"),
    });
  };

  const handleExport = () => {
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

        case "debtors":
          handleDebtorsExport();
          return; // Early return to avoid running the old logic
      }

      if (dataToExport) {
        exportReport(dataToExport, reportType);
        toast.success(t("reportExported"));
      }
    } catch (error) {
      toast.error(t("failedToExportReport"));
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
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />
          {t("exportReport")}
        </Button>
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
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={filterMode === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterMode("month")}
                  >
                    {t("byMonth")}
                  </Button>
                  <Button
                    variant={filterMode === "dateRange" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterMode("dateRange")}
                  >
                    {t("byDateRange")}
                  </Button>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  {filterMode === "month" ? (
                    <>
                      <div className="w-32">
                        <label className="text-sm font-medium text-foreground mb-1 block">
                          {t("year")}
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) => {
                            setSelectedYear(Number(e.target.value));
                            setDebtorsPage(1);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
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

                      <div className="w-48">
                        <label className="text-sm font-medium text-foreground mb-1 block">
                          {t("month")}
                        </label>
                        <select
                          value={selectedMonth || ""}
                          onChange={(e) => {
                            setSelectedMonth(
                              e.target.value ? Number(e.target.value) : null,
                            );
                            setSelectedMonths("");
                            setDebtorsPage(1);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">{t("allMonths")}</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (month) => (
                              <option key={month} value={month}>
                                {format(new Date(2000, month - 1), "MMMM")}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div className="w-48">
                        <label className="text-sm font-medium text-foreground mb-1 block">
                          {t("multipleMonths")}
                        </label>
                        <Input
                          value={selectedMonths}
                          onChange={(e) => {
                            setSelectedMonths(e.target.value);
                            setSelectedMonth(null);
                            setDebtorsPage(1);
                          }}
                          placeholder="1,2,3"
                          className="h-10"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">
                          {t("fromDate")}
                        </label>
                        <Input
                          type="date"
                          value={unpaidDateRange.from}
                          onChange={(e) => {
                            setUnpaidDateRange({
                              ...unpaidDateRange,
                              from: e.target.value,
                            });
                            setDebtorsPage(1);
                          }}
                          className="w-40"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">
                          {t("toDate")}
                        </label>
                        <Input
                          type="date"
                          value={unpaidDateRange.to}
                          onChange={(e) => {
                            setUnpaidDateRange({
                              ...unpaidDateRange,
                              to: e.target.value,
                            });
                            setDebtorsPage(1);
                          }}
                          className="w-40"
                        />
                      </div>
                    </>
                  )}

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
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard
              title={t("totalDebtors")}
              value={debtorsData?.meta?.total || 0}
              icon={<AlertTriangle className="w-6 h-6" />}
            />
            <StatsCard
              title={t("totalDebtAmount")}
              value={formatCurrency(totalDebtAmount)}
              icon={<CreditCard className="w-6 h-6" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("debtorsList")}</CardTitle>
            </CardHeader>
            <Table isLoading={debtorsLoading || groupsLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("student")}</TableHead>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("activeContracts")}
                  </TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("totalExpected")}
                  </TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("totalPaid")}
                  </TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("debtAmount")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtorsData?.data && debtorsData.data.length > 0 ? (
                  debtorsData.data.map((debtor: UnpaidStudentInfo) => (
                    <TableRow key={debtor.student.id}>
                      <TableCell className="font-medium">
                        {debtor.student.first_name} {debtor.student.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getGroupName(debtor.student.group_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {debtor.student.phone}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {debtor.active_contracts_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(debtor.total_expected)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {formatCurrency(debtor.total_paid)}
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

            {debtorsData?.meta && debtorsData.meta.total_pages > 1 && (
              <TablePagination
                currentPage={debtorsPage}
                totalPages={debtorsData.meta.total_pages}
                totalItems={debtorsData.meta.total}
                pageSize={10}
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
