
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useLanguageStore } from "@/store/languageStore";

interface GroupDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: GroupRead | null
}

export const GroupDetailsDialog: FC<GroupDetailsDialogProps> = ({ open, onOpenChange, group }) => {
  const { t } = useLanguageStore();
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['group-students', group?.id],
    queryFn: () => group && groupService.getGroupStudents(group.id).then(res => res.data),
    enabled: !!group && open,
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      active: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
      inactive: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-400" },
      graduated: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
    };
    const variant = variants[status] || variants.active;
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0`}>
        {t(status) || status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]" onClose={() => onOpenChange(false)}>
            <DialogHeader>
                <DialogTitle>
                  {group?.name} - {t("students") || "Students"} ({studentsData?.length || 0})
                </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : studentsData && studentsData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>{t("student") || "Student"}</TableHead>
                          <TableHead>{t("phone") || "Phone"}</TableHead>
                          <TableHead className="hidden sm:table-cell">{t("birthYear") || "Birth Year"}</TableHead>
                          <TableHead className="hidden md:table-cell">{t("address") || "Address"}</TableHead>
                          <TableHead>{t("status") || "Status"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsData.map((student: any) => (
                          <TableRow key={student.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={student.photo_url || ''} />
                                  <AvatarFallback>{student.first_name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{student.first_name} {student.last_name}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{student.phone || '-'}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">
                              {student.date_of_birth ? format(new Date(student.date_of_birth), "yyyy") : '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {student.address ? (student.address.length > 30 ? student.address.substring(0, 30) + '...' : student.address) : '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(student.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <User className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">{t("noStudentsFound") || "No Students Found"}</h3>
                    <p className="text-muted-foreground">{t("noStudentsInGroup") || "There are no students enrolled in this group yet."}</p>
                </div>
              )}
            </div>
        </DialogContent>
    </Dialog>
  )
};
