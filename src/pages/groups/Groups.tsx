/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { groupService, userService } from "@/services/api.service";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Calendar,
  Clock,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguageStore } from "@/store/languageStore";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { GroupRead, UserRead } from "@/types/api";
import { GroupDialog } from "./GroupDialog";
import { GroupDetailsDialog } from "./GroupDetailsDialog";

export default function Groups() {
  const { t } = useLanguageStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupRead | null>(null);
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useQuery({
    queryKey: ["groups", page, debouncedSearch],
    queryFn: () =>
      groupService.getGroups({
        page,
        page_size: 10,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: coachesData } = useQuery({
    queryKey: ["coaches"],
    queryFn: () => userService.getCoaches(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => groupService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(
        t("groupDeletedSuccess" as any) || "Group deleted successfully"
      );
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = "Failed to delete group";

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const handleOpenDialog = (group?: GroupRead) => {
    setSelectedGroup(group || null);
    setIsDialogOpen(true);
  };

  const handleOpenDetailsDialog = (group: GroupRead) => {
    setSelectedGroup(group);
    setIsDetailsDialogOpen(true);
  };

  const handleDelete = (group: GroupRead) => {
    const message =
      t("confirmDeleteGroup") ||
      `Are you sure you want to delete group "${group.name}"?`;

    if (confirm(message.replace("{{name}}", group.name))) {
      deleteMutation.mutate(group.id);
    }
  };

  const getCoachName = (coachId: number) => {
    const coach = coachesData?.data?.find((c) => c.id === coachId);
    return coach ? coach.full_name : `ID: ${coachId}`;
  };

  // --- Handlers for Search ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page on search
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
  };

  // --- Pagination Logic ---
  const totalPages = data?.meta?.total_pages || 1;

  const getPaginationItems = () => {
    if (totalPages <= 1) return [];

    // If 7 or fewer pages, show all
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // If current page is near the start
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    // If current page is near the end
    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    // If current page is in the middle
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const paginationItems = getPaginationItems();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("groups")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("manageGroups")}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("newGroup")}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("searchByGroupName")}
                value={search}
                onChange={handleSearchChange}
                className="pl-10 pr-10 border-border/50"
              />
              {search && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((group: GroupRead) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer group h-full border-border/50 hover:border-border"
                    onClick={() => handleOpenDetailsDialog(group)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {group.name}
                            </CardTitle>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <User className="w-3 h-3" />
                              {getCoachName(group.coach_id)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {group.schedule_days}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {group.schedule_time}
                          </span>
                        </div>
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {group.description}
                        </p>
                      )}
                      <div
                        className="flex items-center gap-2 pt-2 border-t border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(group);
                          }}
                          className="flex-1 gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          {t("edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(group);
                          }}
                          className="flex-1 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t("delete")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pagination Controls */}
            {data?.meta && data.meta.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-9 px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>{t("previous")}</span>
                </Button>

                <div className="flex items-center gap-1 mx-2">
                  {paginationItems.map((item, index) =>
                    typeof item === "number" ? (
                      <Button
                        key={`${item}-${index}`}
                        variant={page === item ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPage(item)}
                        className={`w-9 h-9 p-0 font-medium rounded-md transition-colors ${
                          page === item
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {item}
                      </Button>
                    ) : (
                      <span
                        key={`dots-${index}`}
                        className="flex items-center justify-center w-9 h-9 text-muted-foreground"
                      >
                        ...
                      </span>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-9 px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                >
                  <span>{t("next")}</span>
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("noGroupsFound")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("getStartedGroup")}
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                {t("createGroup")}
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      <GroupDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        group={selectedGroup}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["groups"] });
        }}
      />

      {selectedGroup && (
        <GroupDetailsDialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          group={selectedGroup}
        />
      )}
    </div>
  );
}
