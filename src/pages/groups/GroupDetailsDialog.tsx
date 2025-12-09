
import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GroupRead } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { groupService } from "@/services/api.service";
import { Loader2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GroupDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: GroupRead | null
}

export const GroupDetailsDialog: FC<GroupDetailsDialogProps> = ({ open, onOpenChange, group }) => {
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['group-students', group?.id],
    queryFn: () => group && groupService.getGroupStudents(group.id).then(res => res.data),
    enabled: !!group && open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={() => onOpenChange(false)}>
            <DialogHeader>
                <DialogTitle>{group?.name}</DialogTitle>
            </DialogHeader>
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : studentsData && studentsData.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {studentsData.map((student: any) => (
                    <div key={student.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={student.photo_url || ''} />
                            <AvatarFallback>{student.first_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      <div>
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-muted-foreground">{student.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <User className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No Students Found</h3>
                    <p className="text-muted-foreground">There are no students enrolled in this group yet.</p>
                </div>
              )}
            </div>
        </DialogContent>
    </Dialog>
  )
};
