/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useEffect, type JSX } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { getFirstAccessibleRoute, hasPermission, hasRole } from "@/lib/auth-routing";

// Layout
import DashboardLayout from "./layout/DashboardLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/students/Students";
import Groups from "./pages/groups/Groups";
import YearLimits from "./pages/year-limits/YearLimits";
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

interface ProtectedRouteProps {
  children: JSX.Element;
  permission?: string;
  allowedRoles?: string[];
}

function HomeRoute() {
  const { user, permissions } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  const homeRoute = getFirstAccessibleRoute(user, permissions);
  if (homeRoute === "/") {
    return <Dashboard />;
  }

  return <Navigate to={homeRoute} replace />;
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
    const hasAllowedRole = allowedRoles.some((role) => {
      if (user.role === role) return true;
      return hasRole(user, role);
    });
    if (hasAllowedRole) return children;
  }

  // Ruxsat tekshirish
  if (hasPermission(permissions, permission)) {
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
              element={<HomeRoute />}
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
              path="year-limits"
              element={
                <ProtectedRoute permission="groups:view">
                  <YearLimits />
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
