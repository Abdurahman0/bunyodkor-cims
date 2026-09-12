import {
  AlertTriangle,
  CheckCircle2,
  Infinity as InfinityIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/languageStore";
import { useYearLimit } from "@/hooks/useYearLimit";

interface YearLimitNoticeProps {
  /** Birth year of the selected group. Nothing renders until it is known. */
  birthYear?: number | null;
  className?: string;
}

/**
 * Live "how many places are left in this birth year" banner.
 *
 * Enrolment is capped per birth year across every group, so this is the number
 * that decides whether a new student can be enrolled — the group's own
 * `capacity` is display-only. Callers that submit an enrolment should also read
 * `useYearLimit(...)` and block on `is_full`; the query is shared, so the extra
 * call costs nothing.
 */
export function YearLimitNotice({ birthYear, className }: YearLimitNoticeProps) {
  const { t } = useLanguageStore();
  const { data: usage, isLoading } = useYearLimit(birthYear);

  if (!birthYear) return null;

  if (isLoading || !usage) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          className,
        )}
      >
        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
        {isLoading ? t("checkingYearLimit") : null}
      </p>
    );
  }

  // No limit row for this year — unlimited, but still show the headcount so the
  // admin knows where the year stands before setting a limit.
  if (!usage.has_limit) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <InfinityIcon className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold text-foreground">
            {usage.birth_year}
          </span>{" "}
          — {t("yearLimitUnlimited")} ({t("currentlyEnrolled")}:{" "}
          {usage.current_count})
        </span>
      </div>
    );
  }

  if (usage.is_full) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
          className,
        )}
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold">{usage.birth_year}</span> —{" "}
          {t("yearLimitReached")} ({usage.current_count}/{usage.max_students}).{" "}
          {t("yearLimitReachedHint")}
        </span>
      </div>
    );
  }

  const remaining = usage.remaining ?? 0;
  const isLow = remaining <= 5;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        isLow
          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
          : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
        className,
      )}
    >
      {isLow ? (
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      )}
      <span>
        <span className="font-semibold">{usage.birth_year}</span> —{" "}
        {t("yearLimitSlotsLeft").replace("{{count}}", String(remaining))} (
        {usage.current_count}/{usage.max_students})
      </span>
    </div>
  );
}
