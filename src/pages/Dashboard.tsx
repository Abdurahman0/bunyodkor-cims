/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
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
import type { TransactionRead, GroupRead, AttendanceRead } from "@/types/api";
import { format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { t, language } = useLanguageStore();

  const queryClient = useQueryClient();

  // "Rolling day" key so all date-based widgets refresh automatically at 00:00
  const [dayKey, setDayKey] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const parseLocalDateKey = useCallback((dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, []);

  useEffect(() => {
    const now = new Date();
    const currentDay = parseLocalDateKey(dayKey);
    const nextMidnight = new Date(currentDay);
    nextMidnight.setDate(currentDay.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);

    const ms = Math.max(nextMidnight.getTime() - now.getTime(), 0);
    const timer = window.setTimeout(() => {
      const newKey = format(new Date(), "yyyy-MM-dd");
      setDayKey(newKey);

      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-finance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-finance-rolling-week"] });
      queryClient.invalidateQueries({ queryKey: ["recent-attendances"] });
    }, ms + 250);

    return () => window.clearTimeout(timer);
  }, [dayKey, parseLocalDateKey, queryClient]);

  const formatChartDate = useCallback((date: Date, type: "short" | "long") => {
    const day = date.getDate();
    const weekdayIndex = date.getDay();
    const monthIndex = date.getMonth();

    const names = {
      uz: {
        weekdaysShort: ["Yak", "Dush", "Sesh", "Chor", "Pay", "Juma", "Shan"],
        weekdaysLong: [
          "Yakshanba",
          "Dushanba",
          "Seshanba",
          "Chorshanba",
          "Payshanba",
          "Juma",
          "Shanba",
        ],
        months: [
          "Yanvar",
          "Fevral",
          "Mart",
          "Aprel",
          "May",
          "Iyun",
          "Iyul",
          "Avgust",
          "Sentabr",
          "Oktabr",
          "Noyabr",
          "Dekabr",
        ],
      },
      ru: {
        weekdaysShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
        weekdaysLong: [
          "Воскресенье",
          "Понедельник",
          "Вторник",
          "Среда",
          "Четверг",
          "Пятница",
          "Суббота",
        ],
        months: [
          "Январь",
          "Февраль",
          "Март",
          "Апрель",
          "Май",
          "Июнь",
          "Июль",
          "Август",
          "Сентябрь",
          "Октябрь",
          "Ноябрь",
          "Декабрь",
        ],
      },
      en: {
        weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        weekdaysLong: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        months: [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ],
      },
    } as const;

    const lang = language === "ru" ? "ru" : language === "en" ? "en" : "uz";
    const dict = names[lang];

    if (type === "short") return dict.weekdaysShort[weekdayIndex];
    return `${day} ${dict.weekdaysLong[weekdayIndex]}, ${dict.months[monthIndex]}`;
  }, [language]);

  const { data: summaryData } = useQuery({
    queryKey: ["dashboard-summary", dayKey],
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
    queryKey: ["dashboard-finance", dayKey],
    queryFn: () => {
      const today = dayKey;
      const thirtyDaysAgo = format(
        subDays(parseLocalDateKey(dayKey), 30),
        "yyyy-MM-dd",
      );
      return reportService.getFinanceReport({
        from_date: thirtyDaysAgo,
        to_date: today,
      });
    },
  });

  const { data: weeklyRevenueTrendData } = useQuery({
    queryKey: ["dashboard-finance-rolling-week", dayKey],
    queryFn: async () => {
      // Rolling 7 days: [today-6 ... today], based on local date key
      const today = parseLocalDateKey(dayKey);
      today.setHours(0, 0, 0, 0);

      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
      });

      const dailyReports = await Promise.all(
        dates.map(async (d) => {
          const date = format(d, "yyyy-MM-dd");
          try {
            const res = await reportService.getFinanceReport({
              from_date: date,
              to_date: date,
            });

            return {
              date,
              value: Number(res.data?.total_revenue || 0),
            };
          } catch {
            return { date, value: 0 };
          }
        }),
      );

      return dailyReports;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
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

  // Fetch attendance data with date-only params (API expects exact dates)
  const { data: recentAttendancesData } = useQuery({
    queryKey: ["recent-attendances", dayKey],
    queryFn: () => {
      const today = parseLocalDateKey(dayKey);
      const fromDate = format(subDays(today, 1), "yyyy-MM-dd");
      const toDate = dayKey;

      return attendanceService.getAllAttendances({
        from_date: fromDate,
        to_date: toDate,
        page: 1,
        page_size: 200,
      });
    },
  });

  const todayDateKey = dayKey;
  const recentAttendances = useMemo(
    () =>
      [...(recentAttendancesData?.data || [])]
        .filter(
          (attendance) =>
            format(new Date(attendance.created_at), "yyyy-MM-dd") ===
            todayDateKey,
        )
        .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [recentAttendancesData?.data, todayDateKey],
  );

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

  // Process weekly revenue trend and keep today's point in sync with summary card
  const revenueData = useMemo(() => {
    const todayStr = dayKey;
    const todayRevenue = Number(summary?.today_revenue || 0);
    const safeTodayRevenue = Number.isFinite(todayRevenue) ? todayRevenue : 0;

    return (weeklyRevenueTrendData || []).map((item) => {
      const dateObj = parseLocalDateKey(item.date);
      const baseValue = Number.isFinite(item.value) ? item.value : 0;
      const syncedValue = item.date === todayStr ? safeTodayRevenue : baseValue;

      return {
        ...item,
        value: syncedValue,
        label: formatChartDate(dateObj, "short"),
        tooltipLabel: formatChartDate(dateObj, "long"),
      };
    });
  }, [weeklyRevenueTrendData, dayKey, formatChartDate, parseLocalDateKey, summary?.today_revenue]);

  // Attendance data - using group attendance reports for aggregate data
  useQuery({
    queryKey: ["group-attendance-reports"],
    queryFn: () => reportService.getGroupAttendanceReports(),
  });

  // Process attendance data from recent attendances
  const attendanceChartData = (() => {
    const attendances = recentAttendances;
    const present = attendances.filter((a) => a.status === "present").length;
    const absent = attendances.filter((a) => a.status === "absent").length;
    const late = attendances.filter((a) => a.status === "late").length;

    return [
      { label: t("present"), value: present || 0, color: "hsl(142, 71%, 45%)" },
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
                  {t("weeklyRevenueTrends")} - {t("weeklyRangeMondayToSunday")}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent className="pb-6">
              <LineChart
                data={revenueData}
                height={250}
                curved={false}
                startFromZero
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
                {t("distributionByMethod")} - {t("last30Days")}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <DonutChart
                data={paymentSourcesData}
                size={200}
                centerValue={paymentSourcesData.reduce(
                  (a: any, b: any) => a + b.value,
                  0,
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
                {recentAttendances.length > 0 ? (
                  recentAttendances
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
