import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { waitingListService, groupService } from "@/services/api.service";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguageStore } from "@/store/languageStore";
import type { WaitingListRead, GroupRead } from "@/types/api";
import { WaitingListDialog } from "./WaitingListDialog";
import { format } from "date-fns";

export default function WaitingList() {
  const { t } = useLanguageStore();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitingListRead | null>(
    null
  );
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["waiting-list", page],
    queryFn: () =>
      waitingListService.getWaitingList({
        page,
        page_size: 10,
      }),
  });

  // Get all groups for display
  const { data: groupsData } = useQuery({
    queryKey: ["groups-list"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => waitingListService.removeFromWaitingList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      toast.success(
        t("waitingListRemovedSuccess") ||
          "Removed from waiting list successfully"
      );
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = "Failed to remove from waiting list";

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const handleOpenDialog = (entry?: WaitingListRead) => {
    setSelectedEntry(entry || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (entry: WaitingListRead) => {
    if (
      confirm(
        `Are you sure you want to remove ${entry.student_first_name} ${entry.student_last_name} from the waiting list?`
      )
    ) {
      deleteMutation.mutate(entry.id);
    }
  };

  const getGroupName = (groupId: number) => {
    const group = groupsData?.data?.find((g: GroupRead) => g.id === groupId);
    return group ? group.name : `Group #${groupId}`;
  };

  const totalPages = data?.meta?.total_pages || 1;

  const getPaginationItems = () => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3)
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const paginationItems = getPaginationItems();

  const getPriorityColor = (priority: number, groupId: number) => {
    // Get group capacity to determine priority range
    const group = groupsData?.data?.find((g: GroupRead) => g.id === groupId);
    const capacity = group?.capacity || 100;

    // Calculate priority percentage (1 is 0%, capacity is 100%)
    const priorityPercent = ((priority - 1) / (capacity - 1)) * 100;

    // Lower numbers = higher priority (red), higher numbers = lower priority (blue)
    if (priorityPercent <= 33) return "bg-red-100 text-red-700 border-red-200";
    if (priorityPercent <= 66)
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getPriorityLabel = (priority: number, groupId: number) => {
    // Get group capacity to determine priority range
    const group = groupsData?.data?.find((g: GroupRead) => g.id === groupId);
    const capacity = group?.capacity || 100;

    // Calculate priority percentage (1 is 0%, capacity is 100%)
    const priorityPercent = ((priority - 1) / (capacity - 1)) * 100;

    // Lower numbers = higher priority, higher numbers = lower priority
    if (priorityPercent <= 33) return t("high") || "High";
    if (priorityPercent <= 66) return t("medium") || "Medium";
    return t("low") || "Low";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("waitingList") || "Waiting List"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("waitingListDescription") ||
              "Manage students waiting for group slots"}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("addToWaitingList") || "Add to Waiting List"}
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("waitingListEntries") || "Waiting List Entries"}
            </CardTitle>
            {data?.meta && (
              <Badge variant="secondary">
                {t("total")}: {data.meta.total}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <div className="divide-y">
              {data.data.map((entry: WaitingListRead, index: number) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {entry.student_first_name.charAt(0)}
                          {entry.student_last_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {entry.student_first_name} {entry.student_last_name}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {t("birthYear") || "Birth Year"}: {entry.birth_year}
                          </div>
                        </div>
                      </div>

                      {/* Parent Contact Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Father:</span>
                          <span className="font-medium">{entry.father_name}</span>
                          <span className="text-muted-foreground">({entry.father_phone})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Mother:</span>
                          <span className="font-medium">{entry.mother_name}</span>
                          <span className="text-muted-foreground">({entry.mother_phone})</span>
                        </div>
                      </div>

                      {/* Group and Priority */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {getGroupName(entry.group_id)}
                        </Badge>
                        <Badge className={getPriorityColor(entry.priority, entry.group_id)}>
                          {t("priority")}: {getPriorityLabel(entry.priority, entry.group_id)} (
                          {entry.priority})
                        </Badge>
                        <Badge variant="secondary" className="gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(entry.created_at), "MMM d, yyyy")}
                        </Badge>
                      </div>

                      {/* Notes */}
                      {entry.notes && (
                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            {entry.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(entry)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">
                {t("noWaitingListEntries") || "No waiting list entries"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {t("noWaitingListEntriesDescription") ||
                  "Add students to the waiting list when groups are full"}
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-6 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {paginationItems.map((item, idx) =>
                  typeof item === "number" ? (
                    <Button
                      key={idx}
                      variant={page === item ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </Button>
                  ) : (
                    <span key={idx} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <WaitingListDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        entry={selectedEntry}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
        }}
      />
    </motion.div>
  );
}
