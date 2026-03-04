/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Edit,
  Trash2,
  X,
  AlignLeft,
} from "lucide-react";
import { format } from "date-fns";
import type { SessionRead, GroupRead } from "@/types/api";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/languageStore";

interface SessionDetailsDialogProps {
  session: SessionRead | null;
  group: GroupRead | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupColorClass?: string;
  onEdit?: (session: SessionRead) => void;
  onDelete?: (session: SessionRead) => void;
  showActions?: boolean;
}

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

export default function SessionDetailsDialog({
  session,
  group,
  open,
  onOpenChange,
  groupColorClass = "bg-blue-500",
  onEdit,
  onDelete,
  showActions = false,
}: SessionDetailsDialogProps) {
  const { t } = useLanguageStore();

  if (!session) return null;

  const duration = () => {
    const [startHour, startMin] = session.start_time.split(":").map(Number);
    const [endHour, endMin] = session.end_time.split(":").map(Number);
    const startInMin = startHour * 60 + startMin;
    const endInMin = endHour * 60 + endMin;
    return ((endInMin - startInMin) / 60).toFixed(1);
  };

  const currentStudents =
    group?.active_students_count ??
    group?.current_student_count ??
    (group as any)?.students_count ??
    0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 pb-8">
        <div className="relative">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-white", groupColorClass)}>
                    {group?.name || `${t("group") || "Group"} ${session.group_id}`}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {duration()} {t("hours") || "hours"}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">
                  {session.topic || t("trainingSession") || "Training Session"}
                </DialogTitle>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{t("date") || "Date"}</span>
                </div>
                <p className="text-sm pl-6">
                  {format(new Date(session.session_date), "EEEE, MMM d, yyyy")}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{t("time") || "Time"}</span>
                </div>
                <p className="text-sm pl-6">
                  {session.start_time} - {session.end_time}
                </p>
              </div>
            </div>

            <Separator />

            {(session.location || (session as any).station) && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">{t("location") || "Location"}</span>
                  </div>
                  <p className="text-sm pl-6 font-medium text-foreground">
                    {session.location || (session as any).station}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {session.description && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                    <AlignLeft className="w-4 h-4" />
                    <span className="font-medium">{t("description") || "Description"}</span>
                  </div>
                  <p className="text-sm pl-6 text-foreground whitespace-pre-wrap leading-relaxed">
                    {session.description}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {group && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{t("groupInfo") || "Group Information"}</span>
                  </div>
                  <div className="pl-6 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("birthYear") || "Birth Year"}:</span>
                      <span className="font-medium">{group.birth_year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("schedule") || "Schedule"}:</span>
                      <span className="font-medium">
                        {normalizeScheduleDays(group.schedule_days)} - {group.schedule_time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("capacity") || "Capacity"}:</span>
                      <span className="font-medium">
                        {currentStudents} / {group.capacity}
                      </span>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{t("sessionDetails") || "Session Details"}</span>
              </div>
              <div className="pl-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("sessionId") || "Session ID"}:</span>
                  <span className="font-medium">#{session.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("created") || "Created"}:</span>
                  <span className="font-medium">
                    {format(new Date(session.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {showActions && (onEdit || onDelete) && (
            <DialogFooter className="gap-3 px-6 pb-6 border-t pt-6">
              {onDelete && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete(session);
                    onOpenChange(false);
                  }}
                  className="gap-2 flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("deleteSession") || "Delete Session"}
                </Button>
              )}
              {onEdit && (
                <Button
                  onClick={() => {
                    onEdit(session);
                    onOpenChange(false);
                  }}
                  className="gap-2 flex-1"
                >
                  <Edit className="w-4 h-4" />
                  {t("editSession") || "Edit Session"}
                </Button>
              )}
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
