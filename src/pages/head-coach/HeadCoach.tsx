import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
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
import { SearchableSelect } from "@/components/ui/searchable-select";

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
import type {
  SessionCreateRequest,
  SessionRead,
} from "@/types/api";

// Reusable Components
import WeeklyTimeTable from "@/components/timetable/WeeklyTimeTable";
import SessionDetailsDialog from "@/components/timetable/SessionDetailsDialog"; // Assuming this is correct
import { SessionDialog } from "@/pages/coach/SessionDialog"; // Corrected import
import { useLanguageStore } from "@/store/languageStore";
import { formatFullName, formatGroupSelectLabel } from "@/lib/name-utils";

const normalizeScheduleDays = (raw?: string) => {
  if (!raw) return "-";

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const aliases: Record<string, string> = {
    mon: "Mon",
    monday: "Mon",
    tue: "Tue",
    tues: "Tue",
    tuesday: "Tue",
    wed: "Wed",
    wen: "Wed",
    wednesday: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    thursday: "Thu",
    fri: "Fri",
    friday: "Fri",
    sat: "Sat",
    saturday: "Sat",
    sun: "Sun",
    sunday: "Sun",
  };

  const normalized = raw
    .split(/[^a-zA-Z]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .map((token) => aliases[token])
    .filter(Boolean);

  if (normalized.length === 0) return raw;

  const unique = Array.from(new Set(normalized));
  unique.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  return unique.join("-");
};

const normalizeSessionForUi = (session: Partial<SessionRead> | null | undefined) => {
  if (!session) return null;

  const normalizedDescription =
    session.description ??
    (session as SessionRead & { notes?: string | null; comment?: string | null }).notes ??
    (session as SessionRead & { notes?: string | null; comment?: string | null }).comment ??
    "";

  const normalizedStation =
    session.station ??
    (session as SessionRead & { location?: string | null }).location ??
    "";

  return {
    ...session,
    description: normalizedDescription,
    station: normalizedStation,
    location:
      (session as SessionRead & { location?: string | null }).location ??
      normalizedStation,
  } as SessionRead;
};

export default function HeadCoach() {
  const queryClient = useQueryClient();

  // --- States ---
  const [activeTab, setActiveTab] = useState("overview");
  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
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
  const { t } = useLanguageStore();

  const weekFromDate = useMemo(
    () => format(currentWeekStart, "yyyy-MM-dd"),
    [currentWeekStart],
  );

  const weekToDate = useMemo(
    () => format(addDays(currentWeekStart, 6), "yyyy-MM-dd"),
    [currentWeekStart],
  );

  // --- API Queries ---
  const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ["headCoachGroups"],
    queryFn: () => headCoachService.getAllGroups(),
    select: (data) =>
      data.data.map((group) => ({
        ...group,
        schedule_days: normalizeScheduleDays(group.schedule_days),
      })),
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions", filterGroupId, weekFromDate, weekToDate],
    queryFn: () =>
      headCoachService.getAllSessions(
        {
          from_date: weekFromDate,
          to_date: weekToDate,
          group_id:
            filterGroupId === "all" ? undefined : Number(filterGroupId),
        },
      ),
    select: (data) =>
      (data.data || [])
        .map((session) => normalizeSessionForUi(session))
        .filter(Boolean) as SessionRead[],
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
    queryFn: () => groupService.getGroupsStatistics({}),
  });

  // --- Mutations ---
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: number) =>
      headCoachService.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(t("sessionDeletedSuccess"));
      setDetailsDialogOpen(false);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(
        err.response?.data?.detail || t("sessionDeleteError"),
      );
    },
  });

  const copyWeekMutation = useMutation({
    mutationFn: async (weekStart: Date) => {
      const fromDate = format(weekStart, "yyyy-MM-dd");
      const toDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

      const sourceResponse = await headCoachService.getAllSessions({
        from_date: fromDate,
        to_date: toDate,
        group_id: filterGroupId === "all" ? undefined : Number(filterGroupId),
      });

      const sourceSessions = sourceResponse.data || [];
      if (sourceSessions.length === 0) {
        throw new Error("NO_SESSIONS");
      }

      const parseIsoDateAsLocal = (value: string) => {
        const [y, m, d] = value.split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      };

      const sessionsForNextWeek = sourceSessions.map((session) => ({
        session_date: format(
          addDays(parseIsoDateAsLocal(session.session_date), 7),
          "yyyy-MM-dd",
        ),
        topic: session.topic,
        start_time: session.start_time,
        end_time: session.end_time,
        station: session.station,
        group_id: session.group_id,
      }));

      return headCoachService.createSessionsBulk({
        sessions: sessionsForNextWeek,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      const copiedCount = response.data?.length ?? 0;
      toast.success(
        `${t("weekCopiedToNextSuccess")} (${copiedCount})`,
      );
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.message === "NO_SESSIONS") {
        toast.error(t("noSessionsInSelectedWeek"));
        return;
      }

      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || t("weekCopyFailed"));
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
  const timetableGroupOptions = useMemo(
    () => [
      {
        value: "all",
        label: t("allGroups"),
      },
      ...groups.map((group) => ({
        value: group.id.toString(),
        label: formatGroupSelectLabel(group),
        keywords: [
          group.name,
          group.birth_year,
          group.coach_first_name,
          group.coach_last_name,
        ]
          .filter(Boolean)
          .map(String),
      })),
    ],
    [groups, t],
  );

  type GroupWithOptionalStudentsCount = (typeof groups)[number] & {
    students_count?: number;
  };

  const getGroupStudentCount = (group: GroupWithOptionalStudentsCount) =>
    group?.active_students_count ??
    group?.current_student_count ??
    group?.students_count ??
    0;

  const getCoachName = (coachId: number | undefined) => {
    if (!coachId || !coachesData) return "N/A";
    const coach = coachesData.find((c) => c.id === coachId);
    return coach ? formatFullName(coach.full_name) : "N/A";
  };

  // --- Handlers ---
  const handleSessionClick = async (session: SessionRead) => {
    try {
      const response = await headCoachService.getSessionDetails(session.id);

      // Some environments return ApiResponse<Session>, others return Session directly.
      const rawSession =
        (response as { data?: Partial<SessionRead> }).data &&
        typeof (response as { data?: Partial<SessionRead> }).data === "object"
          ? (response as { data?: Partial<SessionRead> }).data
          : (response as Partial<SessionRead>);

      const normalizedSession = normalizeSessionForUi(rawSession);
      setSelectedSession({
        ...session,
        ...(normalizedSession || {}),
      });
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
      };
      const errorDetail = err.response?.data?.detail || t("anErrorOccurred");
      setSelectedSession(normalizeSessionForUi(session));
      toast.error(errorDetail);
    } finally {
      setDetailsDialogOpen(true);
    }
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    const clickedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for comparison

    if (clickedDate < today) {
      toast.error(t("cannotCreateSessionPastDate"));
      return;
    }
    setSessionDialogInitialData({ session_date: date, start_time: time });
    setSessionDialogOpen(true);
  };

  const handleCreateNewSession = () => {
    setSessionDialogInitialData(undefined);
    setSessionDialogOpen(true);
  };

  const handleSessionDialogOpenChange = (open: boolean) => {
    setSessionDialogOpen(open);
    if (!open) {
      setSessionDialogInitialData(undefined);
    }
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
    toast.success(t("groupTimetableOpened"));
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
                  {t("headCoachPanel")}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {t("fullControlSystem")}
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
              {t("newSession")}
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
            <BarChart2 className="w-4 h-4 mr-2" /> {t("overview")}
          </TabsTrigger>
          <TabsTrigger
            value="timetable"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <CalendarDays className="w-4 h-4 mr-2" /> {t("timetable")}
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg"
          >
            <Users className="w-4 h-4 mr-2" /> {t("groups")}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> {t("quickActions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleCreateNewSession}
                  variant="outline"
                  className="w-full justify-start hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" /> {t("addNewSession")}
                </Button>
                <Button
                  onClick={() => setActiveTab("groups")}
                  variant="outline"
                  className="w-full justify-start hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <Users className="w-4 h-4 mr-2" /> {t("viewGroups")}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-card border-border text-card-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-500" /> {t("systemStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("totalCapacity")}</span>
                  <span className="font-semibold">
                    {isLoadingGroupsStats ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      (groupsStats?.data?.total_capacity ?? "N/A")
                    )}{" "}
                    {t("spots")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {t("occupiedSpots")}
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
                  <span className="text-sm text-muted-foreground">{t("availableSpots")}</span>
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
          <div className="flex flex-col gap-3 bg-card border-border shadow-sm p-4 rounded-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">{t("sessionsTimetable")}</h2>

            <SearchableSelect
              value={filterGroupId}
              onValueChange={setFilterGroupId}
              options={timetableGroupOptions}
              placeholder={t("allGroups")}
              searchPlaceholder={`${t("search")}...`}
              emptyText={t("noDataFound")}
              className="w-full sm:w-[420px] lg:w-[520px]"
              triggerClassName="h-10"
            />
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
              currentWeekStart={currentWeekStart}
              onCurrentWeekStartChange={setCurrentWeekStart}
              onCopyWeekToNext={(weekStart) => copyWeekMutation.mutate(weekStart)}
              isCopyingWeek={copyWeekMutation.isPending}
              copyWeekLabel={t("copyWeekToNext")}
              copyingWeekLabel={t("copyingWeek")}
              showCreateButton
            />
          )}
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center bg-card border-border shadow-sm p-4 rounded-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold">{t("groups")}</h2>

            <Select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="w-[200px]"
            >
              <option value="all">{t("allGroups")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id.toString()}>
                  {formatGroupSelectLabel(g)}
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
                      {getGroupStudentCount(group)}/{group.capacity}
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
                      <span className="text-muted-foreground">{t("scheduleLabel")}</span>
                      <span className="font-medium">
                        {normalizeScheduleDays(group.schedule_days)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("timeLabel")}</span>
                      <span className="font-medium">{group.schedule_time}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${groupColorMap.get(
                          group.id,
                        )} transition-all duration-500`}
                        style={{
                          width: `${
                            group.capacity > 0
                              ? (getGroupStudentCount(group) / group.capacity) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => handleGroupDetailsClick(group.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t("details")}
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
        key={`${sessionDialogOpen ? "open" : "closed"}-${
          sessionDialogInitialData?.session_date || ""
        }-${
          sessionDialogInitialData?.start_time || ""
        }`}
        open={sessionDialogOpen}
        onOpenChange={handleSessionDialogOpenChange}
        groups={groups}
        initialData={sessionDialogInitialData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          queryClient.invalidateQueries({
            queryKey: ["groups-statistics-headcoach"],
          });
          setSessionDialogInitialData(undefined);
        }}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              {t("confirmDeleteSession")}
            </DialogTitle>
            <DialogDescription>
              {t("deleteSessionWarning").replace("{topic}", sessionToDelete?.topic || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteSessionMutation.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteSessionMutation.isPending}
            >
              {deleteSessionMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
