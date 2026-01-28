import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Shield,
  Plus,
  Search,
  Trash2,
  Edit,
  Users as UsersIcon,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { roleService, userService } from "@/services/api.service";
import type { RoleWithPermissions } from "@/types/api";
import toast from "react-hot-toast";
import RoleDialog from "./RoleDialog";
import { useLanguageStore } from "@/store/languageStore";
import { useDebounce } from "@/hooks/useDebounce";

const Roles = () => {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(
    null
  );

  const debouncedSearch = useDebounce(search, 500);

  // Fetch roles
  const { data: allRolesData, isLoading, refetch } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.getRoles({}),
  });

  // Client-side filtering and pagination for roles
  const { rolesList, rolesMeta } = useMemo(() => {
    if (!allRolesData?.data) return { rolesList: [], rolesMeta: { total: 0, total_pages: 0 } };

    let filtered = allRolesData.data;

    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter(role => 
        role.name.toLowerCase().includes(lowerSearch) || 
        (role.description && role.description.toLowerCase().includes(lowerSearch))
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / 10);
    const paginated = filtered.slice((page - 1) * 10, page * 10);

    return {
      rolesList: paginated,
      rolesMeta: {
        total,
        total_pages: totalPages
      }
    };
  }, [allRolesData, debouncedSearch, page]);

  // Fetch all users to compute stats
  const { data: usersData } = useQuery({
    queryKey: ["all-users-for-stats"],
    queryFn: () => userService.getUsers({ page: 1, page_size: 100 }), // Just need some data to check structure, or rely on backend count if available
  });

  // Compute stats
  const usersWithRolesCount =
    usersData?.data?.filter((user) => user.role_id !== null && user.role_id !== undefined).length || 0;
  const totalPermissionsCount =
    allRolesData?.data?.reduce((acc, role) => acc + role.permissions.length, 0) || 0;

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedRole(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => roleService.deleteRole(id),
    onSuccess: () => {
      toast.success(t("roleDeletedSuccessfully"));
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("failedToDeleteRole"));
    },
  });

  const handleEdit = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setIsDialogOpen(true);
  };

  const handleDelete = (role: RoleWithPermissions) => {
    if (confirm(`${t("areYouSureDeleteRole")} ${role.name}?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {t("roles")}
              </h1>
              <p className="text-muted-foreground">
                {t("manageRolesAndPermissions")}
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              setSelectedRole(null);
              setIsDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("addRole")}
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
                    {t("totalRoles")}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {rolesMeta.total}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("usersWithRoles")}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {usersWithRolesCount}
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
                    {t("totalPermissions")}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {totalPermissionsCount}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t("allRoles")}</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchByName")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <Table isLoading={isLoading}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("permissions")}</TableHead>
                  <TableHead className="text-right [&>div]:justify-end">
                    {t("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesList && rolesList.length > 0 ? (
                  rolesList.map((role: RoleWithPermissions) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {role.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {role.permissions.length} {t("permissions")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(role)}
                            className="h-8 w-8 p-0"
                            title={t("editRole")}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(role)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t("deleteRole")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty
                    icon={<Shield className="w-12 h-12" />}
                    title={t("noRolesFound")}
                    description={t("getStartedByAddingRole")}
                    action={
                      <Button
                        onClick={() => {
                          setSelectedRole(null);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("addRole")}
                      </Button>
                    }
                  />
                )}
              </TableBody>
            </Table>
            {rolesMeta.total_pages > 1 && (
              <TablePagination
                currentPage={page}
                totalPages={rolesMeta.total_pages}
                totalItems={rolesMeta.total}
                pageSize={10}
                onPageChange={setPage}
              />
            )}
          </Card>
        </motion.div>
      </motion.div>

      <RoleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        role={selectedRole}
        onSuccess={() => {
          refetch();
          handleDialogClose();
        }}
      />
    </>
  );
};

export default Roles;
