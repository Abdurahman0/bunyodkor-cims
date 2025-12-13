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

export function BackupSection() {
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
      toast.success("Zaxira nusxasi muvaffaqiyatli yaratildi!");
      refetch();
    },
    onError: () => {
      toast.error("Zaxira nusxasini yaratishda xatolik!");
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
              Ma'lumotlar Bazasi Zaxirasi (Backup)
            </CardTitle>
            <CardDescription>
              Tizim ma'lumotlarini qo'lda zaxiralash va holatini ko'rish
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
          <div>
            <p className="font-medium text-foreground">Avtomatik Backup</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Holati:</span>
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Faol
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
            Qo'lda Zaxiralash
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-100 dark:border-blue-900">
          <span className="font-semibold">Eslatma:</span> Zaxira nusxalari
          serverda avtomatik saqlanadi. Qo'lda zaxiralash jarayoni bir necha
          soniya vaqt olishi mumkin.
        </div>
      </CardContent>
    </Card>
  );
}
