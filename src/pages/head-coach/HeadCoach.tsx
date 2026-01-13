import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  headCoachService,
  publicService,
  contractService,
} from "@/services/api.service";
import { useLanguageStore } from "@/store/languageStore";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Filter,
  Search,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  CalendarDays,
  List as ListIcon,
} from "lucide-react";

import { format } from "date-fns";
import { toast } from "sonner";
import type {
  SessionCreateRequest,
  SessionUpdateRequest,
  SessionRead,
  GroupRead,
  ContractInfoPublic,
} from "@/types/api";

import WeeklyTimeTable from "@/components/timetable/WeeklyTimeTable";
import SessionDetailsDialog from "@/components/timetable/SessionDetailsDialog";

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export default function HeadCoach() {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  // --- States ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBirthYear, setSelectedBirthYear] = useState<
    number | undefined
  >();
  const [filterGroupId, setFilterGroupId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState("timetable");
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(
    null
  );
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // --- Contract Check States ---
  const [contractNumber, setContractNumber] = useState("");
  const [contractResult, setContractResult] =
    useState<ContractInfoPublic | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  // --- API Queries ---
  const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ["head-coach", "groups"],
    queryFn: () => headCoachService.getMyGroups(),
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ["head-coach", "sessions", filterGroupId],
    queryFn: () => headCoachService.getMySessions(filterGroupId),
  });

  // --- Mutations ---
  const createSessionMutation = useMutation({
    mutationFn: (data: SessionCreateRequest) =>
      headCoachService.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["head-coach", "sessions"] });
      setCreateDialogOpen(false);
      toast.success("Mashg'ulot muvaffaqiyatli yaratildi");
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  // Contract Search Mutation
  const searchContractMutation = useMutation({
    mutationFn: (number: string) => publicService.getContractInfo(number),
    onSuccess: (data) => {
      setContractResult(data);
      setContractError(null);
      toast.success("Shartnoma ma'lumotlari yuklandi");
    },
    onError: (err: any) => {
      setContractResult(null);
      setContractError(err.response?.data?.message || "Shartnoma topilmadi");
      toast.error("Shartnoma topilmadi");
    },
  });

  // Contract PDF Mutation
  const downloadPdfMutation = useMutation({
    mutationFn: async (data: { year: number; number: string }) => {
      return contractService.getContractPdf(data.year, data.number);
    },
    onSuccess: (data) => {
      window.open(data.pdf_url, "_blank");
      toast.success("PDF ochilmoqda...");
    },
    onError: () => {
      toast.error("Faylni yuklashda xatolik yoki ruxsat yo'q");
    },
  });

  // --- Handlers ---
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

  const handleSessionClick = (session: SessionRead) => {
    setSelectedSession(session);
    setDetailsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 p-4 md:p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bosh Murabbiy Paneli
          </h1>
          <p className="text-muted-foreground mt-1">
            Mashg'ulotlar, guruhlar va shartnomalarni boshqarish tizimi
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yangi Mashg'ulot
          </Button>
        </div>
      </div>

      {/* TABS & FILTERS */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4">
          <TabsList className="grid w-full md:w-[400px] grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <TabsTrigger
              value="timetable"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Jadval
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <ListIcon className="w-4 h-4 mr-2" />
              Ro'yxat
            </TabsTrigger>
            <TabsTrigger
              value="contract"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Shartnoma
            </TabsTrigger>
          </TabsList>

          {/* Filters (only show for timetable/list) */}
          {activeTab !== "contract" && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterGroupId?.toString() || "all"}
                  onValueChange={(val) =>
                    setFilterGroupId(val === "all" ? undefined : Number(val))
                  }
                >
                  <SelectTrigger className="w-[200px] pl-9 bg-white dark:bg-slate-900 border-slate-200">
                    <SelectValue placeholder="Barcha guruhlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha guruhlar</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id.toString()}>
                        {g.name} ({g.year_of_birth})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* --- CONTENT: TIMETABLE --- */}
        <TabsContent value="timetable" className="mt-0">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <WeeklyTimeTable
                sessions={sessions}
                onSessionClick={handleSessionClick}
              />
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* --- CONTENT: LIST --- */}
        <TabsContent value="list" className="mt-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {sessions.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Mashg'ulotlar topilmadi</p>
              </div>
            ) : (
              sessions.map((session) => (
                <Card
                  key={session.id}
                  className="group hover:shadow-md transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                  onClick={() => handleSessionClick(session)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-100"
                      >
                        {session.group.name}
                      </Badge>
                      <Badge
                        variant={
                          session.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2 group-hover:text-blue-600 transition-colors">
                      {session.topic || "Mavzu kiritilmagan"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(session.date), "dd MMMM, yyyy")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {session.start_time.slice(0, 5)} -{" "}
                      {session.end_time.slice(0, 5)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {session.location || "Joylashuv aniq emas"}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        </TabsContent>

        {/* --- CONTENT: CONTRACT CHECK --- */}
        <TabsContent value="contract" className="mt-0">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Search Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Search className="w-5 h-5 text-blue-600" />
                    Shartnoma Qidirish
                  </CardTitle>
                  <CardDescription>
                    Student shartnoma raqamini kiriting (masalan: 21-2015C2)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCheckContract} className="space-y-4">
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Shartnoma raqami..."
                        value={contractNumber}
                        onChange={(e) => setContractNumber(e.target.value)}
                        className="pl-10 h-12 text-lg"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                      disabled={
                        searchContractMutation.isPending || !contractNumber
                      }
                    >
                      {searchContractMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : null}
                      Tekshirish
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Error Message */}
              <AnimatePresence>
                {contractError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <p>{contractError}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Result Card */}
            <AnimatePresence mode="wait">
              {contractResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="border-t-4 border-t-green-500 shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-6 border-b">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {contractResult.student_first_name}{" "}
                            {contractResult.student_last_name}
                          </CardTitle>
                          <p className="text-slate-500 font-medium mt-1">
                            {contractResult.contract_number}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 px-3 py-1 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" /> Aktiv
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            Oylik To'lov
                          </p>
                          <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
                            {formatCurrency(contractResult.monthly_fee)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            Joriy Qarz
                          </p>
                          <p
                            className={`text-xl font-bold ${
                              contractResult.current_debt > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {formatCurrency(contractResult.current_debt)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-dashed">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" /> Boshlanish
                            sanasi:
                          </span>
                          <span className="font-medium">
                            {format(
                              new Date(contractResult.start_date),
                              "dd.MM.yyyy"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center text-muted-foreground">
                            <CreditCard className="w-4 h-4 mr-2" /> Oxirgi
                            to'lov:
                          </span>
                          <span className="font-medium">
                            {contractResult.last_payment_date
                              ? format(
                                  new Date(contractResult.last_payment_date),
                                  "dd.MM.yyyy"
                                )
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t">
                      <Button
                        onClick={handleDownloadPdf}
                        disabled={downloadPdfMutation.isPending}
                        variant="outline"
                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 h-11"
                      >
                        {downloadPdfMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Shartnoma nusxasini yuklash (PDF)
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}
      <SessionDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        session={selectedSession}
        isHeadCoach={true}
      />

      {/* Create Dialog Placeholder (agar kerak bo'lsa to'liq kodini qo'shish mumkin) */}
      {/* ... Create Session Dialog code ... */}
    </div>
  );
}
