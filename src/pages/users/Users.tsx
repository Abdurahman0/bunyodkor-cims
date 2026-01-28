import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Trash2,
  Edit,
  UserCircle,
  Shield,
  Filter,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableEmpty,
} from "@/components/ui/table";
import { userService, roleService } from "@/services/api.service";
import type { UserRead, RoleRead, RoleWithPermissions } from "@/types/api";
import toast from "react-hot-toast";
import UserDialog from "./UserDialog";
import { UserDetailsCard } from "./UserDetailsCard";
import { useLanguageStore } from "@/store/languageStore";
import { useDebounce } from "@/hooks/useDebounce";

const Users = () => {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [roleId, setRoleId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRead | null>(null);
  const [selectedUserForCard, setSelectedUserForCard] = useState<UserRead | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, roleId]);

  // Fetch roles for filter
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.getRoles({}).then((res) => res.data),
  });

  // Fetch users
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users", page, debouncedSearch, status, roleId],
    queryFn: () => {
      const params = {
        page,
        page_size: 10,
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
        role_id: roleId === "all" ? undefined : parseInt(roleId, 10),
      };
      return userService.getUsers(params);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => {
      toast.success(t("userDeletedSuccessfully"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("failedToDeleteUser"));
    },
  });

  const handleEdit = (user: UserRead) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = (user: UserRead) => {
    if (user.is_super_admin) {
      toast.error(t("cannotDeleteSuperAdmin"));
      return;
    }

    if (confirm(`${t("areYouSureDeleteUser")} ${user.full_name}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleViewDetails = (user: UserRead) => {
    setSelectedUserForCard(user);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setRoleId("all");
  };

  const hasActiveFilters = search || status !== "all" || roleId !== "all";

  const getStatusBadge = (userStatus: string) => {
    return userStatus === "active" ? (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
        {t("active")}
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-0">
        {t("inactive")}
      </Badge>
    );
  };

  // Stats
  const stats = {
    total: data?.meta?.total || 0,
    active: data?.data?.filter((u) => u.status === "active").length || 0,
    admins: data?.data?.filter((u) => u.is_super_admin).length || 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t("userManagement")}
            </h1>
            <p className="text-muted-foreground">
              {t("viewCreateManageUsers")}
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setSelectedUser(null);
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("addUser")}
        </Button>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalUsers")}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("activeUsers")}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("superAdmins")}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.admins}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchByNameEmailPhone")}
                  placeholder={t("searchByName")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">{t("allStatuses")}</option>
                <option value="active">{t("active")}</option>
                <option value="inactive">{t("inactive")}</option>
              </Select>

              {/* Role Filter */}
              <div className="flex gap-2">
                <Select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="flex-1"
                >
                  <option value="all">{t("allRoles")}</option>
                  {rolesData?.map((role: RoleWithPermissions) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    title={t("clearFilters")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>{t("activeFilters")}</span>
                {search && (
                  <Badge variant="secondary">
                    {t("search")}: {search}
                  </Badge>
                )}
                {status !== "all" && (
                  <Badge variant="secondary">
                    {t("status")}: {status}
                  </Badge>
                )}
                {roleId !== "all" && (
                  <Badge variant="secondary">
                    {t("role")}:{" "}
                    {rolesData?.find((r) => r.id === parseInt(roleId))?.name}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">{t("allUsers")}</CardTitle>
          </CardHeader>
          <Table isLoading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("user")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("contact")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("role")}
                </TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right [&>div]:justify-end">
                  {t("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((user: UserRead) => (
                  <TableRow
                    key={user.id}
                    onClick={() => handleViewDetails(user)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {user.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">
                              {user.full_name}
                            </p>
                            {user.is_super_admin && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs gap-1">
                                <Shield className="w-3 h-3" />
                                {t("admin")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground md:hidden truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {user.phone}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      {user.roles && user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role: RoleRead) => (
                            <Badge key={role.id} variant="outline">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t("noRole")}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>{getStatusBadge(user.status)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(user);
                          }}
                          className="h-8 w-8 p-0"
                          title={t("editUser")}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(user);
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title={t("deleteUser")}
                          disabled={user.is_super_admin}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty
                  icon={<UserCircle className="w-12 h-12" />}
                  title={t("noUsersFound")}
                  description={
                    hasActiveFilters
                      ? t("tryAdjustingFilters")
                      : t("getStartedByAddingUser")
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        {t("clearFilters")}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedUser(null);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("addUser")}
                      </Button>
                    )
                  }
                />
              )}
            </TableBody>
          </Table>
          {data?.meta && data.meta.total_pages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={data.meta.total_pages}
              totalItems={data.meta.total}
              pageSize={10}
              onPageChange={setPage}
            />
          )}
        </Card>
      </motion.div>

      {/* User Dialog */}
      <UserDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={selectedUser}
        onSuccess={() => {
          refetch();
          handleDialogClose();
        }}
      />

      {/* User Details Card - Modal Overlay */}
      {selectedUserForCard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedUserForCard(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ delay: 0.1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <UserDetailsCard
              user={selectedUserForCard}
              onClose={() => setSelectedUserForCard(null)}
            />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Users;
