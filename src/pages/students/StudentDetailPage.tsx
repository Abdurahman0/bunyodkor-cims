/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService, contractService } from "@/services/api.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
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
  Wallet,
  MapPin,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
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
      "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    present: "bg-emerald-50 text-emerald-700 border-emerald-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    graduated: "bg-purple-50 text-purple-700 border-purple-200",
    dropped: "bg-rose-50 text-rose-700 border-rose-200",
    absent: "bg-rose-50 text-rose-700 border-rose-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-gray-50 text-gray-700 border-gray-200",
    suspended: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    late: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <Badge
      variant="outline"
      className={`${
        styles[status] || "bg-gray-50 text-gray-700 border-gray-200"
      } px-2.5 py-0.5 capitalize`}
    >
      {status}
    </Badge>
  );
};

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
      // 1. Ro'yxatlarni yangilaymiz (List sahifalar uchun)
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });

      // ⚠️ MUHIM: Quyidagi qatorni O'CHIRIB TASHLANG yoki Commentga oling:
      // queryClient.invalidateQueries({ queryKey: ["student-full-info"] });
      // Sababi: Student o'chdi, uning infosini qayta so'rash xato (404) beradi.

      // 2. Cache dan bu studentni qo'lda o'chiramiz (Xatolik chiqmasligi uchun)
      queryClient.removeQueries({ queryKey: ["student-full-info", studentId] });

      toast.success(
        t("studentPermanentlyDeleted") || "Talaba butunlay o'chirildi"
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

  const handleDownloadPdf = async (contract: ContractRead) => {
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
        if (typeof response === "string") pdfUrl = response;
        else if (response && "pdf_url" in response)
          pdfUrl = (response as any).pdf_url;
      }

      if (!pdfUrl) {
        toast.error(t("pdfNotFound") || "PDF topilmadi");
        return;
      }

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
      if (!contract.contract_number) {
        toast.error("Shartnoma raqami hali shakllanmagan");
        return;
      }
      const startDate = contract.start_date
        ? new Date(contract.start_date)
        : new Date();
      const year = startDate.getFullYear();
      const toastId = toast.loading("Shartnoma fayli yuklanmoqda...");
      const response = await contractService.getContractPdfUrl(
        year,
        contract.contract_number
      );
      toast.dismiss(toastId);
      if (response && response.pdf_url) {
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <Clock className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-semibold text-foreground">
          {t("loadingError")}
        </h2>
        <p className="text-muted-foreground">{t("studentNotFoundOrError")}</p>
        <Button asChild variant="outline">
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

  // Logic to extract parents (kept same as original)
  const getDisplayParents = (): any[] => {
    if (parents && parents.length > 0) return parents;
    if (contracts && contracts.length > 0) {
      const sortedContracts = [...contracts].sort((a, b) => b.id - a.id);
      const allParents: any[] = [];
      for (const contract of sortedContracts) {
        let customFields: any = contract.custom_fields;
        if (!customFields) continue;
        if (typeof customFields === "string") {
          try {
            customFields = JSON.parse(customFields);
          } catch (e) {
            continue;
          }
        }

        if (
          customFields.buyurtmachi &&
          (customFields.buyurtmachi.fio || customFields.buyurtmachi.name)
        ) {
          allParents.push({
            id: `contract-${contract.id}-buyurtmachi`,
            first_name:
              customFields.buyurtmachi.fio || customFields.buyurtmachi.name,
            last_name: "",
            relationship_type: "Buyurtmachi",
            phone:
              customFields.buyurtmachi.telefon ||
              customFields.buyurtmachi.phone ||
              "",
            is_from_contract: true,
          });
        }
        const st = customFields.student || {};
        const momName = st.mom_fullname || st.mom_fio || customFields.mom_fio;
        if (momName) {
          allParents.push({
            id: `contract-${contract.id}-mom`,
            first_name: momName,
            last_name: "",
            relationship_type: "Ona",
            phone: st.mom_phone_number || customFields.mom_phone || "",
            is_from_contract: true,
          });
        }
        const dadName = st.dad_fullname || st.dad_fio || customFields.dad_name;
        if (dadName) {
          allParents.push({
            id: `contract-${contract.id}-dad`,
            first_name: dadName,
            last_name: "",
            relationship_type: "Ota",
            phone: st.dad_phone_number || customFields.dad_phone || "",
            is_from_contract: true,
          });
        }
      }
      return allParents.filter(
        (parent, index, self) =>
          index ===
          self.findIndex(
            (p) =>
              p.first_name === parent.first_name &&
              p.relationship_type === parent.relationship_type
          )
      );
    }
    return [];
  };

  const displayParents = getDisplayParents();
  const parentsList = displayParents.filter(
    (p) => p.relationship_type === "Ota" || p.relationship_type === "Ona"
  );
  const guardiansList = displayParents.filter(
    (p) => p.relationship_type !== "Ota" && p.relationship_type !== "Ona"
  );

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <Link
          to="/students"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("backToStudents")}
        </Link>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-3xl shadow-lg shadow-primary/20">
              {student.first_name?.[0]}
              {student.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {student.first_name} {student.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{student.phone}</span>
                <Separator orientation="vertical" className="h-4 mx-1" />
                {getStatusBadge(student.status!)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Quick Actions can go here if needed */}
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-950 dark:to-slate-900 border-none shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalPayments")}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US").format(
                    transactions
                      ?.filter((t) => t.status?.toLowerCase() === "success")
                      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                  )}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  UZS
                </span>
              </div>
              <Badge variant="secondary" className="mt-1">
                {transactions?.filter(
                  (t) => t.status?.toLowerCase() === "success"
                ).length || 0}{" "}
                {t("successfulPayments")}
              </Badge>
            </div>
            <div className="p-3 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-full text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-950 dark:to-slate-900 border-none shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("contractNumber")}
              </p>
              <span className="text-2xl font-bold tracking-tight">
                {contracts?.find((c) => c.status === "active")
                  ?.contract_number || "-"}
              </span>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {contracts?.length || 0} {t("contracts")}
              </p>
            </div>
            <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-950 dark:to-slate-900 border-none shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("attendancePercentage")}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {attendances && attendances.length > 0
                    ? Math.round(
                        (attendances.filter((a) => a.status === "present")
                          .length /
                          attendances.length) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Jami: {attendances?.length || 0} dars
              </p>
            </div>
            <div className="p-3 bg-violet-100/50 dark:bg-violet-900/20 rounded-full text-violet-600 dark:text-violet-400">
              <Percent className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT TABS */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-background border p-1 h-auto">
          <TabsTrigger value="overview" className="px-4 py-2">
            {t("information") || "Umumiy"}
          </TabsTrigger>
          <TabsTrigger value="finance" className="px-4 py-2">
            {t("finance") || "Moliya"}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="px-4 py-2">
            {t("attendanceHistory") || "Davomat"}
          </TabsTrigger>
        </TabsList>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Details Card */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {t("personalInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {t("address")}
                      </p>
                      <p className="font-medium text-sm">
                        {student.address || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {t("birthDate")}
                      </p>
                      <p className="font-medium text-sm">
                        {student.date_of_birth
                          ? format(
                              new Date(student.date_of_birth),
                              "dd.MM.yyyy"
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {t("group")}
                      </p>
                      <p className="font-medium text-sm">
                        {group?.name || t("notAssigned")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {t("coach")}
                      </p>
                      <p className="font-medium text-sm">
                        {coach?.full_name || t("notAssigned")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      Face ID
                    </span>
                    <Badge variant={student.face_id ? "default" : "secondary"}>
                      {student.face_id ? "Bor" : t("notSet")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-b">
                    <span className="text-sm text-muted-foreground">
                      {t("joinedDate")}
                    </span>
                    <span className="text-sm font-medium">
                      {student.created_at
                        ? format(new Date(student.created_at), "dd.MM.yyyy")
                        : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parents & Guardians */}
            <div className="lg:col-span-2 space-y-6">
              {/* Parents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    {t("parents") || "Ota-onalar"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parentsList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {parentsList.map((parent: any, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow"
                        >
                          <div className="p-2.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {parent.first_name} {parent.last_name}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                              {parent.relationship_type}
                            </p>
                            <a
                              href={`tel:${parent.phone}`}
                              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> {parent.phone}
                            </a>
                            {parent.is_from_contract && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1 mt-2"
                              >
                                {t("fromContract")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                      <p>{t("noParentInfo")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Guardians */}
              {guardiansList.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-500" />
                      {t("guardian") || "Vasiy / Buyurtmachi"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {guardiansList.map((guardian: any, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/50"
                        >
                          <div className="p-2.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {guardian.first_name} {guardian.last_name}
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                              {guardian.relationship_type}
                            </p>
                            <a
                              href={`tel:${guardian.phone}`}
                              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> {guardian.phone}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* DANGER ZONE */}
          <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-500 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {t("criticalAction")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-muted-foreground max-w-2xl">
                <p>{t("studentDeletionWarning_line1")}</p>
                <p className="font-medium mt-1">
                  {t("studentDeletionWarning_line2")}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsHardDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("permanentlyDelete")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- FINANCE TAB --- */}
        <TabsContent value="finance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {t("contracts")}
              </CardTitle>
              <CardDescription>
                Barcha tuzilgan shartnomalar tarixi
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{t("contractNumber")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("monthlyFee")}</TableHead>
                    <TableHead>{t("period")}</TableHead>
                    <TableHead className="text-right">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts && contracts.length > 0 ? (
                    contracts.map((c, idx) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {c.contract_number}
                        </TableCell>
                        <TableCell>{getStatusBadge(c.status!)}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US").format(c.monthly_fee)}{" "}
                          UZS
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(c.start_date), "dd.MM.yyyy")} -{" "}
                          {format(new Date(c.end_date), "dd.MM.yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewContract(c)}
                              title={t("viewContract")}
                            >
                              <Eye className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPdf(c)}
                              title={t("downloadContract")}
                            >
                              <Download className="w-4 h-4 text-green-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center h-24 text-muted-foreground"
                      >
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
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                {t("paymentHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("sum")}</TableHead>
                    <TableHead>{t("yearMonth")}</TableHead>
                    <TableHead>{t("source")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("comment")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions && transactions.length > 0 ? (
                    transactions.map((t, idx) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          {t.paid_at
                            ? format(new Date(t.paid_at), "dd.MM.yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{new Intl.NumberFormat("en-US").format(t.amount)} UZS
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono bg-background"
                          >
                            {t.payment_year}-
                            {t.payment_months
                              ?.map((m) => String(m).padStart(2, "0"))
                              .join(", ") || format(new Date(t.paid_at!), "MM")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatSource(t.source)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(t.status!)}</TableCell>
                        <TableCell
                          className="text-muted-foreground text-sm max-w-[200px] truncate"
                          title={t.comment || ""}
                        >
                          {t.comment || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center h-24 text-muted-foreground"
                      >
                        {t("noPayments")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ATTENDANCE TAB --- */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-500" />
                {t("attendanceHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    attendances.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {format(new Date(a.created_at!), "dd.MM.yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{getStatusBadge(a.status!)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.comment || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center h-24 text-muted-foreground"
                      >
                        {t("noAttendanceData")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={isHardDeleteDialogOpen}
        onOpenChange={setIsHardDeleteDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">
              {t("permanentDeleteWarning")}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {t("permanentDeleteStudent")}{" "}
              <span className="font-bold text-foreground">
                {student.first_name} {student.last_name}
              </span>
              ?
              <br />
              <span className="text-red-600 font-medium mt-2 block">
                {t("thisActionCannotBeUndone")}!
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4 justify-center">
            <Button
              variant="outline"
              onClick={() => setIsHardDeleteDialogOpen(false)}
              disabled={hardDeleteMutation.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => hardDeleteMutation.mutate()}
              disabled={hardDeleteMutation.isPending}
            >
              {hardDeleteMutation.isPending
                ? t("deleting")
                : t("confirmPermanentDelete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
