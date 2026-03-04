import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Clock,
  MapPin,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { SessionRead, GroupRead } from "@/types/api";

interface WeeklyTimeTableProps {
  sessions: SessionRead[];
  groups: GroupRead[];
  onSessionClick?: (session: SessionRead) => void;
  onTimeSlotClick?: (date: string, time: string) => void;
  onCopyWeekToNext?: (weekStart: Date) => void;
  isCopyingWeek?: boolean;
  currentWeekStart?: Date;
  onCurrentWeekStartChange?: (weekStart: Date) => void;
  copyWeekLabel?: string;
  copyingWeekLabel?: string;
  showCreateButton?: boolean;
  className?: string;
}

// Generate time slots from 6:00 to 22:00
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  return `${hour.toString().padStart(2, "0")}:00`;
});

// Week days
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toHourSlot = (time: string) => {
  const [hour] = time.split(":");
  return `${hour.padStart(2, "0")}:00`;
};

// Color palette for groups (vibrant and modern)
const GROUP_COLORS = [
  "bg-blue-500 border-blue-600 text-white hover:bg-blue-600",
  "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600",
  "bg-purple-500 border-purple-600 text-white hover:bg-purple-600",
  "bg-orange-500 border-orange-600 text-white hover:bg-orange-600",
  "bg-pink-500 border-pink-600 text-white hover:bg-pink-600",
  "bg-cyan-500 border-cyan-600 text-white hover:bg-cyan-600",
  "bg-rose-500 border-rose-600 text-white hover:bg-rose-600",
  "bg-indigo-500 border-indigo-600 text-white hover:bg-indigo-600",
  "bg-amber-500 border-amber-600 text-white hover:bg-amber-600",
  "bg-teal-500 border-teal-600 text-white hover:bg-teal-600",
];

