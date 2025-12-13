import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useLanguageStore } from "@/store/languageStore";
import {
  Users,
  CreditCard,
  Home,
  GraduationCap,
  BarChart3,
  UserCog,
  Menu,
  X,
  Moon,
  Sun,
  Settings,
  FileText,
  Shield,
  ChevronDown,
  DoorOpen,
  Languages,
  Bell,
  AlertCircle,
  Info,
  Clock,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const DashboardLayout = () => {
  const { token, user, permissions, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { isOpen, toggle, close } = useSidebarStore();
  const { language, setLanguage, t } = useLanguageStore();
  const location = useLocation();

  // Hover holatini boshqarish uchun state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    close();
  }, [location.pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [close]);

  if (!token) {
    return <Navigate to="/login" />;
  }

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    {
      path: "/",
      label: t("dashboard"),
      icon: Home,
      permission: "dashboard:view",
    },
    {
      path: "/students",
      label: t("students"),
      icon: Users,
      permission: "students:view",
    },
    {
      path: "/groups",
      label: t("groups"),
      icon: GraduationCap,
      permission: "groups:view",
    },
    {
      path: "/contracts",
      label: t("contracts"),
      icon: FileText,
      permission: "contracts:view",
    },
    {
      path: "/finance",
      label: t("finance"),
      icon: CreditCard,
      permission: "finance:transactions:view",
    },
    {
      path: "/coach",
      label: t("coachPanel"),
      icon: Shield,
      permission: "attendance:coach:mark",
    },
    {
      path: "/gate",
      label: t("gateLogs"),
      icon: DoorOpen,
      permission: "gate:logs:view",
    },
    {
      path: "/waiting-list",
      label: t("waitingList"),
      icon: Clock,
      permission: "students:view",
    },
    {
      path: "/reports",
      label: t("reports"),
      icon: BarChart3,
      permission: "reports:dashboard:view",
    },
    {
      path: "/users",
      label: t("users"),
      icon: UserCog,
      permission: "users:manage",
    },
    {
      path: "/roles",
      label: t("roles"),
      icon: Shield,
      permission: "roles:view",
    },
    {
      path: "/settings",
      label: t("settings"),
      icon: Settings,
      permission: "settings:system:view",
    },
  ];

  const hasPermission = (permission: string | null) => {
    if (!permission) return true;
    if (user?.is_super_admin) return true;
    if (permissions.includes("*")) return true;

    if (permissions.includes(permission)) return true;

    const parts = permission.split(":");
    for (let i = 1; i < parts.length; i++) {
      const wildcard = parts.slice(0, i).join(":") + ":*";
      if (permissions.includes(wildcard)) return true;
    }

    return false;
  };

  const filteredMenuItems = menuItems.filter((item) =>
    hasPermission(item.permission)
  );

  const getPageNotifications = () => {
    const path = location.pathname;
    const notifications = [];

    if (path === "/") {
      notifications.push({
        type: "info",
        message: t("welcomeToDashboard") || "Welcome to Dashboard",
      });
    } else if (path === "/students") {
      notifications.push({
        type: "info",
        message: t("manageStudentsHere") || "Manage students here",
      });
    }

    return notifications;
  };

  const pageNotifications = getPageNotifications();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/50 z-[9980] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-[9985] w-72 flex flex-col",
          "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800",
          "dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
          "shadow-2xl lg:shadow-xl",
          "lg:translate-x-0",
          {
            "sidebar-closed": !isOpen,
          }
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Bunyodkor Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Bunyodkor
              </h1>
              <p className="text-xs text-slate-400 font-medium">Academy</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn("w-5 h-5", isActive && "animate-pulse")}
                  />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-2 h-2 rounded-full bg-white"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}

          {pageNotifications.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="px-2 mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                <Bell className="w-3.5 h-3.5" />
                <span>{t("pageInfo") || "Page Info"}</span>
              </div>
              {pageNotifications.map((notif, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 mb-2 rounded-lg bg-blue-900/30 border border-blue-700/50"
                >
                  <div className="flex items-start gap-2">
                    {notif.type === "info" && (
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    )}
                    {notif.type === "warning" && (
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 space-y-3">
          <Button
            variant="ghost"
            onClick={toggleDarkMode}
            className="w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800/60"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-5 h-5" />
                <span className="font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                <span className="font-medium">Dark Mode</span>
              </>
            )}
          </Button>

          <div className="px-4 py-3 bg-slate-800/60 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            {user?.is_super_admin && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">Super Admin</span>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-card/50 backdrop-blur-sm z-50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-foreground">
                {filteredMenuItems.find(
                  (item) => item.path === location.pathname
                )?.label || "Dashboard"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="hidden sm:flex"
              >
                <Languages className="w-5 h-5" />
              </Button>

              <AnimatePresence>
                {isLangOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[9990]"
                      onClick={() => setIsLangOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-card shadow-xl z-[9991]"
                    >
                      <div className="p-2">
                        {[
                          { code: "en", label: "English", flag: "🇬🇧" },
                          { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
                          { code: "ru", label: "Русский", flag: "🇷🇺" },
                        ].map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              setLanguage(lang.code as any);
                              setIsLangOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                              language === lang.code
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="hidden lg:flex"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {/* Profile Dropdown - HOVER VERSION */}
            <div
              className="relative h-full flex items-center"
              onMouseEnter={() => setIsProfileOpen(true)}
              onMouseLeave={() => setIsProfileOpen(false)}
            >
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                // onClick olib tashlandi, chunki endi Hover ishlatiladi
              >
                <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                  {user?.full_name}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-12 right-0 w-64 rounded-xl border border-border bg-card shadow-xl z-[9993]"
                  >
                    {/* INVISIBLE BRIDGE - Sichqoncha uzilmasligi uchun */}
                    <div className="absolute -top-4 left-0 w-full h-4 bg-transparent"></div>

                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {user?.full_name?.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-foreground truncate">
                            {user?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md mb-2"
                        >
                          <UserCog className="w-4 h-4" /> Sozlamalar
                        </Link>

                        {/* YANGILANGAN LOGOUT BUTTON */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Chiqish
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-muted/30 dark:bg-muted/10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 lg:p-8 max-w-[1600px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
