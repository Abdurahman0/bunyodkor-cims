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
  Download,
  Eye,
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
    active:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    present:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    graduated:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    dropped: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    absent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    cancelled:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    suspended:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["student-full-info"] });
      toast.success(
        t("studentPermanentlyDeleted") || "Talaba butunlay o'chirildi"
      );
      setIsHardDeleteDialogOpen(false);
      // Navigate after a brief delay to ensure toast is visible
      setTimeout(() => {
        navigate("/students", { replace: true });
      }, 500);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage =
        t("failedToDeleteStudent") || "Talabani o'chirishda xato";

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error(errorMessage);
    },
  });

  const handleDownloadPdf = async (contract: ContractRead) => {
    // Same logic but for download
    try {
      let pdfUrl: string | null = null;

      if (contract.final_pdf_url) {
        pdfUrl = contract.final_pdf_url;
      } else {
        const year = new Date(contract.start_date).getFullYear();
        const response = await contractService.getContractPdfUrl(
          year,
          contract.contract_number
        );

        if (typeof response === "string") {
          pdfUrl = response;
        } else if (
          typeof response === "object" &&
          response !== null &&
          "pdf_url" in response
        ) {
          pdfUrl = (response as any).pdf_url;
        }
      }

      if (!pdfUrl) {
        toast.error(t("pdfNotFound") || "PDF topilmadi");
        return;
      }

      // Download the PDF
      const resp = await fetch(pdfUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract.contract_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Yuklandi");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error(t("errorDownloadingFile"));
    }
  };

  const handleViewContract = async (contract: ContractRead) => {
    try {
      // Shartnoma raqami borligini tekshiramiz
      if (!contract.contract_number) {
        toast.error("Shartnoma raqami hali shakllanmagan");
        return;
      }

      // Yilni aniqlash (start_date dan)
      const startDate = contract.start_date
        ? new Date(contract.start_date)
        : new Date();
      const year = startDate.getFullYear();

      // Loading holatini bildirish
      const toastId = toast.loading("Shartnoma fayli yuklanmoqda...");

      // API ga so'rov
      const response = await contractService.getContract(
        year,
        contract.contract_number
      );
      toast.dismiss(toastId);
      if (response && response.pdf_url) {
        // PDF ni yangi oynada ochish
        window.open(response.pdf_url, "_blank");
      } else {
        toast.error("PDF havolasi topilmadi");
      }
    } catch (error) {
      console.error("PDF xatolik:", error);
      toast.dismiss();
      toast.error("Shartnoma faylini ochishda xatolik yuz berdi");
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
    console.log("[STUDENT DETAIL] Getting parent info");
    console.log("[STUDENT DETAIL] Parents from API:", parents);
    console.log("[STUDENT DETAIL] Contracts:", contracts);

    if (parents && parents.length > 0) {
      console.log("[STUDENT DETAIL] Using parents from API");
      return parents;
    }

    if (contracts && contracts.length > 0) {
      const sortedContracts = [...contracts].sort((a, b) => b.id - a.id);
      console.log("[STUDENT DETAIL] Sorted contracts:", sortedContracts);

      // Try to extract parent info from ALL contracts, collect all unique parents
      const allParents: any[] = [];

      for (const contract of sortedContracts) {
        console.log("[STUDENT DETAIL] Processing contract:", contract.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let customFields: any = contract.custom_fields;

        if (!customFields) {
          console.log(
            "[STUDENT DETAIL] No custom_fields in contract",
            contract.id
          );
          continue;
        }

        if (typeof customFields === "string") {
          try {
            customFields = JSON.parse(customFields);
            console.log("[STUDENT DETAIL] Parsed custom_fields:", customFields);
          } catch (e) {
            console.error("[STUDENT DETAIL] Custom fields parse error", e);
            continue;
          }
        } else {
          console.log("[STUDENT DETAIL] Custom fields (object):", customFields);
        }

        // Extract buyurtmachi
        if (
          customFields.buyurtmachi &&
          (customFields.buyurtmachi.fio || customFields.buyurtmachi.name)
        ) {
          const buyurtmachiName =
            customFields.buyurtmachi.fio || customFields.buyurtmachi.name;
          console.log("[STUDENT DETAIL] Found buyurtmachi:", buyurtmachiName);

          allParents.push({
            id: `contract-${contract.id}-buyurtmachi`,
            first_name: buyurtmachiName,
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

        // Extract mom info
        const st = customFields.student || {};
        console.log("[STUDENT DETAIL] Student fields:", st);
        const momName =
          st.mom_fullname ||
          st.mom_fio ||
          st.mom_name ||
          customFields.mom_fio ||
          customFields.mom_fullname;
        const momPhone =
          st.mom_phone_number ||
          st.mom_phone ||
          customFields.mom_phone ||
          customFields.mom_phone_number ||
          "";
        console.log(
          "[STUDENT DETAIL] Checking mom - name:",
          momName,
          "phone:",
          momPhone
        );
        if (momName) {
          console.log("[STUDENT DETAIL] Found mom:", momName, momPhone);
          allParents.push({
            id: `contract-${contract.id}-mom`,
            first_name: momName,
            last_name: "",
            relationship_type: "Ona",
            phone: momPhone,
            email: "",
            is_from_contract: true,
          });
        }

        // Extract dad info
        const dadName =
          st.dad_fullname ||
          st.dad_name ||
          st.dad_fio ||
          customFields.dad_name ||
          customFields.dad_fullname;
        const dadPhone =
          st.dad_phone_number ||
          st.dad_phone ||
          customFields.dad_phone ||
          customFields.dad_phone_number ||
          "";
        console.log(
          "[STUDENT DETAIL] Checking dad - name:",
          dadName,
          "phone:",
          dadPhone
        );
        if (dadName) {
          console.log("[STUDENT DETAIL] Found dad:", dadName, dadPhone);
          allParents.push({
            id: `contract-${contract.id}-dad`,
            first_name: dadName,
            last_name: "",
            relationship_type: "Ota",
            phone: dadPhone,
            email: "",
            is_from_contract: true,
          });
        } else {
          console.log(
            "[STUDENT DETAIL] No dad name found in contract",
            contract.id
          );
          console.log(
            "[STUDENT DETAIL] Checked fields - st.dad_fullname:",
            st.dad_fullname,
            "st.dad_name:",
            st.dad_name,
            "st.dad_fio:",
            st.dad_fio,
            "customFields.dad_name:",
            customFields.dad_name
          );
        }
      }

      // Deduplicate by name and relationship_type
      const uniqueParents = allParents.filter(
        (parent, index, self) =>
          index ===
          self.findIndex(
            (p) =>
              p.first_name === parent.first_name &&
              p.relationship_type === parent.relationship_type
          )
      );

      console.log("[STUDENT DETAIL] All parents found:", allParents);
      console.log("[STUDENT DETAIL] Unique parents:", uniqueParents);

      if (uniqueParents.length > 0) {
        return uniqueParents;
      }
    }

    console.log("[STUDENT DETAIL] No parent info found");
    return [];
  };

  const displayParents = getDisplayParents();

  console.log("[STUDENT DETAIL] Display parents:", displayParents);

  // Separate parents and guardians
  // Parents: Ota and Ona
  const parentsList = displayParents.filter(
    (p) => p.relationship_type === "Ota" || p.relationship_type === "Ona"
  );

  // Guardians: Everyone else (Buyurtmachi, etc.)
  // BUT also show Buyurtmachi separately if they are ALSO listed as parent
  const guardiansList = displayParents.filter(
    (p) => p.relationship_type !== "Ota" && p.relationship_type !== "Ona"
  );

  console.log("[STUDENT DETAIL] Parents list:", parentsList);
  console.log("[STUDENT DETAIL] Guardians list:", guardiansList);

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
              {format(new Date(student.date_of_birth!), "dd-MM-yyyy")}
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
                  transactions
                    ?.filter((t) => t.status?.toLowerCase() === "success")
                    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                )}{" "}
                UZS
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions?.filter(
                  (t) => t.status?.toLowerCase() === "success"
                ).length || 0}{" "}
                {t("successfulPayments") || "muvaffaqiyatli"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("contractNumber") || "Shartnoma raqami"}
              </p>
              <p className="text-2xl font-bold">
                {contracts?.find((c) => c.status === "active")
                  ?.contract_number || "-"}
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

        {/* PARENTS SECTION */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> {t("parents") || "Ota-onalar"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parentsList.length > 0 ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {parentsList.map((parent: ParentRead | any, index) => (
                  <div
                    key={parent.id || index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md bg-muted/50 gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">
                          {parent.first_name} {parent.last_name}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
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
                            className="text-[10px] mt-1 h-5"
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
                <p>{t("noParentInfo") || "Ota-ona ma'lumoti yo'q"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GUARDIANS SECTION */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> {t("guardian") || "Vasiy"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guardiansList.length > 0 ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {guardiansList.map((guardian: ParentRead | any, index) => (
                  <div
                    key={guardian.id || index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">
                          {guardian.first_name} {guardian.last_name}
                        </p>
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                          {guardian.relationship_type}
                        </p>
                        {guardian.email && (
                          <p className="text-sm text-muted-foreground">
                            {guardian.email}
                          </p>
                        )}
                        {guardian.is_from_contract && (
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-1 h-5"
                          >
                            {t("fromContract")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm flex items-center gap-2 bg-background dark:bg-muted/30 px-3 py-1.5 rounded border">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-foreground">
                        {guardian.phone || t("noPhone")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>{t("noGuardianInfo") || "Vasiy ma'lumoti yo'q"}</p>
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
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewContract(c)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {t("viewContract")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(c)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {t("downloadContract")}
                          </Button>
                        </div>
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
                          {t.payment_year}-
                          {t.payment_months && t.payment_months.length > 0
                            ? t.payment_months
                                .map((m) => String(m).padStart(2, "0"))
                                .join(",")
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

      {/* Critical Actions Section */}
      <Card className="relative overflow-hidden border-none bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] group">
        {/* Yuqoridagi qizil urg'u chizig'i */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            {/* Icon qismi: Pulsatsiya bilan */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-red-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("criticalAction") || "Muhim harakat"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t("irreversibleAction") || "Qaytarib bo'lmaydigan amal"}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ogohlantirish matni: 3ta til olib tashlandi, faqat bitta asosiy xabar qoldi */}
          <div className="relative p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {t("deleteStudentWarning") ||
                  "Talabani butunlay o'chirish barcha ma'lumotlarni yo'q qiladi."}
              </span>{" "}
              Bu jarayon yakunlangach, profil, to'lovlar va davomat tarixini
              qayta tiklab bo'lmaydi.
            </p>
          </div>

          {/* Pastki qism: Tugma va tasdiq xabari */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-[180px]">
              {t("clickButtonToConfirm") ||
                "Davom etish uchun tasdiqlash tugmasini bosing"}
            </p>

            <Button
              variant="destructive"
              onClick={() => setIsHardDeleteDialogOpen(true)}
              className="relative overflow-hidden group/btn px-8 py-6 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 relative z-10">
                <Trash2 className="w-5 h-5" />
                <span className="font-bold tracking-wide">
                  {t("permanentlyDelete") || "O'chirish"}
                </span>
              </div>
              {/* Tugma ichidagi nurli effekt */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hard Delete Confirmation Dialog */}
      <Dialog
        open={isHardDeleteDialogOpen}
        onOpenChange={setIsHardDeleteDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 animate-pulse" />
              </div>
              <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
                {t("permanentDeleteWarning") || "⚠️ OGOHLANTRISH"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base mt-4">
              <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-l-4 border-red-500 rounded-lg shadow-sm">
                <div className="space-y-4">
                  {/* Uzbek */}
                  <div>
                    <p className="text-sm font-bold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                      <span>🇺🇿</span>
                      <span>
                        {t("permanentDeleteStudent") ||
                          "Talabani butunlay o'chirasizmi"}
                        ?
                      </span>
                    </p>
                    <p className="text-xs text-red-800 dark:text-red-300 font-semibold mb-2">
                      {t("thisActionCannotBeUndone") ||
                        "Bu amalni qaytarib bo'lmaydi"}
                      !
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-1.5">
                      {t("followingWillBeDeleted") ||
                        "Quyidagilar butunlay o'chiriladi"}
                      :
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5 list-disc list-inside ml-1">
                      <li>Talaba profili</li>
                      <li>Barcha shartnomalar</li>
                      <li>To'lov tarixi</li>
                      <li>Davomat yozuvlari</li>
                      <li>Ota-ona ma'lumotlari</li>
                      <li>Kirish-chiqish yozuvlari</li>
                      <li>Navbat ro'yxati yozuvlari</li>
                    </ul>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium italic">
                      Shartnoma raqamlari bo'shab, qayta ishlatilishi mumkin
                    </p>
                  </div>

                  {/* English */}
                  <div className="border-t border-red-200/50 dark:border-red-800/50 pt-3">
                    <p className="text-sm font-bold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                      <span>🇬🇧</span>
                      <span>
                        Are you sure you want to permanently delete this
                        student?
                      </span>
                    </p>
                    <p className="text-xs text-red-800 dark:text-red-300 font-semibold mb-2">
                      This action cannot be undone!
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-1.5">
                      The following will be permanently deleted:
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5 list-disc list-inside ml-1">
                      <li>Student profile</li>
                      <li>All contracts</li>
                      <li>Payment history</li>
                      <li>Attendance records</li>
                      <li>Parent information</li>
                      <li>Gate log records</li>
                      <li>Waiting list entries</li>
                    </ul>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium italic">
                      Contract numbers will be freed and can be reused
                    </p>
                  </div>

                  {/* Russian */}
                  <div className="border-t border-red-200/50 dark:border-red-800/50 pt-3">
                    <p className="text-sm font-bold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                      <span>🇷🇺</span>
                      <span>
                        Вы уверены, что хотите навсегда удалить этого студента?
                      </span>
                    </p>
                    <p className="text-xs text-red-800 dark:text-red-300 font-semibold mb-2">
                      Это действие нельзя отменить!
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-1.5">
                      Следующее будет навсегда удалено:
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5 list-disc list-inside ml-1">
                      <li>Профиль студента</li>
                      <li>Все контракты</li>
                      <li>История платежей</li>
                      <li>Записи посещаемости</li>
                      <li>Информация о родителях</li>
                      <li>Записи входа-выхода</li>
                      <li>Записи списка ожидания</li>
                    </ul>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium italic">
                      Номера контрактов будут освобождены и могут быть
                      использованы повторно
                    </p>
                  </div>
                </div>
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
                ? t("deleting") || "O'chirilmoqda..."
                : t("permanentlyDelete") || "Butunlay o'chirish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
