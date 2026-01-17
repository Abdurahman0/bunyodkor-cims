import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  groupService,
  headCoachService,
  userService,
} from "@/services/api.service";
import { motion } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  CalendarDays,
  Users,
  Plus,
  BarChart2,
  Loader2,
  Clock,
  Trophy,
  Eye,
  UserCog,
  Trash2,
} from "lucide-react";

import { toast } from "react-hot-toast";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {
  SessionCreateRequest,
  SessionRead,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  GroupsStatisticsResponse,
} from "@/types/api";

// Reusable Components
import WeeklyTimeTable from "@/components/timetable/WeeklyTimeTable";
import SessionDetailsDialog from "@/components/timetable/SessionDetailsDialog"; // Assuming this is correct
import { SessionDialog } from "@/pages/coach/SessionDialog"; // Corrected import

export default function HeadCoach() {
  const queryClient = useQueryClient();

  // --- States ---
  const [activeTab, setActiveTab] = useState("overview");
  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(
    null,
  );
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionDialogInitialData, setSessionDialogInitialData] = useState<
    Partial<SessionCreateRequest> | undefined
  >(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionRead | null>(
    null,
  );

  // --- API Queries ---
  const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ["headCoachGroups"],
    queryFn: () => headCoachService.getAllGroups(),
    select: (data) => data.data,
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions", filterGroupId],
    queryFn: () =>
      headCoachService.getAllSessions(
        filterGroupId === "all"
          ? undefined
          : { group_id: Number(filterGroupId) },
      ),
    select: (data) => data.data,
  });

  const { data: coachesData = [], isLoading: isCoachesLoading } = useQuery({
    queryKey: ["coaches-list"],
    queryFn: () => userService.getCoaches(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes, coaches don't change often
  });

  // Fetch group statistics for the "Tizim Holati" card
  const { data: groupsStats, isLoading: isLoadingGroupsStats } = useQuery({
    queryKey: ["groups-statistics-headcoach"],
    queryFn: () => groupService.getGroupsStatistics(),
  });

  // --- Mutations ---
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: number) =>
      headCoachService.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Mashg'ulot muvaffaqiyatli o'chirildi");
      setDetailsDialogOpen(false);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || "Mashg'ulotni o'chirishda xatolik",
      );
    },
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

  const filteredGroups = useMemo(() => {
    if (filterGroupId === "all") {
      return groups;
    }
    return groups.filter((g) => g.id.toString() === filterGroupId);
  }, [groups, filterGroupId]);

  const getCoachName = (coachId: number | undefined) => {
    if (!coachId || !coachesData) return "N/A";
    const coach = coachesData.find((c) => c.id === coachId);
    return coach ? coach.full_name : "N/A";
  };

  // --- Handlers ---
  const handleSessionClick = (session: SessionRead) => {
    setSelectedSession(session);
    setDetailsDialogOpen(true);
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    const clickedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for comparison

    if (clickedDate < today) {
      toast.error("O'tib ketgan sana uchun mashg'ulot yaratib bo'lmaydi.");
      return;
    }
    setSessionDialogInitialData({ session_date: date, start_time: time });
    setSessionDialogOpen(true);
  };

  const handleCreateNewSession = () => {
    setSessionDialogInitialData(undefined);
    setSessionDialogOpen(true);
  };

  const handleDeleteRequest = (session: SessionRead) => {
    setSessionToDelete(session);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      deleteSessionMutation.mutate(sessionToDelete.id);
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleGroupDetailsClick = (groupId: number) => {
    setFilterGroupId(groupId.toString());
    setActiveTab("timetable");
    toast.success("Guruh jadvali ochildi");
  };

  // --- Render ---
  return (
    // YANGILANGAN QISM: dark:bg-blue-900/30 qo'shildi
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10 rounded-2xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-card backdrop-blur-xl rounded-2xl border-border shadow-xl">
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
        <TabsList className="bg-card backdrop-blur-xl p-1 rounded-xl border-border shadow-lg">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <BarChart2 className="w-4 h-4 mr-2" /> Umumiy Ko'rinish
          </TabsTrigger>
          <TabsTrigger
            value="timetable"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <CalendarDays className="w-4 h-4 mr-2" /> Jadval
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <Users className="w-4 h-4 mr-2" /> Guruhlar
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Tezkor Amallar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleCreateNewSession}
                  variant="outline"
                  className="w-full justify-start hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" /> Yangi Mashg'ulot Qo'shish
                </Button>
                <Button
                  onClick={() => setActiveTab("groups")}
                  variant="outline"
                  className="w-full justify-start hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <Users className="w-4 h-4 mr-2" /> Guruhlarni Ko'rish
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-emerald-500 bg-card border-border text-card-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-500" /> Tizim Holati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Jami Sig'im</span>
                  <span className="font-semibold">
                    {isLoadingGroupsStats ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      (groupsStats?.data?.total_capacity ?? "N/A")
                    )}{" "}
                    o'rin
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">
                    Band qilingan o'rinlar
                  </span>
                  <span className="font-semibold">
                    {isLoadingGroupsStats ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      (groupsStats?.data?.total_used ?? "N/A")
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Bo'sh o'rinlar</span>
                  <span className="font-semibold text-orange-600">
                    {isLoadingGroupsStats ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      (groupsStats?.data?.total_available ?? "N/A")
                    )}
                  </span>
                </div>{" "}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TIMETABLE TAB */}
        <TabsContent value="timetable" className="space-y-4">
          <div className="flex justify-between items-center bg-card border-border shadow-sm p-4 rounded-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Mashg'ulotlar Jadvali</h2>

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

          {isSessionsLoading || isGroupsLoading || isCoachesLoading ? (
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
          <div className="flex justify-between items-center bg-card border-border shadow-sm p-4 rounded-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Guruhlar</h2>

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredGroups.map((group) => (
              <Card
                key={group.id}
                className="group hover:shadow-xl transition-all duration-300 border-border overflow-hidden bg-card text-card-foreground"
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
                    {getCoachName(group.coach_id)}
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
                          group.id,
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
                    className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => handleGroupDetailsClick(group.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Batafsil
                  </Button>
                </CardFooter>
              </Card>
            ))}
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
        onDelete={handleDeleteRequest}
      />

      <SessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        groups={groups}
        initialData={sessionDialogInitialData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          queryClient.invalidateQueries({
            queryKey: ["groups-statistics-headcoach"],
          });
        }}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Mashg'ulotni o'chirishni tasdiqlang
            </DialogTitle>
            <DialogDescription>
              Bu amalni qaytarib bo'lmaydi. Bu{" "}
              <strong>{sessionToDelete?.topic}</strong> mashg'ulotini va unga
              bog'liq barcha davomat yozuvlarini butunlay o'chiradi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteSessionMutation.isPending}
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteSessionMutation.isPending}
            >
              {deleteSessionMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
