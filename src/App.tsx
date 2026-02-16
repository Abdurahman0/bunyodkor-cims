/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useEffect, type JSX } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";

// Layout
import DashboardLayout from "./layout/DashboardLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/students/Students";
import Groups from "./pages/groups/Groups";
import Finance from "./pages/finance/Finance";
import Users from "./pages/users/Users";
import Roles from "./pages/roles/Roles";
import Reports from "./pages/reports/Reports";
import Contracts from "./pages/contracts/Contracts";
import Settings from "./pages/settings/Settings";
import GateLogs from "./pages/gate/GateLogs";
import CoachOrHeadCoachPanel from "./pages/coach/CoachOrHeadCoachPanel";
import StudentDetailPage from "./pages/students/StudentDetailPage";
import WaitingList from "./pages/waiting-list/WaitingList";
import Archive from "./pages/archive/Archive"; // Yangi qo'shilgan sahifa
import PublicContractCheck from "./pages/public/PublicContractCheck"; // Yangi qo'shilgan
import Attendance from "./pages/attendance/Attendance";
import HeadCoach from "./pages/head-coach/HeadCoach";

// Dev Tools
import { DevTools } from "./components/DevTools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ThemeInitializer() {
  const { isDarkMode } = useThemeStore();
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);
  return null;
}

// Barcha route va ularning ruxsatlari ro'yxati
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

// Foydalanuvchi uchun birinchi ruxsat etilgan sahifani topish
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFirstAccessibleRoute = (user: any, permissions: string[]) => {
  if (!user) return "/login";
  if (user.is_super_admin) return "/"; // Super admin dashboardga kira oladi

  // Head Coach uchun maxsus tekshiruv
  const isHeadCoach =
    user?.role === "head-coach" ||
    !!user?.roles?.some((r: any) => {
      const name = (r.name || r || "")
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/_/g, "-");
      return name === "head-coach";
    });
  if (isHeadCoach) return "/head-coach";

  // Foydalanuvchi ruxsati bor birinchi routeni topamiz
  const route = routesConfig.find((r) => {
    if (!r.permission) return true;
    if (permissions.includes("*")) return true;
    if (permissions.includes(r.permission)) return true;

    // Wildcard check (masalan finance:*)
    const parts = r.permission.split(":");
    for (let i = 1; i < parts.length; i++) {
      const wildcard = parts.slice(0, i).join(":") + ":*";
      if (permissions.includes(wildcard)) return true;
    }
    return false;
  });

  return route ? route.path : "/login"; // Hech qaysiga ruxsat bo'lmasa login
};

interface ProtectedRouteProps {
  children: JSX.Element;
  permission?: string;
  allowedRoles?: string[];
}

function ProtectedRoute({
  children,
  permission,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, permissions } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  if (user.is_super_admin) return children;

  // Rol bo'yicha tekshirish (Permission bo'lmasa ham ruxsat berish uchun)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((role) => {
      if (user.role === role) return true;
      if (user.roles && Array.isArray(user.roles)) {
        return user.roles.some((r: any) => {
          const name = (r.name || r || "")
            .toString()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/_/g, "-");
          return name === role.toLowerCase();
        });
      }
      return false;
    });
    if (hasRole) return children;
  }

  // Ruxsat tekshirish
  const hasPermission = () => {
    if (!permission) return true; // Permission talab qilinmagan bo'lsa (lekin biz hamma joyga qo'ydik)
    if (permissions.includes("*")) return true;
    if (permissions.includes(permission)) return true;

    const parts = permission.split(":");
    for (let i = 1; i < parts.length; i++) {
      const wildcard = parts.slice(0, i).join(":") + ":*";
      if (permissions.includes(wildcard)) return true;
    }
    return false;
  };

  if (hasPermission()) {
    return children;
  }

  // Ruxsat yo'q bo'lsa, foydalanuvchi kira oladigan "Home" sahifasiga yo'naltirish
  const homeRoute = getFirstAccessibleRoute(user, permissions);

  // Agar biz allaqachon homeRoute da bo'lsak va hali ham ruxsat yo'q bo'lsa (bunday bo'lmasligi kerak), login ga otamiz
  if (window.location.pathname === homeRoute && homeRoute !== "/login") {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homeRoute} replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/public/check-contract"
            element={<PublicContractCheck />}
          />

          {/* Protected Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route
              index
              element={
                <ProtectedRoute permission="dashboard:view">
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="students"
              element={
                <ProtectedRoute permission="students:view">
                  <Students />
                </ProtectedRoute>
              }
            />

            <Route
              path="students/:id"
              element={
                <ProtectedRoute permission="students:view">
                  <StudentDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="groups"
              element={
                <ProtectedRoute permission="groups:view">
                  <Groups />
                </ProtectedRoute>
              }
            />

            <Route
              path="contracts"
              element={
                <ProtectedRoute permission="contracts:view">
                  <Contracts />
                </ProtectedRoute>
              }
            />

            <Route
              path="finance"
              element={
                <ProtectedRoute permission="finance:transactions:view">
                  <Finance />
                </ProtectedRoute>
              }
            />

            <Route
              path="coach"
              element={
                <ProtectedRoute permission="attendance:coach:mark">
                  <CoachOrHeadCoachPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="head-coach"
              element={
                <ProtectedRoute
                  permission="session:create"
                  allowedRoles={["head-coach"]}
                >
                  <HeadCoach />
                </ProtectedRoute>
              }
            />

            <Route
              path="attendance"
              element={
                <ProtectedRoute permission="attendance:view">
                  <Attendance />
                </ProtectedRoute>
              }
            />

            <Route
              path="gate"
              element={
                <ProtectedRoute permission="gate:logs:view">
                  <GateLogs />
                </ProtectedRoute>
              }
            />

            <Route
              path="waiting-list"
              element={
                <ProtectedRoute permission="students:view">
                  <WaitingList />
                </ProtectedRoute>
              }
            />

            <Route
              path="reports"
              element={
                <ProtectedRoute permission="reports:dashboard:view">
                  <Reports />
                </ProtectedRoute>
              }
            />

            <Route
              path="users"
              element={
                <ProtectedRoute permission="users:manage">
                  <Users />
                </ProtectedRoute>
              }
            />

            <Route
              path="roles"
              element={
                <ProtectedRoute permission="roles:view">
                  <Roles />
                </ProtectedRoute>
              }
            />

            <Route
              path="settings"
              element={
                <ProtectedRoute permission="settings:system:view">
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="archive"
              element={
                <ProtectedRoute permission="settings:system:view">
                  <Archive />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <DevTools />
    </QueryClientProvider>
  );
}

export default App;
