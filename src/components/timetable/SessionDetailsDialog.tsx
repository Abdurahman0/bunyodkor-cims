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
  User,
  FileText,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { SessionRead, GroupRead } from "@/types/api";
import { cn } from "@/lib/utils";

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
  if (!session) return null;

  const duration = () => {
    const [startHour, startMin] = session.start_time.split(":").map(Number);
    const [endHour, endMin] = session.end_time.split(":").map(Number);
    const startInMin = startHour * 60 + startMin;
    const endInMin = endHour * 60 + endMin;
    return ((endInMin - startInMin) / 60).toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 pb-8">
        <div className="relative">
          {/* Close Button */}
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
                    {group?.name || `Group ${session.group_id}`}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {duration()} hours
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">
                  {session.topic || "Training Session"}
                </DialogTitle>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Date</span>
                </div>
                <p className="text-sm pl-6">
                  {format(new Date(session.session_date), "EEEE, MMM d, yyyy")}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Time</span>
                </div>
                <p className="text-sm pl-6">
                  {session.start_time} - {session.end_time}
                </p>
              </div>
            </div>

            <Separator />

            {/* Station/Location */}
            {session.station && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">Location</span>
                  </div>
                  <p className="text-sm pl-6">{session.station}</p>
                </div>
                <Separator />
              </>
            )}

            {/* Group Details */}
            {group && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Group Information</span>
                  </div>
                  <div className="pl-6 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Birth Year:</span>
                      <span className="font-medium">{group.birth_year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule:</span>
                      <span className="font-medium">
                        {group.schedule_days} • {group.schedule_time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">
                        {group.active_students_count || 0} / {group.capacity}
                      </span>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Session Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="font-medium">Session Details</span>
              </div>
              <div className="pl-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session ID:</span>
                  <span className="font-medium">#{session.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {format(new Date(session.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Footer (for Head Coach) */}
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
                  Delete Session
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
                  Edit Session
                </Button>
              )}
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
