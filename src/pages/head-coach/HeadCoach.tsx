import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { headCoachService } from "@/services/api.service";
import { useLanguageStore } from "@/store/languageStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Plus, Filter, X, CalendarDays, List } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { SessionCreateRequest, SessionUpdateRequest, SessionRead, GroupRead } from "@/types/api";
import WeeklyTimeTable from "@/components/timetable/WeeklyTimeTable";
import SessionDetailsDialog from "@/components/timetable/SessionDetailsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HeadCoach() {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  // States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBirthYear, setSelectedBirthYear] = useState<number | undefined>();
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterGroupId, setFilterGroupId] = useState<number | undefined>();
  const [viewMode, setViewMode] = useState<"timetable" | "list">("timetable");
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionRead | null>(null);

  // Form states
  const [formData, setFormData] = useState<SessionCreateRequest>({
    group_id: 0,
    session_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    end_time: "11:00",
    topic: "",
    station: "",
  });

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ["head-coach-groups", selectedBirthYear],
    queryFn: () =>
      headCoachService.getAllGroups(
        selectedBirthYear ? { birth_year: selectedBirthYear } : undefined
      ),
  });

  // Fetch sessions
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["head-coach-sessions", filterDate, filterGroupId],
    queryFn: () =>
      headCoachService.getAllSessions({
        date: filterDate || undefined,
        group_id: filterGroupId,
      }),
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (data: SessionCreateRequest) =>
      headCoachService.createSession(data),
    onSuccess: () => {
      toast.success(t("sessionCreatedSuccessfully") || "Session created successfully!");
      queryClient.invalidateQueries({ queryKey: ["head-coach-sessions"] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          t("errorCreatingSession") ||
          "Error creating session"
      );
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SessionUpdateRequest }) =>
      headCoachService.updateSession(id, data),
    onSuccess: () => {
      toast.success(t("sessionUpdatedSuccessfully") || "Session updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["head-coach-sessions"] });
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          t("errorUpdatingSession") ||
          "Error updating session"
      );
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: number) =>
      headCoachService.deleteSession(sessionId),
    onSuccess: () => {
      toast.success(t("sessionDeletedSuccessfully") || "Session deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["head-coach-sessions"] });
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          t("errorDeletingSession") ||
          "Error deleting session"
      );
    },
  });

  const resetForm = () => {
    setFormData({
      group_id: 0,
      session_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      end_time: "11:00",
      topic: "",
      station: "",
    });
  };

  const handleCreateSession = () => {
    if (!formData.group_id) {
      toast.error(t("pleaseSelectGroup") || "Please select a group");
      return;
    }
    if (!formData.topic.trim()) {
      toast.error(t("pleaseEnterTopic") || "Please enter topic");
      return;
    }

    createSessionMutation.mutate(formData);
  };

  const handleUpdateSession = () => {
    if (!selectedSession) return;

    if (!formData.group_id) {
      toast.error(t("pleaseSelectGroup") || "Please select a group");
      return;
    }
    if (!formData.topic.trim()) {
      toast.error(t("pleaseEnterTopic") || "Please enter topic");
      return;
    }

    updateSessionMutation.mutate({
      id: selectedSession.id,
      data: formData,
    });
  };

  const handleSessionClick = (session: SessionRead) => {
    setSelectedSession(session);
    setDetailsDialogOpen(true);
  };

  const handleEditSession = (session: SessionRead) => {
    setSelectedSession(session);
    setFormData({
      group_id: session.group_id,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      topic: session.topic,
      station: session.station,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteSession = (session: SessionRead) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = () => {
    if (sessionToDelete) {
      deleteSessionMutation.mutate(sessionToDelete.id);
    }
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    setFormData({
      ...formData,
      session_date: date,
      start_time: time,
      end_time: time.split(":")[0] + ":00",
    });
    setCreateDialogOpen(true);
  };

  const groups = groupsData?.data || [];
  const sessions = sessionsData?.data || [];

  // Get unique birth years for filter
  const birthYears = Array.from(
    new Set(groups.map((g: GroupRead) => new Date().getFullYear() - g.id % 100))
  ).sort((a, b) => b - a);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("headCoach") || "Head Coach"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("manageTrainingSessions") || "Manage training sessions and groups"}
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          size="lg"
          className="gap-2"
        >
          <Plus className="w-5 h-5" />
          {t("createSession") || "Create Session"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t("filters") || "Filters"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label>{t("date") || "Date"}</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex-1"
                />
                {filterDate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilterDate("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Birth Year Filter */}
            <div className="space-y-2">
              <Label>{t("birthYear") || "Birth Year"}</Label>
              <Select
                value={selectedBirthYear?.toString()}
                onValueChange={(value) =>
                  setSelectedBirthYear(value ? parseInt(value) : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("allYears") || "All years"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allYears") || "All years"}</SelectItem>
                  {birthYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group Filter */}
            <div className="space-y-2">
              <Label>{t("group") || "Group"}</Label>
              <Select
                value={filterGroupId?.toString()}
                onValueChange={(value) =>
                  setFilterGroupId(value ? parseInt(value) : undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("allGroups") || "All groups"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allGroups") || "All groups"}</SelectItem>
                  {groups.map((group: GroupRead) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "timetable" | "list")}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {t("trainingSessions") || "Training Sessions"}
          </h2>
          <TabsList>
            <TabsTrigger value="timetable" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Timetable
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              List
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Timetable View */}
        <TabsContent value="timetable" className="mt-0">
          {isLoadingSessions ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  {t("loading") || "Loading..."}
                </div>
              </CardContent>
            </Card>
          ) : (
            <WeeklyTimeTable
              sessions={sessions}
              groups={groups}
              onSessionClick={handleSessionClick}
              onTimeSlotClick={handleTimeSlotClick}
              showCreateButton={true}
            />
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-0">
          {isLoadingSessions ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("loading") || "Loading..."}
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("noSessionsFound") || "No sessions found"}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session: SessionRead) => {
                const group = groups.find((g: GroupRead) => g.id === session.group_id);
                return (
                  <Card
                    key={session.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleSessionClick(session)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        {group?.name || `Group ${session.group_id}`}
                      </CardTitle>
                      <CardDescription>{session.topic}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(session.session_date), "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {session.start_time} - {session.end_time}
                        </span>
                      </div>
                      {session.station && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{session.station}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Session Details Dialog */}
      <SessionDetailsDialog
        session={selectedSession}
        group={groups.find((g: GroupRead) => g.id === selectedSession?.group_id)}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        showActions={true}
        onEdit={handleEditSession}
        onDelete={handleDeleteSession}
      />

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t("createNewSession") || "Create New Session"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Group Selection */}
            <div className="space-y-2">
              <Label htmlFor="group" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t("group") || "Group"} *
              </Label>
              <Select
                value={formData.group_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, group_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectGroup") || "Select group"} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group: GroupRead) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("date") || "Date"} *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.session_date}
                onChange={(e) =>
                  setFormData({ ...formData, session_date: e.target.value })
                }
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("startTime") || "Start Time"} *
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">
                  {t("endTime") || "End Time"} *
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic">
                {t("topic") || "Topic"} *
              </Label>
              <Input
                id="topic"
                placeholder={t("enterSessionTopic") || "Enter session topic"}
                value={formData.topic}
                onChange={(e) =>
                  setFormData({ ...formData, topic: e.target.value })
                }
              />
            </div>

            {/* Station */}
            <div className="space-y-2">
              <Label htmlFor="station" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t("station") || "Station / Location"}
              </Label>
              <Input
                id="station"
                placeholder={t("enterStationName") || "Enter station or location"}
                value={formData.station}
                onChange={(e) =>
                  setFormData({ ...formData, station: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createSessionMutation.isPending}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending
                ? t("creating") || "Creating..."
                : t("createSession") || "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t("editSession") || "Edit Session"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Group Selection */}
            <div className="space-y-2">
              <Label htmlFor="edit-group" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t("group") || "Group"} *
              </Label>
              <Select
                value={formData.group_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, group_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectGroup") || "Select group"} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group: GroupRead) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("date") || "Date"} *
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.session_date}
                onChange={(e) =>
                  setFormData({ ...formData, session_date: e.target.value })
                }
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("startTime") || "Start Time"} *
                </Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-time">
                  {t("endTime") || "End Time"} *
                </Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="edit-topic">
                {t("topic") || "Topic"} *
              </Label>
              <Input
                id="edit-topic"
                placeholder={t("enterSessionTopic") || "Enter session topic"}
                value={formData.topic}
                onChange={(e) =>
                  setFormData({ ...formData, topic: e.target.value })
                }
              />
            </div>

            {/* Station */}
            <div className="space-y-2">
              <Label htmlFor="edit-station" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t("station") || "Station / Location"}
              </Label>
              <Input
                id="edit-station"
                placeholder={t("enterStationName") || "Enter station or location"}
                value={formData.station}
                onChange={(e) =>
                  setFormData({ ...formData, station: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateSessionMutation.isPending}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleUpdateSession}
              disabled={updateSessionMutation.isPending}
            >
              {updateSessionMutation.isPending
                ? t("updating") || "Updating..."
                : t("updateSession") || "Update Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the session
              {sessionToDelete && (
                <>
                  {" "}<strong>"{sessionToDelete.topic}"</strong> scheduled for{" "}
                  {format(new Date(sessionToDelete.session_date), "MMM d, yyyy")}
                </>
              )}.
              {sessionToDelete && " All attendance records for this session will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSessionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSession}
              disabled={deleteSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSessionMutation.isPending ? "Deleting..." : "Delete Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
