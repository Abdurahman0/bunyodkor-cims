import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleService } from "@/services/api.service";
import type {
  RoleWithPermissions,
  PermissionRead,
} from "@/types/api";
import type { RoleCreateRequest as RoleCreate, RoleUpdate } from "@/types/api";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";
import { translations } from "@/i18n/translations";

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleWithPermissions | null;
  onSuccess: () => void;
}

interface RoleFormData {
  name: string;
  description: string;
  permission_ids: number[];
}

const RoleDialog = ({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleDialogProps) => {
  const { t, language } = useLanguageStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoleFormData>();
  const selectedPermissionIds = watch("permission_ids") || [];

  const { data: permissionsData } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => roleService.getPermissions().then((res) => res.data),
  });

  useEffect(() => {
    if (open) {
      if (role) {
        reset({
          name: role.name,
          description: role.description,
          permission_ids: role.permissions.map((p) => p.id),
        });
      } else {
        reset({ name: "", description: "", permission_ids: [] });
      }
    }
  }, [open, role, reset]);

  const mutation = useMutation({
    mutationFn: (data: RoleFormData) => {
      const payload: RoleCreate | RoleUpdate = data;
      return role
        ? roleService.updateRole(role.id, payload)
        : roleService.createRole(payload);
    },
    onSuccess: () => {
      toast.success(
        role ? t("roleUpdatedSuccessfully") : t("roleCreatedSuccessfully")
      );
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t("anErrorOccurred"));
    },
  });

  const onSubmit = (data: RoleFormData) => mutation.mutate(data);

  const togglePermission = (id: number) => {
    const newIds = selectedPermissionIds.includes(id)
      ? selectedPermissionIds.filter((pid) => pid !== id)
      : [...selectedPermissionIds, id];
    setValue("permission_ids", newIds, { shouldValidate: true });
  };

  const getPermissionTranslation = (permission: PermissionRead) => {
    const pCode = permission.code as keyof typeof translations.en.permissionLabels;
    const translated = translations[language].permissionLabels[pCode] || translations.en.permissionLabels[pCode];
    return translated || permission.description;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{role ? t("editRole") : t("addRole")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">
              {t("roleName")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name", { required: t("roleNameIsRequired") })}
              placeholder={t("enterRoleName")}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder={t("enterDescription")}
            />
          </div>

          <div className="space-y-1">
            <Label>{t("permissions")}</Label>
            <div className="p-4 bg-muted/50 border rounded-lg max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {permissionsData?.map((permission: PermissionRead) => (
                  <div
                    key={permission.id}
                    onClick={() => togglePermission(permission.id)}
                    className="flex items-center gap-2 p-3 rounded-md cursor-pointer hover:bg-muted transition-colors border border-transparent hover:border-primary/30"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedPermissionIds.includes(permission.id)
                          ? "bg-primary border-primary"
                          : "bg-background border-muted-foreground"
                      }`}
                    >
                      {selectedPermissionIds.includes(permission.id) && (
                        <Check className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{permission.code}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getPermissionTranslation(permission)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("saving")
                : role
                ? t("saveChanges")
                : t("createRole")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleDialog;
