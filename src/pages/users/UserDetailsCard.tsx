/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FC, ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { UserRead, UserStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { useLanguageStore } from "@/store/languageStore";
import { formatFullName } from "@/lib/name-utils";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  UserCheck,
  Briefcase,
  X,
  Hash,
  KeyRound,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"; // Agar separator yo'q bo'lsa, shunchaki <hr /> ishlating yoki o'rnating

interface UserDetailsCardProps {
  user: UserRead | null;
  onClose: () => void;
}

// Yordamchi komponent: Kodni toza saqlash uchun
const InfoItem = ({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: any;
  label: string;
  value?: string | number | ReactNode;
  badge?: ReactNode;
}) => (
  <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border shadow-sm text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex flex-col flex-1 overflow-hidden">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold truncate text-sm md:text-base text-foreground">
          {value || "—"}
        </span>
        {badge && <div>{badge}</div>}
      </div>
    </div>
  </div>
);

export const UserDetailsCard: FC<UserDetailsCardProps> = ({
  user,
  onClose,
}) => {
  const { t } = useLanguageStore();

  if (!user) return null;

  const getStatusBadge = (status: UserStatus) => {
    const styles: Record<string, string> = {
      active:
        "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-800",
      inactive:
        "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20 border-gray-200 dark:border-gray-800",
      suspended:
        "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200 dark:border-yellow-800",
      deleted:
        "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200 dark:border-red-800",
    };

    const style = styles[status] || styles.inactive;

    return (
      <Badge
        variant="outline"
        className={style}
      >
        {t(status as any)}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl border-border/60 backdrop-blur-sm relative overflow-hidden">
      {/* Orqa fon bezagi uchun dekoratsiya */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg ring-4 ring-background">
                {user.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="absolute -bottom-1 -right-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 border-background ${
                    user.status === "active" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {formatFullName(user.full_name)}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                  #{user.id}
                </span>
                <span>{t("userDetails")}</span>
              </CardDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-6 space-y-8 h-[70vh] md:h-auto overflow-y-auto">
        {/* Asosiy ma'lumotlar */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <User className="w-4 h-4" /> {t("basicInformation")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={User}
              label={t("fullName")}
              value={formatFullName(user.full_name)}
            />
            <InfoItem icon={Mail} label={t("email")} value={user.email} />
            <InfoItem icon={Phone} label={t("phone")} value={user.phone} />
            <InfoItem
              icon={UserCheck}
              label={t("status")}
              value={t(user.status as any)}
              badge={getStatusBadge(user.status)}
            />
          </div>
        </div>

        <Separator className="bg-border/60" />

        {/* Xavfsizlik va Tizim */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Shield className="w-4 h-4" /> {t("securityAndSystem")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={Shield}
              label={t("role")}
              value={
                user.roles && user.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge
                        key={role.id}
                        variant="secondary"
                        className="px-2 py-0 text-xs"
                      >
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic text-sm">
                    {t("noRole")}
                  </span>
                )
              }
            />
            <InfoItem
              icon={KeyRound}
              label={t("superAdmin")}
              value={user.is_super_admin ? t("yes") : t("no")}
              badge={
                user.is_super_admin && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20 border-0 px-2">
                    {t("admin")}
                  </Badge>
                )
              }
            />
            <InfoItem
              icon={Hash}
              label={t("userId")}
              value={`ID: ${user.id}`}
            />
            <InfoItem
              icon={Calendar}
              label={t("createdAt")}
              value={format(new Date(user.created_at), "dd MMM yyyy, HH:mm")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
