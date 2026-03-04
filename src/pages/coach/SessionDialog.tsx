/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  GroupRead,
  SessionCreateRequest,
  SessionUpdateRequest,
} from "@/types/api";
import { useLanguageStore } from "@/store/languageStore";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { headCoachService } from "@/services/api.service";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Keep this import
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupRead[];
  initialData?: Partial<SessionCreateRequest>;
  onSuccess: () => void;
}

const getDefaultSessionFormData = () => ({
  group_id: undefined,
  session_date: new Date().toISOString().split("T")[0],
  start_time: "09:00",
  end_time: "10:30",
  topic: "",
  description: "",
  station: "Stadion",
});

const getInitialSessionFormData = (initialData?: Partial<SessionCreateRequest>) => {
  const defaults = getDefaultSessionFormData();
  if (!initialData) {
    return defaults;
  }

  return {
    ...defaults,
    ...initialData,
    station:
      (initialData as any).station ||
      (initialData as any).location ||
      defaults.station,
  };
};

export function SessionDialog({
  open,
  onOpenChange,
  groups,
  initialData,
  onSuccess,
}: SessionDialogProps) {
  const { t } = useLanguageStore();
  const [formData, setFormData] = useState<
    Partial<SessionCreateRequest> & { station?: string; description?: string }
  >(getInitialSessionFormData(initialData));

  const dialogDataKey = `${(initialData as any)?.id ?? "new"}-${
    initialData?.session_date || ""
  }-${initialData?.start_time || ""}`;

  const createSessionMutation = useMutation({
    mutationFn: (data: SessionCreateRequest) =>
      headCoachService.createSession(data),
    onSuccess: () => {
      toast.success(t("sessionCreatedSuccess"));
      onSuccess();
      setFormData(getDefaultSessionFormData());
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t("failedToCreateSession"));
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: (data: { id: number; data: SessionUpdateRequest }) =>
      headCoachService.updateSession(data.id, data.data),
    onSuccess: () => {
      toast.success(t("sessionUpdatedSuccess"));
      onSuccess();
      setFormData(getDefaultSessionFormData());
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t("failedToUpdateSession"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation for required fields
    if (
      !formData.group_id ||
      !formData.session_date ||
      !formData.start_time ||
      !formData.end_time ||
      !formData.topic
    ) {
      toast.error(t("fillAllRequiredFields"));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

    const sessionDate = new Date(formData.session_date);
    sessionDate.setHours(0, 0, 0, 0); // Normalize session date to midnight

    const editId = (initialData as any)?.id;

    // Prevent creating new sessions for past dates
    if (!editId && sessionDate < today) {
      toast.error(t("cannotCreateSessionForPastDate"));
      return;
    }

    const payload: SessionCreateRequest = {
      group_id: Number(formData.group_id),
      session_date: formData.session_date!,
      start_time: formData.start_time!,
      end_time: formData.end_time!,
      topic: formData.topic!,
      description: formData.description || "",
      station: formData.station || "Stadion",
    };

    if (editId) {
      updateSessionMutation.mutate({ id: editId, data: payload });
    } else {
      createSessionMutation.mutate(payload);
    }
  };
  const isPending =
    createSessionMutation.isPending || updateSessionMutation.isPending;
  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setFormData(getDefaultSessionFormData());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        key={dialogDataKey}
        className="sm:max-w-[425px] px-6 sm:px-6"
      >
        <DialogHeader>
          <DialogTitle>
            {(initialData as any)?.id
              ? t("editSession")
              : t("createNewSession")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group">{t("group")}</Label>
            <Select
              id="group"
              value={formData.group_id?.toString() || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  group_id: Number(e.target.value) || undefined,
                })
              }
            >
              <option value="">{t("selectGroup")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">{t("date")}</Label>
              <Input
                id="date"
                type="date"
                value={formData.session_date}
                onChange={(e) =>
                  setFormData({ ...formData, session_date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t("location")}</Label>
              <Input
                id="location"
                placeholder={t("locationPlaceholder")}
                value={formData.station}
                onChange={(e) =>
                  setFormData({ ...formData, station: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">{t("startTime")}</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">{t("endTime")}</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">{t("topic")}</Label>
            <Input
              id="topic"
              placeholder={t("sessionTopicPlaceholder")}
              value={formData.topic}
              onChange={(e) =>
                setFormData({ ...formData, topic: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("additionalNotes")}</Label>
            <Textarea
              id="description"
              placeholder={t("sessionDescriptionPlaceholder")}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
