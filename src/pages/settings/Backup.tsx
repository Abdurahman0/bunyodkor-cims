import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { backupService } from "@/services/api.service";
import { useLanguageStore } from "@/store/languageStore";

export function BackupSection() {
  const { t } = useLanguageStore();
  const {
    data: backupStatus,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["backup-status"],
    queryFn: () => backupService.getBackupStatus(),
  });

  const backupMutation = useMutation({
    mutationFn: () => backupService.triggerManualBackup(),
    onSuccess: () => {
      toast.success(t("backupCreatedSuccess" as any) || "Backup created successfully!");
      refetch();
    },
    onError: () => {
      toast.error(t("backupCreatedError" as any) || "Error creating backup!");
    },
  });

  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {t("databaseBackup" as any) || "Database Backup"}
            </CardTitle>
            <CardDescription>
              {t("manualBackupDescription" as any) || "Manual backup of system data and view status"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
          <div>
            <p className="font-medium text-foreground">{t("automaticBackup" as any) || "Automatic Backup"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{t("statusLabel" as any) || "Status:"}</span>
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t("statusActive" as any) || "Active"}
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            className="gap-2"
          >
            {backupMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t("manualBackup" as any) || "Manual Backup"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-100 dark:border-blue-900">
          {t("backupNote" as any) || "Note: Backups are automatically saved on the server. Manual backup process may take a few seconds."}
        </div>
      </CardContent>
    </Card>
  );
}
