/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  coachService,
  publicService,
  contractService, // Keep contractService for contract-related operations
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CheckCircle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  AlertCircle,
  Download,
  Activity,
  UserCheck,
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
import { SessionDialog } from "@/pages/coach/SessionDialog"; // Reusing the create/edit dialog

// Main Component
export default function HeadCoach() {
  const queryClient = useQueryClient();

  // --- States ---
  const [activeTab, setActiveTab] = useState("timetable");
  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(
    null
  );
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [
    sessionDialogInitialData,
    setSessionDialogInitialData,
  ] = useState<Partial<SessionCreateRequest> | undefined>(undefined);

  // --- Contract Check States ---
  const [contractNumber, setContractNumber] = useState("");
  const [contractResult, setContractResult] =
    useState<ContractInfoPublic | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  // --- API Queries ---
  const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => groupService.getGroups({ page_size: 500 }), // Fetch all groups
    select: (data) => data.data,
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions", filterGroupId],
    queryFn: () =>
      headCoachService.getAllSessions(
        filterGroupId === "all" ? undefined : { group_id: Number(filterGroupId) }
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
      toast.success("Shartnoma ma'lumotlari yuklandi");
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
    onError: () => toast.error("Faylni yuklashda xatolik yoki ruxsat yo'q"),
  });

  // --- Memoized Values ---
  const selectedGroupForDialog = useMemo(() => {
    return groups.find((g) => g.id === selectedSession?.group_id);
  }, [selectedSession, groups]);

  const groupColorMap = useMemo(() => {
    const colorClasses = [
      "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500",
      "bg-pink-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
    ];
    const map = new Map<number, string>();
    groups.forEach((group, index) => {
      map.set(group.id, colorClasses[index % colorClasses.length]);
    });
    return map;
  }, [groups]);

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

  const handleCheckContract = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bosh Murabbiy Paneli
            </h1>
            <p className="text-muted-foreground mt-1">
              Mashg'ulotlar, guruhlar va shartnomalarni boshqarish.
            </p>
          </div>
          <Button
            onClick={handleCreateNewSession}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yangi Mashg'ulot
          </Button>
        </div>
      </motion.div>

      {/* STATS CARDS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faol Guruhlar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatsLoading ? <Loader2 className="animate-spin" /> : stats?.active_groups_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Barcha mavjud guruhlar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faol Studentlar</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
            {isStatsLoading ? <Loader2 className="animate-spin" /> : stats?.active_students_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Barcha guruhlardagi studentlar soni</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugungi Mashg'ulotlar</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
            {isStatsLoading ? <Loader2 className="animate-spin" /> : stats?.today_sessions_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Bugun uchun rejalashtirilgan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Davomat (Shu oy)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
            {isStatsLoading ? <Loader2 className="animate-spin" /> : `${stats?.this_month_attendance_percentage ?? 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">O'rtacha davomat foizi</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* MAIN CONTENT */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center border-b">
          <TabsList className="bg-transparent border-none p-0">
            <TabsTrigger value="timetable">Jadval</TabsTrigger>
            <TabsTrigger value="groups">Guruhlar</TabsTrigger>
            <TabsTrigger value="contract">Shartnoma</TabsTrigger>
          </TabsList>

          {activeTab === "timetable" && (
            <div className="pb-2">
              <Select value={filterGroupId} onValueChange={setFilterGroupId}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Guruhni filtrlash" />
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
          )}
        </div>

        <TabsContent value="timetable" className="mt-4">
          <motion.div
            key="timetable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
          >
            {isSessionsLoading || isGroupsLoading ? (
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin" />
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
          </motion.div>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <motion.div
            key="groups"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {groups.map((group) => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${groupColorMap.get(group.id)}`}></span>
                    {group.name}
                  </CardTitle>
                  <CardDescription>
                    {group.coach_first_name} {group.coach_last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Studentlar:</span>
                    <span className="font-medium">{group.active_students_count} / {group.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jadval:</span>
                    <span className="font-medium">{group.schedule_days} {group.schedule_time}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="contract" className="mt-4">
          <motion.div
            key="contract"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            className="grid lg:grid-cols-2 gap-8 items-start max-w-4xl mx-auto"
          >
             <Card>
                <CardHeader>
                  <CardTitle>Shartnoma Qidirish</CardTitle>
                  <CardDescription>
                    Student shartnoma raqamini kiriting (masalan: 21-2015C2).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCheckContract} className="space-y-4">
                    <Input
                      placeholder="Shartnoma raqami..."
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={searchContractMutation.isPending || !contractNumber}
                    >
                      {searchContractMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Tekshirish
                    </Button>
                  </form>
                  {contractError && <p className="text-red-500 text-sm mt-2">{contractError}</p>}
                </CardContent>
              </Card>

              {contractResult && (
                  <Card className="border-t-4 border-t-green-500">
                    <CardHeader>
                        <CardTitle>{contractResult.student_first_name} {contractResult.student_last_name}</CardTitle>
                        <CardDescription>{contractResult.contract_number}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Oylik To'lov:</span>
                            <span className="font-medium">{formatCurrency(contractResult.monthly_fee)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Joriy Qarz:</span>
                            <span className={`font-medium ${contractResult.current_debt > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(contractResult.current_debt)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Boshlanish sanasi:</span>
                            <span className="font-medium">{format(new Date(contractResult.start_date), "dd.MM.yyyy")}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleDownloadPdf} disabled={downloadPdfMutation.isPending} variant="secondary" className="w-full">
                            {downloadPdfMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                            PDF Yuklash
                        </Button>
                    </CardFooter>
                  </Card>
              )}
          </motion.div>
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
        onDelete={(session) => console.log("Delete session", session.id)} // Replace with actual delete mutation
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