import { useQuery, type QueryClient } from "@tanstack/react-query";
import { yearLimitService } from "@/services/api.service";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Per-birth-year enrolment limit.
 *
 * Enrolment is capped per BIRTH YEAR, not per group: a year may hold any number
 * of groups and coaches, but the sum of ACTIVE contracts across all of them
 * cannot exceed the year's limit. A year with no limit row is unlimited.
 */
export const yearLimitKeys = {
  all: ["year-limits"] as const,
  usage: () => [...yearLimitKeys.all, "usage"] as const,
  year: (birthYear: number) => [...yearLimitKeys.all, "year", birthYear] as const,
};

/**
 * Refresh every year-limit counter. Call after anything that creates or ends an
 * active contract (enrolment, clone-from-terminated, termination, transfer).
 */
export function invalidateYearLimits(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: yearLimitKeys.all });
}

/**
 * Limit + live usage for one birth year. Safe to call for any year: a year with
 * no configured limit answers `has_limit: false` / `max_students: null` instead
 * of failing, so the caller never has to know whether a limit exists.
 *
 * Skipped entirely for accounts without `groups:view` (the endpoint would 403).
 */
export function useYearLimit(birthYear?: number | null) {
  const { can } = usePermissions();
  const year = Number(birthYear) || 0;

  return useQuery({
    queryKey: yearLimitKeys.year(year),
    queryFn: () => yearLimitService.getYearLimit(year),
    enabled: year > 0 && can("groups:view"),
    select: (response) => response.data,
    staleTime: 30 * 1000,
  });
}
