/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  publicService,
  contractService,
  groupService,
  headCoachService,
} from "@/services/api.service";
import { motion } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  CalendarDays,
  Users,
  Plus,
  BarChart2,
  FileText,
  Loader2,
  Search,
  CheckCircle,
  AlertCircle,
  Download,
  Activity,
  UserCheck,
  Clock,
  Trophy,
  TrendingUp,
  Eye,
  UserCog,
} from "lucide-react";

import { format } from "date-fns";
import { toast } from "react-hot-toast";
import type {
  SessionCreateRequest,
  SessionRead,
  GroupRead,
  ContractInfoPublic,
} from "@/types/api";

// Reusable Components
import WeeklyTimeTable from "@/components/timetable/WeeklyTimeTable";
import SessionDetailsDialog from "@/components/timetable/SessionDetailsDialog";
import { SessionDialog } from "@/pages/coach/SessionDialog";

export default function HeadCoach() {
  const queryClient = useQueryClient();

  // --- States ---
  const [activeTab, setActiveTab] = useState("overview");
  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(
    null
  );
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionDialogInitialData, setSessionDialogInitialData] = useState<
    Partial<SessionCreateRequest> | undefined
  >(undefined);

  // Contract Search States
  const [contractNumber, setContractNumber] = useState("");
  const [contractResult, setContractResult] =
    useState<ContractInfoPublic | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  // --- API Queries ---
  const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => groupService.getGroups({ page_size: 500 }),
    select: (data) => data.data,
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions", filterGroupId],
    queryFn: () =>
      headCoachService.getAllSessions(
        filterGroupId === "all"
          ? undefined
          : { group_id: Number(filterGroupId) }
      ),
    select: (data) => data.data,
  });

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["headCoachStats"],
    queryFn: () => headCoachService.getHeadCoachStats(),
  });

  // --- Mutations ---
  const searchContractMutation = useMutation({
    mutationFn: (number: string) => publicService.getContractInfo(number),
    onSuccess: (data) => {
      setContractResult(data);
      setContractError(null);
      toast.success("Shartnoma ma'lumotlari topildi");
    },
    onError: (err: any) => {
      setContractResult(null);
      setContractError(err.response?.data?.detail || "Shartnoma topilmadi");
      toast.error("Shartnoma topilmadi");
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: (data: { year: number; number: string }) =>
      contractService.getContract(data.year, data.number),
    onSuccess: (data: { pdf_url: string }) => {
      window.open(data.pdf_url, "_blank");
      toast.success("PDF ochilmoqda...");
    },
    onError: () => toast.error("Faylni yuklashda xatolik"),
  });

  // --- Memoized Values ---
  const selectedGroupForDialog = useMemo(() => {
    return groups.find((g) => g.id === selectedSession?.group_id);
  }, [selectedSession, groups]);

  const groupColorMap = useMemo(() => {
    const colorClasses = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
      "bg-rose-500",
      "bg-indigo-500",
    ];
    const map = new Map<number, string>();
    groups.forEach((group, index) => {
      map.set(group.id, colorClasses[index % colorClasses.length]);
    });
    return map;
  }, [groups]);

  // Statistics calculations
  const totalCapacity = useMemo(
    () => groups.reduce((sum, g) => sum + g.capacity, 0),
    [groups]
  );

  const occupancyRate = useMemo(
    () =>
      totalCapacity > 0
        ? (((stats?.active_students_count || 0) / totalCapacity) * 100).toFixed(
            1
          )
        : "0",
    [stats, totalCapacity]
  );

  const filteredGroups = useMemo(() => {
    if (filterGroupId === "all") {
      return groups;
    }
    return groups.filter((g) => g.id.toString() === filterGroupId);
  }, [groups, filterGroupId]);

  const upcomingSessions = useMemo(
    () => sessions.filter((s) => new Date(s.session_date) > new Date()).length,
    [sessions]
  );

  // --- Handlers ---
  const handleSessionClick = (session: SessionRead) => {
    setSelectedSession(session);
    setDetailsDialogOpen(true);
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    setSessionDialogInitialData({ session_date: date, start_time: time });
    setSessionDialogOpen(true);
  };

  const handleCreateNewSession = () => {
    setSessionDialogInitialData(undefined);
    setSessionDialogOpen(true);
  };

  const handleCheckContract = () => {
    if (!contractNumber.trim()) return;
    searchContractMutation.mutate(contractNumber);
  };

  const handleDownloadPdf = () => {
    if (!contractResult) return;
    const year = new Date(contractResult.start_date).getFullYear();
    downloadPdfMutation.mutate({
      year,
      number: contractResult.contract_number,
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";

  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10 rounded-2xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Bosh Murabbiy Paneli
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                  To'liq nazorat va boshqaruv tizimi
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleCreateNewSession}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yangi Mashg'ulot
            </Button>
          </div>
        </div>
      </motion.div>

      {/* MAIN TABS */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Umumiy Ko'rinish
          </TabsTrigger>
          <TabsTrigger
            value="timetable"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Jadval
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <Users className="w-4 h-4 mr-2" />
            Guruhlar
          </TabsTrigger>
          <TabsTrigger
            value="contract"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <FileText className="w-4 h-4 mr-2" />
            Shartnomalar
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Faol Guruhlar
                  </CardTitle>
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {isStatsLoading ? (
                    <Loader2 className="animate-spin w-8 h-8" />
                  ) : (
                    stats?.active_groups_count ?? 0
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Barcha mavjud guruhlar
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Faol Studentlar
                  </CardTitle>
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {isStatsLoading ? (
                    <Loader2 className="animate-spin w-8 h-8" />
                  ) : (
                    stats?.active_students_count ?? 0
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  To'ldirish:{" "}
                  <span className="font-semibold text-emerald-600">
                    {occupancyRate}%
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Bugungi Mashg'ulotlar
                  </CardTitle>
                  <CalendarDays className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {isStatsLoading ? (
                    <Loader2 className="animate-spin w-8 h-8" />
                  ) : (
                    stats?.today_sessions_count ?? 0
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Kelayotgan:{" "}
                  <span className="font-semibold">{upcomingSessions}</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    O'rtacha Davomat
                  </CardTitle>
                  <Activity className="h-5 w-5 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {isStatsLoading ? (
                    <Loader2 className="animate-spin w-8 h-8" />
                  ) : (
                    `${stats?.this_month_attendance_percentage ?? 0}%`
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Shu oylik ko'rsatkich
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions & System Info */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Tezkor Amallar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleCreateNewSession}
                  variant="outline"
                  className="w-full justify-start hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Yangi Mashg'ulot Qo'shish
                </Button>
                <Button
                  onClick={() => setActiveTab("groups")}
                  variant="outline"
                  className="w-full justify-start hover:bg-emerald-50"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Guruhlarni Ko'rish
                </Button>
                <Button
                  onClick={() => setActiveTab("contract")}
                  variant="outline"
                  className="w-full justify-start hover:bg-purple-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Shartnomani Tekshirish
                </Button>
              </CardContent>
            </Card>

            {/* System Info */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-500" />
                  Tizim Holati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Jami Sig'im</span>
                  <span className="font-semibold">{totalCapacity} o'rin</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">To'ldirilgan</span>
                  <Badge variant="outline" className="bg-emerald-50">
                    {stats?.active_students_count ?? 0} / {totalCapacity}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Bo'sh O'rinlar</span>
                  <span className="font-semibold text-orange-600">
                    {totalCapacity - (stats?.active_students_count ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TIMETABLE TAB */}
        <TabsContent value="timetable" className="space-y-4">
          <div className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold">Mashg'ulotlar Jadvali</h2>
            <Select value={filterGroupId} onValueChange={setFilterGroupId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Guruhni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha Guruhlar</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSessionsLoading || isGroupsLoading ? (
            <div className="flex justify-center items-center h-96 bg-white/80 rounded-xl">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
          ) : (
            <WeeklyTimeTable
              sessions={sessions}
              groups={groups}
              onSessionClick={handleSessionClick}
              onTimeSlotClick={handleTimeSlotClick}
              showCreateButton
            />
          )}
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold">Guruhlar</h2>
            <Select value={filterGroupId} onValueChange={setFilterGroupId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Guruhni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha Guruhlar</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredGroups.map((group) => (
              <Card
                key={group.id}
                className="group hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <div className={`h-2 ${groupColorMap.get(group.id)}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant="secondary">
                      {group.active_students_count}/{group.capacity}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <UserCog className="w-3 h-3" />
                    {group.coach_first_name} {group.coach_last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Jadval:</span>
                      <span className="font-medium">{group.schedule_days}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Vaqt:</span>
                      <span className="font-medium">{group.schedule_time}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${groupColorMap.get(
                          group.id
                        )} transition-all duration-500`}
                        style={{
                          width: `${
                            (group.active_students_count / group.capacity) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full group-hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Batafsil
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </motion.div>
        </TabsContent>

        {/* CONTRACT TAB */}
        <TabsContent value="contract" className="space-y-6">
          <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Shartnoma Qidirish</CardTitle>
                <CardDescription>
                  Student shartnoma raqamini kiriting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Shartnoma raqami (21-2015C2)"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCheckContract();
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={handleCheckContract}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={
                      searchContractMutation.isPending || !contractNumber
                    }
                  >
                    {searchContractMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    <Search className="w-4 h-4 mr-2" />
                    Qidirish
                  </Button>
                </div>
                {contractError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {contractError}
                  </div>
                )}
              </CardContent>
            </Card>

            {contractResult && (
              <Card className="shadow-lg border-t-4 border-t-emerald-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <CardTitle>
                      {contractResult.student_first_name}{" "}
                      {contractResult.student_last_name}
                    </CardTitle>
                  </div>
                  <CardDescription className="font-mono">
                    {contractResult.contract_number}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">
                        Oylik To'lov
                      </span>
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(contractResult.monthly_fee)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Joriy Qarz</span>
                      <p
                        className={`font-semibold ${
                          contractResult.current_debt > 0
                            ? "text-red-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {formatCurrency(contractResult.current_debt)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <span className="text-xs text-slate-500">
                      Boshlanish Sanasi
                    </span>
                    <p className="font-medium">
                      {format(
                        new Date(contractResult.start_date),
                        "dd.MM.yyyy"
                      )}
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={downloadPdfMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {downloadPdfMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    PDF Yuklash
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}
      <SessionDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        session={selectedSession}
        group={selectedGroupForDialog}
        groupColorClass={
          selectedSession
            ? groupColorMap.get(selectedSession.group_id)
            : undefined
        }
        showActions
        onEdit={(session) => {
          setSessionDialogInitialData(session);
          setSessionDialogOpen(true);
        }}
        onDelete={(session) => {
          toast.error("O'chirish funksiyasi ishlab chiqilmoqda");
        }}
      />

      <SessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        groups={groups}
        initialData={sessionDialogInitialData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          queryClient.invalidateQueries({ queryKey: ["headCoachStats"] });
        }}
      />
    </div>
  );
}