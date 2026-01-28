/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GroupRead } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { groupService } from "@/services/api.service";
import { Loader2, Users, Search, Filter, Download } from "lucide-react"; // Ikonkalar qo'shildi
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useLanguageStore } from "@/store/languageStore";
import { Button } from "@/components/ui/button"; // Button kerak bo'lishi mumkin
import { Input } from "@/components/ui/input"; // Qidiruv uchun
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import { downloadFile } from "@/lib/export-utils";

interface GroupDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupRead | null;
}

export const GroupDetailsDialog: FC<GroupDetailsDialogProps> = ({
  open,
  onOpenChange,
  group,
}) => {
  const { t } = useLanguageStore();
  const { token } = useAuthStore();
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["group-students", group?.id],
    queryFn: () =>
      group && groupService.getGroupStudents(group.id).then((res) => res.data),
    enabled: !!group && open,
  });

  const getStatusBadge = (status: string) => {
    // Ranglarni professionalroq va yumshoqroq qildik
    const variants: Record<
      string,
      { bg: string; text: string; border: string }
    > = {
      active: {
        bg: "bg-emerald-500/15",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-800",
      },
      inactive: {
        bg: "bg-slate-500/15",
        text: "text-slate-600 dark:text-slate-400",
        border: "border-slate-200 dark:border-slate-800",
      },
      graduated: {
        bg: "bg-blue-500/15",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
      },
      deleted: {
        bg: "bg-rose-500/15",
        text: "text-rose-600 dark:text-rose-400",
        border: "border-rose-200 dark:border-rose-800",
      },
      suspended: {
        bg: "bg-amber-500/15",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800",
      },
    };
    const variant = variants[status] || variants.active;

    return (
      <Badge
        variant="outline"
        className={`${variant.bg} ${variant.text} ${variant.border} px-2.5 py-0.5 shadow-sm font-medium`}
      >
        {t(status.charAt(0).toUpperCase() + status.slice(1)) || status}
      </Badge>
    );
  };

  const handleExport = async () => {
    if (!group) return;

    const toastId = toast.loading(t("exportingData") || "Exporting data...");
    try {
      const response = await apiClient.get(`/groups/${group.id}/export-students`, {
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      let filename = `group_${group.name}_students.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2)
          filename = filenameMatch[1];
      }

      downloadFile(response.data, filename);

      toast.success(t("exportedSuccessfully") || "Exported successfully", {
        id: toastId,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || t("errorExportingData") || "Export failed", {
        id: toastId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-w-5xl - oynani kengroq qildik, p-0 - ichki paddingni o'zimiz boshqaramiz */}
      <DialogContent
        className="sm:max-w-5xl p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl"
        onClose={() => onOpenChange(false)}
      >
        {/* Header qismi - alohida ajratilgan */}
        <DialogHeader className="p-6 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {group?.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("students") || "Students"} • {studentsData?.length || 0}{" "}
                {t("total") || "total"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {t("export") || "Export"}
          </Button>
        </DialogHeader>

        <div className="p-6 bg-card">
          {/* Toolbar (Qidiruv yoki Filtr uchun joy - ixtiyoriy) */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("searchStudent") || "Search students..."}
                className="pl-9 h-9 bg-muted/50 border-none shadow-none focus-visible:ring-1"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {t("filter") || "Filter"}
              </span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground animate-pulse">
                {t("loading") || "Yuklanmoqda..."}
              </p>
            </div>
          ) : studentsData && studentsData.length > 0 ? (
            // Jadval konteyneri - chiroyli border va radius bilan
            <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
              <div className="max-h-[55vh] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50 z-10 backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                      <TableHead className="w-[300px] py-4 pl-6 font-semibold text-foreground/70">
                        {t("student") || "Student"}
                      </TableHead>
                      <TableHead className="font-semibold text-foreground/70">
                        {t("phone") || "Phone"}
                      </TableHead>
                      <TableHead className="hidden sm:table-cell font-semibold text-foreground/70">
                        {t("birthYear") || "Birth Year"}
                      </TableHead>
                      <TableHead className="hidden md:table-cell font-semibold text-foreground/70">
                        {t("address") || "Address"}
                      </TableHead>
                      <TableHead className="text-right pr-6 font-semibold text-foreground/70">
                        {t("status") || "Status"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsData.map((student: any) => (
                      <TableRow
                        key={student.id}
                        className="hover:bg-muted/40 transition-colors border-b border-border/40 group"
                      >
                        <TableCell className="py-3 pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/50 ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
                              <AvatarImage
                                src={student.photo_url || ""}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                                {student.first_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-foreground">
                                {student.first_name} {student.last_name}
                              </span>
                              {/* ID yoki username bo'lsa shu yerga mayda qilib yozish mumkin */}
                              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                                ID: {student.id.toString().slice(-4)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-muted-foreground/80 font-mono">
                          {student.phone || "-"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {student.date_of_birth
                            ? format(new Date(student.date_of_birth), "yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell
                          className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate"
                          title={student.address}
                        >
                          {student.address || "-"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {getStatusBadge(student.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl border-muted">
              <div className="p-4 rounded-full bg-muted/50 mb-3">
                <Users className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                {t("noStudentsFound") || "No Students Found"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                {t("noStudentsInGroup") ||
                  "This group currently has no students enrolled."}
              </p>
            </div>
          )}
        </div>

        {/* Footer qismi (ixtiyoriy) - masalan umumiy statistika */}
        {studentsData && studentsData.length > 0 && (
          <div className="bg-muted/30 p-4 text-xs text-center text-muted-foreground border-t">
            Showing {studentsData.length} students
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
