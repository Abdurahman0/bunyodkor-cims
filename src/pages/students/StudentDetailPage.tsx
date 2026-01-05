import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService, contractService } from "@/services/api.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Home,
  Calendar,
  Clock,
  Phone,
  FileText,
  User,
  Users,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { openPdfResponse, openPdfUrl } from "@/lib/open-pdf";
import { useLanguageStore } from "@/store/languageStore";
import type {
  StudentFullInfo,
  TransactionRead,
  ContractRead,
  AttendanceRead,
  ParentRead,
} from "@/types/api";

const getStatusBadge = (status: string) => {
  const styles: { [key: string]: string } = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    graduated: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    dropped: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    absent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    suspended: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    late: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return (
    <Badge
      className={`${styles[status] || "bg-gray-100 text-gray-700"} border-0`}
    >
      {status}
    </Badge>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatSource = (source: any) => {
  const cleanSource =
    source?.toString().replace(/^.*\./, "").toLowerCase() || "";
  return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1);
};

export default function StudentDetailPage() {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id || "0", 10);
  const [isHardDeleteDialogOpen, setIsHardDeleteDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-full-info", studentId],
    queryFn: () => studentService.getStudentFullInfo(studentId),
    enabled: !!studentId,
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () => studentService.hardDeleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success(t("studentPermanentlyDeleted") || "Talaba butunlay o'chirildi");
      navigate("/students");
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t("failedToDeleteStudent") || "Talabani o'chirishda xato";

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const handleDownloadPdf = async (contract: ContractRead) => {
    // First try to use final_pdf_url if available
    if (contract.final_pdf_url) {
      console.log("Opening PDF from final_pdf_url:", contract.final_pdf_url);
      await openPdfUrl(contract.final_pdf_url);
      return;
    }

    try {
      const year = new Date(contract.start_date).getFullYear();
      console.log("Fetching PDF URL for:", year, contract.contract_number);

      const response = await contractService.getContractPdfUrl(
        year,
        contract.contract_number
      );

      console.log("PDF URL response:", response);

      // If API returned a blob/url/object, use openPdfResponse for robust handling
      if (response) {
        await openPdfResponse(response);
        return;
      }

      toast.error(t("pdfNotFound") || "PDF topilmadi");
    } catch (error) {
      console.error("Error fetching PDF:", error);
      toast.error(t("errorDownloadingFile"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Clock className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-red-500">
          {t("loadingError")}
        </h2>
        <p className="text-muted-foreground">{t("studentNotFoundOrError")}</p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/students">{t("backToStudents")}</Link>
        </Button>
      </div>
    );
  }

  const {
    student,
    parents,
    contracts,
    group,
    coach,
    transactions,
    attendances,
  } = data.data as StudentFullInfo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDisplayParents = (): any[] => {
    if (parents && parents.length > 0) return parents;

    if (contracts && contracts.length > 0) {
      const sortedContracts = [...contracts].sort((a, b) => b.id - a.id);

      for (const contract of sortedContracts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let customFields: any = contract.custom_fields;

        if (!customFields) continue;

        if (typeof customFields === "string") {
          try {
            customFields = JSON.parse(customFields);
          } catch (e) {
            console.error("Custom fields parse error", e);
            continue;
          }
        }

        const inferredParents = [];

        if (
          customFields.buyurtmachi &&
          (customFields.buyurtmachi.fio || customFields.buyurtmachi.name)
        ) {
          inferredParents.push({
            id: `contract-${contract.id}-buyurtmachi`,
            first_name:
              customFields.buyurtmachi.fio || customFields.buyurtmachi.name,
            last_name: "",
            relationship_type: "Buyurtmachi",
            phone:
              customFields.buyurtmachi.telefon ||
              customFields.buyurtmachi.phone ||
              "",
            email: "",
            is_from_contract: true,
          });
        }

        if (customFields.student) {
          const st = customFields.student;

          const momName = st.mom_fullname || st.mom_fio || st.mom_name;
          if (momName && momName !== customFields.buyurtmachi?.fio) {
            inferredParents.push({
              id: `contract-${contract.id}-mom`,
              first_name: momName,
              last_name: "",
              relationship_type: "Ona",
              phone: st.mom_phone_number || st.mom_phone || "",
              email: "",
              is_from_contract: true,
            });
          }

          const dadName = st.dad_fullname || st.dad_name || st.dad_fio;
          if (dadName && dadName !== customFields.buyurtmachi?.fio) {
            inferredParents.push({
              id: `contract-${contract.id}-dad`,
              first_name: dadName,
              last_name: "",
              relationship_type: "Ota",
              phone: st.dad_phone_number || st.dad_phone || "",
              email: "",
              is_from_contract: true,
            });
          }
        }

        if (inferredParents.length > 0) {
          return inferredParents;
        }
      }
    }
    return [];
  };

  const displayParents = getDisplayParents();

  return (
    <div className="space-y-6">
      <Link
        to="/students"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToStudents")}
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
              {student.first_name?.[0]}
              {student.last_name?.[0]}
            </div>
            <div>
              <CardTitle className="text-2xl">
                {student.first_name} {student.last_name}
              </CardTitle>
              <p className="text-muted-foreground">{student.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(student.status!)}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsHardDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {t("permanentlyDelete") || "Butunlay o'chirish"}
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <span>{student.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-muted-foreground" />
            <span>{student.address}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span>
              {t("birthDate")}:{" "}
              {format(new Date(student.date_of_birth!), "dd.MM.yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("totalPayments")}
              </p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US").format(
                  transactions?.filter((t) => t.status?.toLowerCase() === "success").reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                )}{" "}
                UZS
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions?.filter((t) => t.status?.toLowerCase() === "success").length || 0} {t("successfulPayments") || "muvaffaqiyatli"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("activeContracts")}
              </p>
              <p className="text-2xl font-bold">
                {contracts?.filter((c) => c.status === "active").length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("attendancePercentage")}
              </p>
              <p className="text-2xl font-bold">
                {attendances && attendances.length > 0
                  ? Math.round(
                      (attendances.filter((a) => a.status === "present")
                        .length /
                        attendances.length) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("information")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("group")}</span>
              <span className="font-medium">
                {group?.name || t("notAssigned")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("coach")}</span>
              <span className="font-medium">
                {coach?.full_name || t("notAssigned")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Face ID</span>
              <Badge variant="secondary">
                {student.face_id || t("notSet")}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("joinedDate")}</span>
              <span className="font-medium">
                {format(new Date(student.created_at!), "dd.MM.yyyy")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PARENTS / GUARDIANS SECTION */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> {t("parentsGuardians")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayParents.length > 0 ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {displayParents.map((parent: ParentRead | any, index) => (
                  <div
                    key={parent.id || index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md bg-muted/50 gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-100 text-blue-600 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">
                          {parent.first_name} {parent.last_name}
                        </p>
                        <p className="text-sm text-blue-600 font-medium">
                          {parent.relationship_type}
                        </p>
                        {parent.email && (
                          <p className="text-sm text-muted-foreground">
                            {parent.email}
                          </p>
                        )}
                        {parent.is_from_contract && (
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-1 h-5 ml-2"
                          >
                            {t("fromContract")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm flex items-center gap-2 bg-background dark:bg-muted/30 px-3 py-1.5 rounded border">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-foreground">
                        {parent.phone || t("noPhone")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>{t("noParentInfo")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("contracts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("contractNumber")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("monthlyFee")}</TableHead>
                <TableHead>{t("period")}</TableHead>
                <TableHead>{t("duration")}</TableHead>
                <TableHead className="text-right [&>div]:justify-end">
                  {t("contract")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts && contracts.length > 0 ? (
                contracts.map((c: ContractRead, index: number) => {
                  const startDate = new Date(c.start_date!);
                  const endDate = new Date(c.end_date!);
                  const monthsDiff = Math.round(
                    (endDate.getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24 * 30)
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {c.contract_number}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status!)}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US").format(c.monthly_fee)}{" "}
                        UZS
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(startDate, "dd.MM.yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            - {format(endDate, "dd.MM.yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {monthsDiff} {t("months")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(c)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {t("downloadContract")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    {t("noContracts")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("paymentHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("yearMonth")}</TableHead>
                <TableHead>{t("sum")}</TableHead>
                <TableHead>{t("source")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("comment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions && transactions.length > 0 ? (
                transactions.map((t: TransactionRead, index: number) => {
                  const paidDate = new Date(t.paid_at!);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{index + 1}
                      </TableCell>
                      <TableCell>{format(paidDate, "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {t.payment_year}-{t.payment_months && t.payment_months.length > 0
                            ? t.payment_months.map(m => String(m).padStart(2, '0')).join(',')
                            : format(paidDate, "MM")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {new Intl.NumberFormat("en-US").format(t.amount)} UZS
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatSource(t.source)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status!)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.comment || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    {t("noPayments")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("attendanceHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("comment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances && attendances.length > 0 ? (
                attendances.map((a: AttendanceRead) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {format(new Date(a.created_at!), "dd.MM.yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{getStatusBadge(a.status!)}</TableCell>
                    <TableCell>{a.comment}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    {t("noAttendanceData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hard Delete Confirmation Dialog */}
      <Dialog open={isHardDeleteDialogOpen} onOpenChange={setIsHardDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-xl text-red-600 dark:text-red-400">
                {t("permanentDeleteWarning") || "OGOHLANTRISH: Butunlay o'chirish"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base mt-4">
              <p className="font-semibold text-foreground mb-3">
                {t("permanentDeleteStudent") || "Talabani butunlay o'chirasizmi"}:{" "}
                <span className="text-red-600">
                  {student.first_name} {student.last_name}
                </span>?
              </p>
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 font-bold mb-2">
                  ⚠️ {t("thisActionCannotBeUndone") || "Bu amalni qaytarib bo'lmaydi!"}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                  {t("followingWillBeDeleted") || "Quyidagilar butunlay o'chiriladi"}:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>{t("studentProfile") || "Talaba profili"}</li>
                  <li>{t("allContracts") || "Barcha shartnomalar"}</li>
                  <li>{t("paymentHistory") || "To'lov tarixi"}</li>
                  <li>{t("attendanceRecords") || "Davomat yozuvlari"}</li>
                  <li>{t("parentRecords") || "Ota-ona ma'lumotlari"}</li>
                  <li>{t("gateLogRecords") || "Kirish-chiqish yozuvlari"}</li>
                  <li>{t("waitingListEntries") || "Navbat ro'yxati yozuvlari"}</li>
                </ul>
                <p className="text-sm text-red-700 dark:text-red-300 mt-3 font-medium">
                  {t("contractNumbersWillBeFreed") || "Shartnoma raqamlari bo'shab, qayta ishlatilishi mumkin"}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsHardDeleteDialogOpen(false)}
              className="flex-1"
              disabled={hardDeleteMutation.isPending}
            >
              {t("cancel") || "Bekor qilish"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => hardDeleteMutation.mutate()}
              disabled={hardDeleteMutation.isPending}
              className="flex-1 gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {hardDeleteMutation.isPending
                ? (t("deleting") || "O'chirilmoqda...")
                : (t("permanentlyDelete") || "Butunlay o'chirish")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
