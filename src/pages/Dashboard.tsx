import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, DonutChart, LineChart } from "@/components/ui/charts";
import {
  Users,
  GraduationCap,
  CreditCard,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import {
  reportService,
  transactionService,
  groupService,
  studentService,
  userService,
  attendanceService,
} from "@/services/api.service";
import type {
  DashboardSummary,
  TransactionRead,
  GroupRead,
  StudentRead,
  UserRead,
  FinanceReport,
  AttendanceRead,
} from "@/types/api";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();

  const { data: summaryData } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => reportService.getDashboardSummary(),
  });
  const summary = summaryData?.data;

  const { data: transactionsData } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: () =>
      transactionService.getTransactions({ page: 1, page_size: 5 }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ["groups-stats"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 4 }),
  });

  const { data: coachesData } = useQuery({
    queryKey: ["coaches-list"],
    queryFn: () => userService.getCoaches({}),
  });

  const { data: financeData } = useQuery({
    queryKey: ["dashboard-finance"],
    queryFn: () => {
      // Check if finance report also needs datetime format or accepts date format
      const today = format(new Date(), "yyyy-MM-dd");
      const weekAgo = format(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      );
      return reportService.getFinanceReport({
        from_date: weekAgo,
        to_date: today,
      });
    },
  });

  const { data: revenueTransactionsData } = useQuery({
    queryKey: ["revenue-transactions"],
    queryFn: () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const weekAgo = format(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      );
      return transactionService.getTransactions({
        from_date: weekAgo,
        to_date: today,
        page: 1,
        page_size: 1000,
      });
    },
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Use compact formatting for large numbers in stats cards
  const formatCurrency = (amount: number, compact: boolean = true) => {
    return formatCurrencyUtil(amount, "UZS", "uz-UZ", compact);
  };

  const formatSource = (source: string) => {
    // Remove any "Paymentsource." or "PaymentSource." prefix and format properly
    const cleanSource =
      source?.toString().replace(/^.*\./, "").toLowerCase() || "";
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1);
  };

  // Fetch recent attendances (today's attendances)
  const { data: recentAttendancesData } = useQuery({
    queryKey: ["recent-attendances"],
    queryFn: () => {
      const today = format(new Date(), "yyyy-MM-dd");
      return attendanceService.getAllAttendances({
        from_date: today,
        to_date: today,
        page: 1,
        page_size: 10,
      });
    },
  });

  // Extract unique student IDs from transactions and attendances
  const uniqueStudentIds = useMemo(() => {
    const ids = new Set<number>();

    // Add student IDs from transactions
    transactionsData?.data?.forEach((tx) => {
      if (tx.student_id) ids.add(tx.student_id);
    });

    // Add student IDs from attendances
    recentAttendancesData?.data?.forEach((attendance) => {
      if (attendance.student_id) ids.add(attendance.student_id);
    });

    return Array.from(ids);
  }, [transactionsData, recentAttendancesData]);

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
    const s = student as unknown as {
      full_name?: string;
      first_name?: string;
      last_name?: string;
    };
    const full =
      (s.full_name && String(s.full_name)) ||
      `${s.first_name || ""} ${s.last_name || ""}`;
    return String(full).trim();
  };

  const getCoachName = (id: number) =>
    coachesData?.data?.find((c) => c.id === id)?.full_name || `ID: ${id}`;
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

  const paymentSourcesData =
    financeData?.data?.breakdown?.map((item) => ({
      label: formatSource(item.source),
      value: item.transaction_count,
    })) || [];

  // Process revenue data from transactions (last 7 days)
  const revenueData = (() => {
    const transactions = revenueTransactionsData?.data || [];
    const dailyRevenue: { [key: string]: number } = {};

    // Initialize last 7 days with 0
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = format(d, "yyyy-MM-dd");
      dailyRevenue[dateKey] = 0;
    }

    // Sum up transactions by day (only last 7 days, only success status)
    transactions.forEach((tx: TransactionRead) => {
      if (tx.paid_at && tx.status === "success") {
        const txDate = new Date(tx.paid_at);
        const dateKey = format(txDate, "yyyy-MM-dd");
        if (dailyRevenue.hasOwnProperty(dateKey)) {
          dailyRevenue[dateKey] += tx.amount;
        }
      }
    });

    // Convert to chart format
    return Object.entries(dailyRevenue).map(([date, value]) => ({
      label: format(new Date(date), "EEE"),
      value: value,
    }));
  })();

  // Attendance data - using group attendance reports for aggregate data
  const { data: groupAttendanceData } = useQuery({
    queryKey: ["group-attendance-reports"],
    queryFn: () => reportService.getGroupAttendanceReports(),
  });

  // Process attendance data from recent attendances
  const attendanceChartData = (() => {
    const attendances = recentAttendancesData?.data || [];
    const present = attendances.filter((a) => a.status === "present").length;
    const absent = attendances.filter((a) => a.status === "absent").length;
    const late = attendances.filter((a) => a.status === "late").length;

    return [
      { label: t("present"), value: present || 1, color: "hsl(142, 71%, 45%)" },
      { label: t("absent"), value: absent || 0, color: "hsl(0, 84%, 60%)" },
      { label: t("late"), value: late || 0, color: "hsl(47, 96%, 53%)" },
    ];
  })();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("welcomeBack")}, {user?.full_name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">{t("todayActivity")}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          <Calendar className="inline-block w-4 h-4 mr-1" />
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
      >
        <motion.div variants={itemVariants}>
          <StatsCard
            title={t("todayRevenue")}
            value={formatCurrency(summary?.today_revenue || 0)}
            icon={<CreditCard className="w-6 h-6" />}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title={t("activeStudents")}
            value={summary?.active_students || 0}
            icon={<Users className="w-6 h-6" />}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title={t("totalDebtors")}
            value={summary?.total_debtors || 0}
            icon={<AlertTriangle className="w-6 h-6" />}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title={t("todaySessions")}
            value={summary?.today_sessions || 0}
            icon={<GraduationCap className="w-6 h-6" />}
          />
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {t("revenueOverview")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("weeklyRevenueTrends")}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent className="pb-6">
              <LineChart
                data={revenueData}
                height={250}
                showArea
                showDots
                showValues={false}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                {t("paymentSources")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("distributionByMethod")}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <DonutChart
                data={paymentSourcesData}
                size={200}
                centerValue={paymentSourcesData.reduce(
                  (a: any, b: any) => a + b.value,
                  0
                )}
                centerLabel="Total"
                showLegend
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                {t("todayAttendance")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("studentAttendanceStatus")}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <DonutChart
                data={attendanceChartData}
                size={200}
                centerValue={attendanceChartData
                  .reduce((sum, item) => sum + item.value, 0)
                  .toString()}
                centerLabel="Total"
                showLegend
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {t("recentTransactions")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("latestPaymentActivity")}
                </p>
              </div>
              <Link to="/finance">
                <Button variant="ghost" size="sm" className="gap-1">
                  {t("viewAll")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactionsData?.data
                  ?.slice(0, 5)
                  .map((tx: TransactionRead) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            tx.status === "success"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : tx.status === "pending"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.status === "success" ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : tx.status === "pending" ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {formatCurrency(tx.amount, false)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {tx.source} •{" "}
                            {getStudentName(tx.student_id!) || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs font-medium capitalize ${
                            tx.status === "success"
                              ? "text-green-600 dark:text-green-400"
                              : tx.status === "pending"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.paid_at!), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("noRecentTransactions")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">
                {t("quickActions")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("commonTasks")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/students">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                >
                  <Users className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">{t("addNewStudent")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("registerNewStudent")}
                    </p>
                  </div>
                </Button>
              </Link>
              <Link to="/finance">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                >
                  <CreditCard className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium">{t("recordPayment")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("addManualTransaction")}
                    </p>
                  </div>
                </Button>
              </Link>
              <Link to="/groups">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                >
                  <GraduationCap className="w-5 h-5 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium">{t("viewGroups")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("manageCourseGroups")}
                    </p>
                  </div>
                </Button>
              </Link>
              <Link to="/reports">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                >
                  <Activity className="w-5 h-5 text-orange-500" />
                  <div className="text-left">
                    <p className="font-medium">{t("viewReports")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("analyticsInsights")}
                    </p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {t("activeGroups")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("currentTrainingGroups")}
                </p>
              </div>
              <Link to="/groups">
                <Button variant="ghost" size="sm" className="gap-1">
                  {t("viewAll")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupsData?.data?.slice(0, 4).map((group: GroupRead) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {group.name?.charAt(0) || "G"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.schedule_days} • {group.schedule_time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {getCoachName(group.coach_id)}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("noActiveGroups")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {t("recentAttendance") || "Recent Attendance"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("todayAttendanceRecords") || "Today's attendance records"}
                </p>
              </div>
              <Link to="/attendance">
                <Button variant="ghost" size="sm" className="gap-1">
                  {t("viewAll")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAttendancesData?.data &&
                recentAttendancesData.data.length > 0 ? (
                  recentAttendancesData.data
                    .slice(0, 8)
                    .map((attendance: AttendanceRead) => (
                      <div
                        key={attendance.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              attendance.status === "present"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                : attendance.status === "late"
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {attendance.status === "present" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : attendance.status === "late" ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {getStudentName(attendance.student_id)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getStatusLabel(attendance.status)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-medium ${
                              attendance.status === "present"
                                ? "text-green-600 dark:text-green-400"
                                : attendance.status === "late"
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {getStatusLabel(attendance.status)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(attendance.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("noAttendanceRecords") || "No attendance records today"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {import.meta.env.VITE_USE_MOCK_API === "true" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    {t("mockApiActive")}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {t("mockApiMessage")} {t("mockApiConnectMessage")}{" "}
                    <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded">
                      VITE_USE_MOCK_API=false
                    </code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
