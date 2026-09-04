/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { waitingListService, groupService } from "@/services/api.service";
import { exportToExcel } from "@/lib/export-utils";
import { formatNameParts } from "@/lib/name-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Phone,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguageStore } from "@/store/languageStore";
import { usePermissions } from "@/hooks/usePermissions";
import type { WaitingListRead, GroupRead } from "@/types/api";
import { WaitingListDialog } from "./WaitingListDialog";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

export default function WaitingList() {
  const { t } = useLanguageStore();
  const { isReadOnly } = usePermissions();
  const [page, setPage] = useState(1);
  const [birthYearFilter, setBirthYearFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitingListRead | null>(
    null
  );
  const [viewEntry, setViewEntry] = useState<WaitingListRead | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: waitingListEntries = [], isLoading } = useQuery({
    queryKey: ["waiting-list", "all"],
    queryFn: async () => {
      const firstPage = await waitingListService.getWaitingList({
        page: 1,
        page_size: 100,
      });

      let allEntries = firstPage.data ? [...firstPage.data] : [];
      const totalPages = firstPage.meta?.total_pages || 1;

      for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
        const response = await waitingListService.getWaitingList({
          page: currentPage,
          page_size: 100,
        });

        if (response.data?.length) {
          allEntries = [...allEntries, ...response.data];
        }
      }

      return allEntries;
    },
  });

  // Sort waiting list by priority (ascending - lower numbers = higher priority)
  const sortedEntries = [...waitingListEntries].sort(
    (a, b) => a.priority - b.priority,
  );
  const birthYearOptions = Array.from(
    new Set(sortedEntries.map((entry) => entry.birth_year)),
  ).sort((a, b) => b - a);
  const filteredEntries = birthYearFilter
    ? sortedEntries.filter(
        (entry) => String(entry.birth_year) === birthYearFilter,
      )
    : sortedEntries;
  const totalEntries = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));
  const paginatedEntries = filteredEntries.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const hasActiveFilters = Boolean(birthYearFilter);

  // Get all groups for display
  const { data: groupsData } = useQuery({
    queryKey: ["groups-list-all"],
    queryFn: async () => {
      let allGroups: GroupRead[] = [];
      let currentPage = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await groupService.getGroups({ page: currentPage, page_size: 100 });
        if (response.data && response.data.length > 0) {
          allGroups = [...allGroups, ...response.data];
          if (response.meta && currentPage < response.meta.total_pages) {
            currentPage++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return { data: allGroups };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => waitingListService.removeFromWaitingList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      toast.success(t("waitingListRemovedSuccess"));
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t("failedToRemoveFromWaitingList");

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
        (t("confirmRemoveWaitingList") ||
          "Are you sure you want to remove {{student}} from the waiting list?")
          .replace(
            "{{student}}",
            formatNameParts(entry.student_last_name, entry.student_first_name),
          )
      )
    ) {
      deleteMutation.mutate(entry.id);
    }
  };

  const getGroupName = (groupId: number) => {
    const group = groupsData?.data?.find((g: GroupRead) => g.id === groupId);
    return group
      ? group.name
      : (t("groupNumber") || "Group #{{id}}").replace(
          "{{id}}",
          String(groupId),
        );
  };

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const clearFilters = () => {
    setBirthYearFilter("");
    setPage(1);
  };

  const handleExport = async () => {
    if (filteredEntries.length === 0) {
      toast.error(t("noDataToExport") || "No data to export");
      return;
    }

    const toastId = toast.loading(t("exportingData") || "Exporting data...");
    setIsExporting(true);

    try {
      const exportRows = filteredEntries.map((entry) => ({
        [t("student") || "Student"]: formatNameParts(
          entry.student_last_name,
          entry.student_first_name,
        ),
        [t("birthYear") || "Birth Year"]: entry.birth_year,
        [t("group") || "Group"]: getGroupName(entry.group_id),
        [t("priority") || "Priority"]: entry.priority,
        [t("priorityLevel") || "Priority Level"]: getPriorityLabel(
          entry.priority,
          entry.group_id,
        ),
        [t("father") || "Father"]: entry.father_name,
        [t("fatherPhone") || "Father Phone"]: entry.father_phone,
        [t("mother") || "Mother"]: entry.mother_name,
        [t("motherPhone") || "Mother Phone"]: entry.mother_phone,
        [t("notes") || "Notes"]: entry.notes || "",
        [t("waitingListAddedAt") || t("createdAt") || "Added At"]: format(
          new Date(entry.created_at),
          "dd.MM.yyyy HH:mm",
        ),
      }));

      exportToExcel(exportRows, "waiting-list", {
        sheetName: t("waitingList") || "Waiting List",
      });

      toast.success(t("exportedSuccessfully") || "Exported successfully", {
        id: toastId,
      });
    } catch (error: any) {
      console.error("Waiting list export error:", error);
      toast.error(error.message || t("errorExportingData") || "Export failed", {
        id: toastId,
      });
    } finally {
      setIsExporting(false);
    }
  };

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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || isExporting || filteredEntries.length === 0}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t("export") || "Export"}
          </Button>
          {!isReadOnly && (
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("addToWaitingList") || "Add to Waiting List"}
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/50">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("waitingListEntries") || "Waiting List Entries"}
              </CardTitle>
              <Badge variant="secondary">
                {t("total")}: {totalEntries}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={birthYearFilter}
                onChange={(e) => {
                  setBirthYearFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-44"
              >
                <option value="">{t("allYears") || "All Years"}</option>
                {birthYearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{t("activeFilters")}</span>
              <Badge variant="secondary">
                {t("birthYear") || "Birth Year"}: {birthYearFilter}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : paginatedEntries.length > 0 ? (
            <div className="divide-y">
              {paginatedEntries.map((entry: WaitingListRead, index: number) => (
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
                            <button
                              type="button"
                              onClick={() => {
                                setViewEntry(entry);
                                setIsViewDialogOpen(true);
                              }}
                              className="text-left text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {formatNameParts(
                                entry.student_last_name,
                                entry.student_first_name,
                              )}
                            </button>
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
                          <span className="text-muted-foreground">
                            {t("father")}:
                          </span>
                          <span className="font-medium">{entry.father_name}</span>
                          <span className="text-muted-foreground">({entry.father_phone})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {t("mother")}:
                          </span>
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
                          {(t("waitingListAddedAt") ||
                            t("createdAt") ||
                            "Added to waiting list") + ":"}{" "}
                          {format(new Date(entry.created_at), "dd.MM.yyyy")}
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
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(entry)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
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
                {hasActiveFilters
                  ? t("adjustFiltersMessage") ||
                    "Try adjusting your filters to find what you're looking for."
                  : t("noWaitingListEntriesDescription") ||
                    "Add students to the waiting list when groups are full"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  {t("clearFilters") || "Clear Filters"}
                </Button>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-6 border-t">
              <p className="text-sm text-muted-foreground">
                {(t("pageOfTotal") || "Page {{page}} of {{total}}")
                  .replace("{{page}}", String(page))
                  .replace("{{total}}", String(totalPages))}
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
        // @ts-ignore - Passing groups prop even if type definition might be missing in local file
        groups={groupsData?.data || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
        }}
      />

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className="max-w-md sm:max-w-lg p-0 overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setIsViewDialogOpen(false)}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground z-10"
            aria-label={t("close") || "Close"}
          >
            <X className="h-4 w-4" />
          </button>
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {t("studentInformation") || "O'quvchi Ma'lumotlari"}
            </DialogTitle>
          </DialogHeader>
          
          {viewEntry && (
            <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[80vh]">
              
              {/* Asosiy ma'lumotlar va Avatar */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/50 mt-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex shrink-0 items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {viewEntry.student_first_name.charAt(0)}
                  {viewEntry.student_last_name.charAt(0)}
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold leading-none text-foreground">
                    {formatNameParts(
                      viewEntry.student_last_name,
                      viewEntry.student_first_name,
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="outline" className="gap-1 bg-background">
                      <Users className="w-3 h-3" />
                      {getGroupName(viewEntry.group_id)}
                    </Badge>
                    <Badge className={getPriorityColor(viewEntry.priority, viewEntry.group_id)}>
                      {t("priority") || "Ustuvorlik"}: {viewEntry.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Qo'shimcha detallar gridi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {t("birthYear") || "Tug'ilgan yili"}
                  </span>
                  <p className="font-medium text-foreground">{viewEntry.birth_year}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    {t("waitingListAddedAt") ||
                      t("createdAt") ||
                      "Navbatga qo'yilgan sana"}
                  </span>
                  <p className="font-medium text-foreground">
                    {format(new Date(viewEntry.created_at), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
              </div>

              {/* Ota-ona ma'lumotlari */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  {t("parentInformation") || "Ota-Ona Ma'lumotlari"}
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Ota */}
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("father") || "Ota"}
                    </span>
                    <div className="font-semibold text-foreground mt-0.5">{viewEntry.father_name}</div>
                    <a 
                      href={`tel:${viewEntry.father_phone}`} 
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 mt-2"
                    >
                      <Phone className="w-3.5 h-3.5" /> 
                      {viewEntry.father_phone}
                    </a>
                  </div>
                  
                  {/* Ona */}
                  <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("mother") || "Ona"}
                    </span>
                    <div className="font-semibold text-foreground mt-0.5">{viewEntry.mother_name}</div>
                    <a 
                      href={`tel:${viewEntry.mother_phone}`} 
                      className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5 mt-2"
                    >
                      <Phone className="w-3.5 h-3.5" /> 
                      {viewEntry.mother_phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Izohlar */}
              {viewEntry.notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    {t("notes") || "Izoh"}
                  </h4>
                  <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 text-sm leading-relaxed">
                    {viewEntry.notes}
                  </div>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
