import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { headCoachService } from "@/services/api.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import type { GroupRead, SessionCreateRequest } from "@/types/api";

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupRead[];
  initialData?: Partial<SessionCreateRequest>;
  onSuccess: () => void;
}





export function SessionDialog({
  open,
  onOpenChange,
  groups,
  initialData,
  onSuccess,
}: SessionDialogProps) {
  const [formData, setFormData] = useState<Partial<SessionCreateRequest>>({
    group_id: 0,
    session_date: "",
    start_time: "",
    end_time: "",
    topic: "",
    description: "",
    location: "Stadion", // Default location
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...initialData,
          location: initialData.location || "Stadion",
        });
      } else {
        setFormData({
          group_id: groups.length > 0 ? groups[0].id : 0,
          session_date: new Date().toISOString().split("T")[0],
          start_time: "09:00",
          end_time: "10:30",
          topic: "",
          description: "",
          location: "Stadion",
        });
      }
    }
  }, [open, initialData, groups]);

  const createSessionMutation = useMutation({
    mutationFn: (data: SessionCreateRequest) =>
      headCoachService.createSession(data),
    onSuccess: () => {
      toast.success("Mashg'ulot muvaffaqiyatli yaratildi");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || "Mashg'ulot yaratishda xatolik"
      );
    },
  });




  const updateSessionMutation = useMutation({
    mutationFn: (data: { id: number; data: SessionCreateRequest }) =>
      headCoachService.updateSession(data.id, data.data),
    onSuccess: () => {
      toast.success("Mashg'ulot muvaffaqiyatli yangilandi");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || "Mashg'ulotni yangilashda xatolik"
      );
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
        toast.error("Iltimos, barcha majburiy maydonlarni to'ldiring");
        return;
      }
  
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to midnight
  
      const sessionDate = new Date(formData.session_date);
      sessionDate.setHours(0, 0, 0, 0); // Normalize session date to midnight
  
      const editId = (initialData as any)?.id;
  
      // Prevent creating new sessions for past dates
      if (!editId && sessionDate < today) {
        toast.error("O'tib ketgan sana uchun mashg'ulot yaratib bo'lmaydi.");
        return;
      }
  
      const payload: SessionCreateRequest = {
        group_id: Number(formData.group_id),
        session_date: formData.session_date!,
        start_time: formData.start_time!,
        end_time: formData.end_time!,
        topic: formData.topic!,
        description: formData.description || "",
        location: formData.location || "Stadion",
      };
  
      if (editId) {
        updateSessionMutation.mutate({ id: editId, data: payload });
      } else {
        createSessionMutation.mutate(payload);
      }
    };
  const isPending =
    createSessionMutation.isPending || updateSessionMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] px-6 sm:px-6">
        <DialogHeader>
          <DialogTitle>
            {(initialData as any)?.id
              ? "Mashg'ulotni Tahrirlash"
              : "Yangi Mashg'ulot"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group">Guruh</Label>
            <Select
              id="group"
              value={formData.group_id?.toString()}
              onChange={(e) =>
                setFormData({ ...formData, group_id: Number(e.target.value) })
              }
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Sana</Label>
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
              <Label htmlFor="location">Joy (Stadion)</Label>
              <Input
                id="location"
                placeholder="Masalan: Bunyodkor stadioni"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Boshlanish</Label>
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
              <Label htmlFor="end_time">Tugash</Label>
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
            <Label htmlFor="topic">Mavzu</Label>
            <Input
              id="topic"
              placeholder="Mashg'ulot mavzusi"
              value={formData.topic}
              onChange={(e) =>
                setFormData({ ...formData, topic: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Qo'shimcha Izoh</Label>
            <Textarea
              id="description"
              placeholder="Mashg'ulot haqida batafsil..."
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
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}