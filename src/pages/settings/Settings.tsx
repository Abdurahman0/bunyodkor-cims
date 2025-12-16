/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { settingsService } from "@/services/api.service";
import { useThemeStore } from "@/store/themeStore";
import {
  Settings as SettingsIcon,
  Save,
  Bell,
  CreditCard,
  Globe,
  Moon,
  Sun,
  Loader2,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguageStore } from "@/store/languageStore";

export default function Settings() {
  const { t } = useLanguageStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const queryClient = useQueryClient();
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>(
    {}
  );
  const [localSettings, setLocalSettings] = useState<Record<string, string>>(
    {}
  );

  const { data: settingsData } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => settingsService.getSystemSettings(),
  });

  useEffect(() => {
    if (settingsData?.data) {
      const initialSettings = settingsData.data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalSettings(initialSettings);
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      settingsService.updateSystemSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success(t("settingsUpdated"));
      setEditedSettings({});
    },
    onError: () => {
      toast.error(t("failedToUpdateSettings"));
    },
  });

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    if (Object.keys(editedSettings).length > 0) {
      updateMutation.mutate(editedSettings);
    }
  };

  const getSettingValue = (key: string) => {
    return localSettings[key] || "";
  };

  const hasChanges = Object.keys(editedSettings).length > 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("manageSystemConfiguration")}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{t("appearance")}</CardTitle>
                <CardDescription>{t("customizeAppearance")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-muted/20">
              <div>
                <p className="font-medium text-foreground">{t("darkMode")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("switchDarkMode")}
                </p>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
