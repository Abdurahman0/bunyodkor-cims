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
// Select komponentini import qilamiz (boshqa qismlar shart emas)
import { Select } from "@/components/ui/select";
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
  const { data: groups = [] } = useQuery({
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

  const { data: stats } = useQuery({
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
      contractService.getContractPdf(data.year, data.number),
    onSuccess: (data: { pdf_url: string }) => {
      if (data?.pdf_url) {
        window.open(data.pdf_url, "_blank");
        toast.success("PDF ochilmoqda...");
      } else {
        toast.error("PDF havolasi topilmadi");
      }
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Bosh Murabbiy Paneli
              </h1>
              <p className="text-muted-foreground text-sm">
                Markaziy boshqaruv tizimi
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreateNewSession}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Yangi Mashg'ulot
          </Button>
        </div>
      </motion.div>

      {/* TABS */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-white dark:bg-slate-800 p-1 border">
          <TabsTrigger value="overview">
            <BarChart2 className="w-4 h-4 mr-2" /> Umumiy
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <CalendarDays className="w-4 h-4 mr-2" /> Jadval
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="w-4 h-4 mr-2" /> Guruhlar
          </TabsTrigger>
          <TabsTrigger value="contract">
            <FileText className="w-4 h-4 mr-2" /> Shartnoma
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faol Guruhlar
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.active_groups_count ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faol Studentlar
                </CardTitle>
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.active_students_count ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  To'ldirish: {occupancyRate}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bugungi darslar
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.today_sessions_count ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Davomat
                </CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.this_month_attendance_percentage ?? 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tezkor Amallar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleCreateNewSession}
                >
                  <Plus className="mr-2 h-4 w-4" /> Yangi Mashg'ulot
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab("groups")}
                >
                  <Users className="mr-2 h-4 w-4" /> Guruhlarni ko'rish
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TIMETABLE TAB */}
        <TabsContent value="timetable" className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg border">
            <h2 className="text-lg font-semibold">Dars Jadvali</h2>

            {/* O'ZGARTIRILGAN SELECT (Simple) */}
            <Select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="w-[200px]"
            >
              <option value="all">Barcha Guruhlar</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id.toString()}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>

          {isSessionsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="animate-spin" />
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
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg border">
            <h2 className="text-lg font-semibold">Guruhlar Ro'yxati</h2>

            {/* O'ZGARTIRILGAN SELECT (Simple) */}
            <Select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="w-[200px]"
            >
              <option value="all">Barcha Guruhlar</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id.toString()}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-md transition-shadow"
              >
                <div
                  className={`h-1.5 w-full ${groupColorMap.get(
                    group.id
                  )} rounded-t-xl`}
                />
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant="outline">
                      {group.active_students_count}/{group.capacity}
                    </Badge>
                  </div>
                  <CardDescription>
                    {group.coach_first_name} {group.coach_last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>
                      Kunlar:{" "}
                      <span className="text-foreground">
                        {group.schedule_days}
                      </span>
                    </p>
                    <p>
                      Vaqt:{" "}
                      <span className="text-foreground">
                        {group.schedule_time}
                      </span>
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-blue-600"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Batafsil
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CONTRACT TAB */}
        <TabsContent value="contract" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card>
              <CardHeader>
                <CardTitle>Shartnoma Qidirish</CardTitle>
                <CardDescription>
                  Shartnoma raqamini kiriting (masalan: 21-2015C2)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Shartnoma raqami..."
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCheckContract()
                    }
                  />
                  <Button
                    onClick={handleCheckContract}
                    disabled={searchContractMutation.isPending}
                  >
                    {searchContractMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Search />
                    )}
                  </Button>
                </div>
                {contractError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {contractError}
                  </div>
                )}
              </CardContent>
            </Card>

            {contractResult && (
              <Card className="border-t-4 border-t-emerald-500">
                <CardHeader>
                  <CardTitle>
                    {contractResult.student_first_name}{" "}
                    {contractResult.student_last_name}
                  </CardTitle>
                  <CardDescription>
                    {contractResult.contract_number}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Oylik To'lov</p>
                      <p className="font-semibold">
                        {formatCurrency(contractResult.monthly_fee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Joriy Qarz</p>
                      <p
                        className={`font-semibold ${
                          contractResult.current_debt > 0
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(contractResult.current_debt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadPdf}
                    disabled={downloadPdfMutation.isPending}
                  >
                    {downloadPdfMutation.isPending ? (
                      <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    ) : (
                      <Download className="mr-2 w-4 h-4" />
                    )}
                    PDF Yuklash
                  </Button>
                </CardContent>
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
