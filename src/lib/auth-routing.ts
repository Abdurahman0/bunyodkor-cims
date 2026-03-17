import type { User } from "@/types";

const routesConfig = [
  { path: "/", permission: "dashboard:view" },
  { path: "/students", permission: "students:view" },
  { path: "/groups", permission: "groups:view" },
  { path: "/contracts", permission: "contracts:view" },
  { path: "/finance", permission: "finance:transactions:view" },
  { path: "/coach", permission: "attendance:coach:mark" },
  { path: "/attendance", permission: "attendance:view" },
  { path: "/gate", permission: "gate:logs:view" },
  { path: "/waiting-list", permission: "students:view" },
  { path: "/reports", permission: "reports:dashboard:view" },
  { path: "/users", permission: "users:manage" },
  { path: "/roles", permission: "roles:view" },
  { path: "/settings", permission: "settings:system:view" },
  { path: "/archive", permission: "settings:system:view" },
  { path: "/head-coach", permission: "session:create" },
];

const normalizeRole = (role: unknown) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

export const hasPermission = (permissions: string[], permission?: string) => {
  if (!permission) return true;
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;

  const parts = permission.split(":");
  for (let i = 1; i < parts.length; i++) {
    const wildcard = parts.slice(0, i).join(":") + ":*";
    if (permissions.includes(wildcard)) return true;
  }

  return false;
};

export const hasRole = (user: User | null, role: string) => {
  if (!user) return false;

  const normalizedRole = normalizeRole(role);
  if (normalizeRole(user.role) === normalizedRole) return true;

  return !!user.roles?.some((userRole) => {
    const roleName =
      typeof userRole === "string" ? userRole : userRole?.name;
    return normalizeRole(roleName) === normalizedRole;
  });
};

export const getFirstAccessibleRoute = (
  user: User | null,
  permissions: string[],
) => {
  if (!user) return "/login";
  if (user.is_super_admin) return "/";

  if (hasRole(user, "head-coach")) {
    return "/head-coach";
  }

  if (hasRole(user, "coach")) {
    return "/coach";
  }

  const route = routesConfig.find(({ permission }) =>
    hasPermission(permissions, permission),
  );

  return route?.path || "/login";
};