export default function WeeklyTimeTable({
  sessions,
  groups,
  onSessionClick,
  onTimeSlotClick,
  onCopyWeekToNext,
  isCopyingWeek = false,
  currentWeekStart,
  onCurrentWeekStartChange,
  copyWeekLabel = "Copy To Next Week",
  copyingWeekLabel = "Copying...",
  showCreateButton = true,
  className,
}: WeeklyTimeTableProps) {
  const [localWeekStart, setLocalWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  );

  const weekStart = currentWeekStart ?? localWeekStart;

  const setWeekStart = (nextWeekStart: Date) => {
    if (onCurrentWeekStartChange) {
      onCurrentWeekStartChange(nextWeekStart);
      return;
    }
    setLocalWeekStart(nextWeekStart);
  };

  // Create color map for groups
  const groupColorMap = useMemo(() => {
    const map = new Map<number, string>();
    groups.forEach((group, index) => {
      map.set(group.id, GROUP_COLORS[index % GROUP_COLORS.length]);
    });
    return map;
  }, [groups]);

  // Get week dates
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Organize sessions by date and time
  const sessionsByDateTime = useMemo(() => {
    const map = new Map<string, SessionRead[]>();

    sessions.forEach((session) => {
      const dateKey = session.session_date;
      const timeKey = toHourSlot(session.start_time.substring(0, 5));
      const key = `${dateKey}-${timeKey}`;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(session);
    });

    return map;
  }, [sessions]);

  // Calculate session duration in grid units (each unit = 1 hour)
  const getSessionDuration = (session: SessionRead) => {
    const [startHour, startMin] = session.start_time.split(":").map(Number);
    const [endHour, endMin] = session.end_time.split(":").map(Number);

    const startInMin = startHour * 60 + startMin;
    const endInMin = endHour * 60 + endMin;

    return (endInMin - startInMin) / 60; // Duration in hours
  };

  const handlePreviousWeek = () => {
    setWeekStart(subWeeks(weekStart, 1));
  };

  const handleNextWeek = () => {
    setWeekStart(addWeeks(weekStart, 1));
  };

  const handleTimeSlotClick = (date: Date, timeSlot: string) => {
    if (onTimeSlotClick) {
      const dateStr = format(date, "yyyy-MM-dd");
      onTimeSlotClick(dateStr, timeSlot);
    }
  };

  const getGroup = (groupId: number) => {
    return groups.find((g) => g.id === groupId);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Week Navigation Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {format(weekStart, "MMM d")} -{" "}
                {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onCopyWeekToNext && (
                <Button
                  variant="secondary"
                  onClick={() => onCopyWeekToNext(weekStart)}
                  disabled={isCopyingWeek}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {isCopyingWeek ? copyingWeekLabel : copyWeekLabel}
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row with Days */}
              <div className="grid grid-cols-8 border-b bg-muted/50">
                <div className="p-3 font-semibold text-sm text-muted-foreground border-r">
                  Time
                </div>
                {weekDates.map((date, index) => {
                  const isToday =
                    format(date, "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd");
                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-3 text-center border-r last:border-r-0",
                        isToday && "bg-primary/10",
                      )}
                    >
                      <div className="font-semibold text-sm">
                        {WEEK_DAYS[index]}
                      </div>
                      <div
                        className={cn(
                          "text-xs mt-1",
                          isToday
                            ? "text-primary font-bold"
                            : "text-muted-foreground",
                        )}
                      >
                        {format(date, "MMM d")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Slots Rows */}
              {TIME_SLOTS.map((timeSlot) => (
                <div
                  key={timeSlot}
                  className="grid grid-cols-8 border-b last:border-b-0 min-h-[80px]"
                >
                  {/* Time Label */}
                  <div className="p-3 text-sm font-medium text-muted-foreground border-r bg-muted/30 flex items-start">
                    {timeSlot}
                  </div>

                  {/* Day Cells */}
                  {weekDates.map((date, dayIndex) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const key = `${dateStr}-${timeSlot}`;
                    const daySessions = sessionsByDateTime.get(key) || [];
                    const isToday =
                      dateStr === format(new Date(), "yyyy-MM-dd");

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "p-2 border-r last:border-r-0 relative group cursor-pointer transition-colors",
                          isToday ? "bg-primary/5" : "hover:bg-muted/50",
                        )}
                        onClick={() => {
                          if (daySessions.length === 0) {
                            handleTimeSlotClick(date, timeSlot);
                          }
                        }}
                      >
                        {/* Empty slot - show plus icon on hover */}
                        {daySessions.length === 0 && showCreateButton && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1 rounded-full bg-primary/10">
                              <Plus className="w-4 h-4 text-primary" />
                            </div>
                          </div>
                        )}

                        {/* Sessions */}
                        <div className="space-y-1">
                          {daySessions.map((session) => {
                            const group = getGroup(session.group_id);
                            const duration = getSessionDuration(session);
                            const colorClass =
                              groupColorMap.get(session.group_id) ||
                              GROUP_COLORS[0];

                            return (
                              <button
                                key={session.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSessionClick?.(session);
                                }}
                                className={cn(
                                  "w-full p-2 rounded-lg border-l-4 text-left transition-all shadow-sm",
                                  "hover:shadow-md hover:scale-[1.02]",
                                  colorClass,
                                )}
                                style={{
                                  minHeight:
                                    duration > 1
                                      ? `${Math.min(duration * 60, 150)}px`
                                      : "auto",
                                  maxHeight: "150px",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-semibold text-xs line-clamp-1">
                                      {group?.name ||
                                        `Group ${session.group_id}`}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1 h-4 bg-white/20"
                                    >
                                      {duration}h
                                    </Badge>
                                  </div>

                                  {session.topic && (
                                    <p className="text-[10px] opacity-90 line-clamp-1">
                                      {session.topic}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 text-[10px] opacity-80">
                                    <div className="flex items-center gap-0.5">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {session.start_time} -{" "}
                                        {session.end_time}
                                      </span>
                                    </div>
                                  </div>

                                  {session.station && (
                                    <div className="flex items-center gap-1 text-[10px] opacity-80">
                                      <MapPin className="w-3 h-3" />
                                      <span className="line-clamp-1">
                                        {session.station}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Groups:
            </span>
            {groups.slice(0, 10).map((group) => {
              const colorClass = groupColorMap.get(group.id) || GROUP_COLORS[0];
              return (
                <Badge key={group.id} className={cn("text-xs", colorClass)}>
                  {group.name}
                </Badge>
              );
            })}
            {groups.length > 10 && (
              <span className="text-xs text-muted-foreground">
                +{groups.length - 10} more
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
