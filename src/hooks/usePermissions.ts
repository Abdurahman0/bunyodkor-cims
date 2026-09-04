import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/auth-routing";

/**
 * Central permission + read-only gate.
 *
 * - `can(perm)` — may the user SEE/READ this (permission check, super-admin and
 *   `*` bypass). Use for navigation, lists, detail views, reports and exports.
 * - `canWrite(perm)` — may the user MODIFY (create/edit/delete/...). This is
 *   `can(perm)` AND NOT read-only. A read-only account (e.g. CEO) intentionally
 *   still holds write permissions in its `permissions` array so it can open
 *   every screen, so write controls MUST be gated on `canWrite`, never on the
 *   raw permission alone. Call with no argument for controls that have no
 *   dedicated permission — it collapses to "not read-only".
 * - `isReadOnly` — the raw flag, e.g. for a header badge or to hide a nav entry.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const isReadOnly = useAuthStore((s) => s.isReadOnly);

  const isSuperAdmin = Boolean(user?.is_super_admin);

  const can = (permission?: string) =>
    isSuperAdmin || hasPermission(permissions, permission);

  const canWrite = (permission?: string) => !isReadOnly && can(permission);

  return { user, permissions, isReadOnly, isSuperAdmin, can, canWrite };
}
