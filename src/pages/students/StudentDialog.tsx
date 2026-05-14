import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import toast from "react-hot-toast";
import { studentService, groupService } from "@/services/api.service";
import type {
  StudentRead,
  StudentCreateRequest as StudentCreate,
  StudentUpdateRequest as StudentUpdate,
  GroupRead,
} from "@/types/api";
import { format } from "date-fns";
import { useLanguageStore } from "@/store/languageStore";
import { formatGroupSelectLabel } from "@/lib/name-utils";

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRead | null;
  onSuccess?: () => void;
}

type StudentFormData = Omit<StudentCreate, "group_id"> & {
  group_id: number | string;
};

export function StudentDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: StudentDialogProps) {
  const queryClient = useQueryClient();
  const { t } = useLanguageStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>();

  const { data: groupsData } = useQuery({
    queryKey: ["groups-list"],
    queryFn: () => groupService.getGroups({ page: 1, page_size: 2000 }),
    enabled: open,
  });

  // Get student count for each group to check capacity
  const { data: allStudentsData } = useQuery({
    queryKey: ["all-students-for-capacity"],
    queryFn: () => studentService.getStudents({ page: 1, page_size: 2000 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (student) {
        reset({
          ...student,
          date_of_birth: student.date_of_birth
            ? format(new Date(student.date_of_birth), "yyyy-MM-dd")
            : "",
          group_id: student.group_id || "",
        });
      } else {
        reset({
          first_name: "",
          last_name: "",
          date_of_birth: "",
          phone: "",
          address: "",
          status: "active",
          group_id: "",
        });
      }
    }
  }, [student, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: StudentCreate | StudentUpdate) => {
      if (student) {
        return studentService.updateStudent(student.id, data);
      } else {
        return studentService.createStudent(data as StudentCreate);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-count"] });
      toast.success(
        student ? t("studentUpdatedSuccess") : t("studentCreatedSuccess"),
      );
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = "An error occurred";

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  // Helper function to get student count in a group
  const getGroupStudentCount = (groupId: number): number => {
    if (!allStudentsData?.data) return 0;
    return allStudentsData.data.filter(
      (s) => Number(s.group_id) === Number(groupId),
    ).length;
  };

  // Helper function to check if group is full
  const isGroupFull = (groupId: number): boolean => {
    const group = groupsData?.data?.find((g) => g.id === groupId);
    if (!group) return false;
    const studentCount = getGroupStudentCount(groupId);
    return studentCount >= group.capacity;
  };

  const onSubmit = (data: StudentFormData) => {
    // Check if we're adding a student to a new group (not editing existing student)
    const selectedGroupId =
      data.group_id === "" ||
      data.group_id === null ||
      data.group_id === undefined
        ? null
        : Number(data.group_id);

    if (selectedGroupId && (!student || student.group_id !== selectedGroupId)) {
      // Check if the selected group is full
      if (isGroupFull(selectedGroupId)) {
        const group = groupsData?.data?.find((g) => g.id === selectedGroupId);
        toast.error(
          `${group?.name || "Guruh"} to'lgan! Iltimos, boshqa guruh tanlang.`,
          { duration: 4000 },
        );
        return;
      }
    }
    const payload = {
      ...data,
      group_id:
        data.group_id === "" ||
        data.group_id === null ||
        data.group_id === undefined
          ? null
          : Number(data.group_id),
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      closeOnOverlayClick={!!student}
    >
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {student ? t("editStudent") : t("addNewStudent")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="first_name">
                {t("firstName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                {...register("first_name", {
                  required: t("firstNameRequired"),
                })}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">
                {t("lastName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                {...register("last_name", { required: t("lastNameRequired") })}
              />
              {errors.last_name && (
                <p className="text-sm text-red-500">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="date_of_birth">
              {t("dateOfBirth")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              {...register("date_of_birth", {
                required: t("dateOfBirthRequired"),
              })}
            />
            {errors.date_of_birth && (
              <p className="text-sm text-red-500">
                {errors.date_of_birth.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">
              {t("phoneNumber")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              placeholder="+998901234567"
              {...register("phone", { required: t("phoneIsRequired") })}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">{t("address")}</Label>
            <Input id="address" {...register("address")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="status">
                {t("status")} <span className="text-red-500">*</span>
              </Label>
              <Select id="status" {...register("status", { required: true })}>
                <option value="active">{t("active")}</option>
                <option value="archived">{t("archived")}</option>
                <option value="deleted">{t("deleted")}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="group_id">{t("group")}</Label>
              {student ? (
                <>
                  {/* When editing an existing student, group must not be editable.
                      The original Select control is preserved below as a commented block.
                      Do not delete the commented code so it can be restored if needed. */}
                  <Input
                    id="group_id"
                    value={
                      groupsData?.data?.find((g) => g.id === student.group_id)
                        ?.name || ""
                    }
                    disabled
                  />

                  {/*
                  <Select id="group_id" {...register('group_id')}>
                    <option value="">{t('selectGroup')}</option>
                    {groupsData?.data?.map((group: GroupRead) => {
                      const studentCount = getGroupStudentCount(group.id)
                      const isFull = studentCount >= group.capacity
                      return (
                        <option key={group.id} value={group.id} disabled={isFull && (!student || student.group_id !== group.id)}>
                          {group.name} ({studentCount}/{group.capacity}){isFull ? ' - To'liq' : ''}
                        </option>
                      )
                    })}
                  </Select>
                  */}
                </>
              ) : (
                <Select id="group_id" {...register("group_id")}>
                  <option value="">{t("selectGroup")}</option>
                  {groupsData?.data?.map((group: GroupRead) => {
                    const studentCount = getGroupStudentCount(group.id);
                    const isFull = studentCount >= group.capacity;
                    return (
                      <option
                        key={group.id}
                        value={String(group.id)}
                        disabled={isFull}
                      >
                        {formatGroupSelectLabel(group)} ({studentCount}/{group.capacity})
                        {isFull ? " - To'liq" : ""}
                      </option>
                    );
                  })}
                </Select>
              )}
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
              {mutation.isPending ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
