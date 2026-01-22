/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService, contractService } from "@/services/api.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// dialog UI removed for Replace Contract PDF — kept programmatic mutation
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
  Pencil,
  FileUp,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [contractToUpdate, setContractToUpdate] = useState<ContractRead | null>(
    null,
  );
  const [isEditContractDialogOpen, setIsEditContractDialogOpen] =
    useState(false);
  const [monthlyFeeValue, setMonthlyFeeValue] = useState<number | string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-full-info", studentId],
    queryFn: () => studentService.getStudentFullInfo(studentId),
    enabled: !!studentId,
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () => studentService.hardDeleteStudent(studentId),
    onSuccess: () => {
      // 1. Ro'yxatlarni yangilaymiz (List sahifalar uchun)
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });

      // ⚠️ MUHIM: Quyidagi qatorni O'CHIRIB TASHLANG yoki Commentga oling:
      // queryClient.invalidateQueries({ queryKey: ["student-full-info"] });
      // Sababi: Student o'chdi, uning infosini qayta so'rash xato (404) beradi.

      // 2. Cache dan bu studentni qo'lda o'chiramiz (Xatolik chiqmasligi uchun)
      queryClient.removeQueries({ queryKey: ["student-full-info", studentId] });

      toast.success(
        t("studentPermanentlyDeleted") || "Talaba butunlay o'chirildi",
      );
      setIsHardDeleteDialogOpen(false);

      // 3. Sahifadan chiqib ketamiz
      navigate("/students", { replace: true });
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

  const updatePdfMutation = useMutation({
    mutationFn: async ({
      contractId,
      file,
    }: {
      contractId: number;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("final_pdf", file);
      return contractService.updateContractPdf(contractId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-full-info", studentId],
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success(t("pdfReplacedSuccess") || "Contract PDF updated");
      setPdfDialogOpen(false);
      setSelectedPdfFile(null);
      setContractToUpdate(null);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t("anErrorOccurred") || "An error occurred";
      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }
      toast.error(errorMessage);
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ contractId, data }: { contractId: number; data: any }) =>
      contractService.updateContract(contractId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-full-info", studentId],
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success(t("contractUpdatedSuccess") || "Contract updated");
      setIsEditContractDialogOpen(false);
      setContractToUpdate(null);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t("anErrorOccurred") || "An error occurred";
      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage;
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }
      toast.error(errorMessage);
    },
  });

  const updateMonthlyFeeMutation = useMutation({
    mutationFn: ({
      contractId,
      monthly_fee,
    }: {
      contractId: number;
      monthly_fee: number;
    }) => contractService.updateContractMonthlyFee(contractId, { monthly_fee }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-full-info", studentId],
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success(t("contractUpdatedSuccess") || "Monthly fee updated");
      setMonthlyFeeValue("");
      setContractToUpdate(null);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let errorMessage = t("anErrorOccurred") || "An error occurred";
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
          contract.contract_number,
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

      toast.success(t("downloadedSuccessfully"));
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error(t("errorDownloadingFile"));
    }
  };

  const handleViewContract = async (contract: ContractRead) => {
    try {
      // Shartnoma ID si borligini tekshiramiz
      if (!contract.id) {
        toast.error("Contract ID not found");
        return;
      }

      // Loading holatini bildirish
      const toastId = toast.loading(t("loadingContractFile"));

      // API ga so'rov
      const pdfUrl = await contractService.viewContractPdf(contract.id);
      toast.dismiss(toastId);

      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      } else {
        toast.error(t("pdfLinkNotFound") || "PDF link not found");
      }
    } catch (error) {
      console.error("PDF xatolik:", error);
      toast.dismiss();
      toast.error(t("errorOpeningContractFile"));
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
            contract.id,
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
          momPhone,
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
          dadPhone,
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
            contract.id,
          );
          console.log(
            "[STUDENT DETAIL] Checked fields - st.dad_fullname:",
            st.dad_fullname,
            "st.dad_name:",
            st.dad_name,
            "st.dad_fio:",
            st.dad_fio,
            "customFields.dad_name:",
            customFields.dad_name,
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
              p.relationship_type === parent.relationship_type,
          ),
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
    (p) => p.relationship_type === "Ota" || p.relationship_type === "Ona",
  );

  // Guardians: Everyone else (Buyurtmachi, etc.)
  // BUT also show Buyurtmachi separately if they are ALSO listed as parent
  const guardiansList = displayParents.filter(
    (p) => p.relationship_type !== "Ota" && p.relationship_type !== "Ona",
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
                    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
                )}{" "}
                UZS
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions?.filter(
                  (t) => t.status?.toLowerCase() === "success",
                ).length || 0}{" "}
                {t("successfulPayments")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("contractNumber")}
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
                        100,
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
              <Users className="w-5 h-5" /> {t("parents")}
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
                <p>{t("noParentInfo")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GUARDIANS SECTION */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> {t("guardian")}
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
                <p>{t("noGuardianInfo")}</p>
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
                      (1000 * 60 * 60 * 24 * 30),
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
                        <div className="flex items-center gap-2">
                          {new Intl.NumberFormat("en-US").format(c.monthly_fee)}{" "}
                          UZS
                          <Pencil
                            className="w-4 h-4 text-muted-foreground cursor-pointer"
                            onClick={() => {
                              setContractToUpdate(c);
                              setMonthlyFeeValue(c.monthly_fee ?? "");
                            }}
                          />
                        </div>
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
                            onClick={() => {
                              setContractToUpdate(c);
                              setPdfDialogOpen(true);
                            }}
                          >
                            <FileUp className="w-4 h-4 mr-2" />
                            {t("replaceContractPdf") || "Shartnomani almashtirish"}
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
      <Card className="border-red-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-600 dark:text-red-500">
            <AlertTriangle className="w-5 h-5" />
            {t("criticalAction")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("studentDeletionWarning_line1")}
            <br />
            <span className="font-semibold">
              {t("studentDeletionWarning_line2")}
            </span>
          </p>
          <Button
            variant="destructive"
            onClick={() => setIsHardDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("permanentlyDelete")}
          </Button>
        </CardContent>
      </Card>

      {/* Hard Delete Confirmation Dialog */}
      <Dialog
        open={isHardDeleteDialogOpen}
        onOpenChange={setIsHardDeleteDialogOpen}
      >
        <DialogContent className="sm:max-w-md pb-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-red-600 dark:text-red-500">
              <AlertTriangle />
              {t("permanentDeleteWarning")}
            </DialogTitle>
            <DialogDescription className="pt-4 text-left">
              <p>
                {t("permanentDeleteStudent")}
                <span className="font-bold text-foreground">
                  {` ${student.first_name} ${student.last_name}`}
                </span>
                ?
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {t("studentDeletionWarning_line1")}
              </p>
              <p className="mt-2 font-semibold text-red-600 dark:text-red-500">
                {t("thisActionCannotBeUndone")}!
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsHardDeleteDialogOpen(false)}
              className="flex-1"
              disabled={hardDeleteMutation.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => hardDeleteMutation.mutate()}
              disabled={hardDeleteMutation.isPending}
              className="flex-1 gap-2"
            >
              {hardDeleteMutation.isPending ? (
                t("deleting")
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t("confirmPermanentDelete")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contract Dialog */}
      <Dialog
        open={isEditContractDialogOpen}
        onOpenChange={setIsEditContractDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("replaceContract") || t("editContract")}
            </DialogTitle>
          </DialogHeader>
          {contractToUpdate && (
            <div className="space-y-4">
              <div>
                <label className="text-sm">{t("monthlyFee")}</label>
                <input
                  type="number"
                  min={1}
                  value={String(contractToUpdate.monthly_fee ?? "")}
                  onChange={(e) =>
                    setContractToUpdate({
                      ...contractToUpdate,
                      monthly_fee: Number(e.target.value),
                    })
                  }
                  className="w-full border rounded px-3 py-2 mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!contractToUpdate) return;
                    const payload = {
                      start_date: contractToUpdate.start_date,
                      end_date: contractToUpdate.end_date,
                      monthly_fee: contractToUpdate.monthly_fee,
                      status: contractToUpdate.status,
                      custom_fields: contractToUpdate.custom_fields,
                    };
                    updateContractMutation.mutate({
                      contractId: contractToUpdate.id,
                      data: payload,
                    });
                  }}
                >
                  {t("save")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditContractDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick edit monthly fee dialog - rendered inline when contractToUpdate.monthly_fee is set via button */}
      {contractToUpdate && monthlyFeeValue !== "" && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-card border p-4 rounded shadow-md">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-sm">{t("monthlyFee")}</label>
                <input
                  type="number"
                  min={1}
                  value={String(monthlyFeeValue)}
                  onChange={(e) => setMonthlyFeeValue(Number(e.target.value))}
                  className="w-40 border rounded px-2 py-1 mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const fee = Number(monthlyFeeValue);
                    if (isNaN(fee) || fee <= 0) {
                      toast.error(
                        t("amountMustBeGreaterThanZero") ||
                          "Amount must be > 0",
                      );
                      return;
                    }
                    updateMonthlyFeeMutation.mutate({
                      contractId: contractToUpdate.id,
                      monthly_fee: fee,
                    });
                  }}
                >
                  {t("save")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMonthlyFeeValue("");
                    setContractToUpdate(null);
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replace Contract PDF Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("replaceContractPdf") || "Shartnoma PDF-ni almashtirish"}
            </DialogTitle>
            <DialogDescription>
              {t("replaceContractPdfDescription") ||
                "Yangi shartnoma PDF faylini yuklang. Eski fayl o'rniga bu yangisi saqlanadi."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                setSelectedPdfFile(e.target.files ? e.target.files[0] : null)
              }
            />
            {selectedPdfFile && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("selectedFile") || "Tanlangan fayl"}: {selectedPdfFile.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPdfDialogOpen(false);
                setSelectedPdfFile(null);
                setContractToUpdate(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                if (contractToUpdate && selectedPdfFile) {
                  updatePdfMutation.mutate({
                    contractId: contractToUpdate.id,
                    file: selectedPdfFile,
                  });
                }
              }}
              disabled={!selectedPdfFile || updatePdfMutation.isPending}
            >
              {updatePdfMutation.isPending
                ? (t("uploading") || "Yuklanmoqda...")
                : (t("uploadAndSave") || "Yuklash va Saqlash")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
