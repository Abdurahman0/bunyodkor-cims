import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRead } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { useLanguageStore } from "@/store/languageStore";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  UserCheck,
  Briefcase,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface UserDetailsCardProps {
  user: UserRead | null;
  onClose: () => void;
}

export const UserDetailsCard: FC<UserDetailsCardProps> = ({
  user,
  onClose,
}) => {
  const { t } = useLanguageStore();

  if (!user) return null;

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
        {t("active")}
      </Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
        {t("inactive")}
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-blue-500 mx-4 md:mx-0">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-xl font-bold">{user.full_name}</p>
              <p className="text-sm text-muted-foreground font-normal">
                {t("userDetails")}
              </p>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Asosiy ma'lumotlar */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              {t("basicInformation")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* To'liq ism */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t("fullName")}
                  </p>
                  <p className="font-medium truncate">{user.full_name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t("email")}</p>
                  <p className="font-medium truncate">{user.email}</p>
                </div>
              </div>

              {/* Telefon */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t("phone")}</p>
                  <p className="font-medium truncate">{user.phone}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <UserCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t("status")}</p>
                  <div className="mt-1">{getStatusBadge(user.status)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Xavfsizlik ma'lumotlari */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              {t("securityInformation")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Super Admin */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t("superAdmin")}
                  </p>
                  <div className="mt-1">
                    {user.is_super_admin ? (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                        {t("yes")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("no")}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* User ID */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t("userId")}</p>
                  <p className="font-medium font-mono">#{user.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rollar */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {t("roles")}
            </h3>

            {user.roles && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge
                    key={role.id}
                    variant="outline"
                    className="text-sm px-3 py-1"
                  >
                    {role.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noRole")}</p>
            )}
          </div>

          {/* Tizim ma'lumotlari */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              {t("systemInformation")}
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {/* Yaratilgan sana */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {t("createdAt")}
                  </p>
                  <p className="font-medium">
                    {format(new Date(user.created_at), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
