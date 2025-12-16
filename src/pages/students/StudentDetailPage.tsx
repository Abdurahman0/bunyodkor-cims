import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { studentService, contractService } from "@/services/api.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  StudentFullInfo,
  TransactionRead,
  ContractRead,
  AttendanceRead,
  ParentRead,
} from "@/types/api";

const getStatusBadge = (status: string) => {
  const styles: { [key: string]: string } = {
    active: "bg-green-100 text-green-700",
    present: "bg-green-100 text-green-700",
    success: "bg-green-100 text-green-700",
    graduated: "bg-blue-100 text-blue-700",
    dropped: "bg-red-100 text-red-700",
    absent: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
    suspended: "bg-yellow-100 text-yellow-700",
    pending: "bg-yellow-100 text-yellow-700",
    late: "bg-orange-100 text-orange-700",
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
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id || "0", 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-full-info", studentId],
    queryFn: () => studentService.getStudentFullInfo(studentId),
    enabled: !!studentId,
  });

  const handleDownloadPdf = async (contract: ContractRead) => {
    if (contract.final_pdf_url) {
      window.open(contract.final_pdf_url, "_blank");
      return;
    }

    try {
      const year = new Date(contract.start_date).getFullYear();
      const response = await contractService.getContractPdfUrl(
        year,
        contract.contract_number
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const url =
        typeof response === "object" &&
        response !== null &&
        "pdf_url" in response
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (response as any).pdf_url
          : response;

      if (url && typeof url === "string") {
        window.open(url, "_blank");
      } else {
        toast.error("Shartnoma PDF fayli topilmadi");
      }
    } catch (error) {
      console.error(error);
      toast.error("Faylni yuklashda xatolik yuz berdi");
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
          Ma'lumotlarni yuklashda xatolik
        </h2>
        <p className="text-muted-foreground">
          Talaba topilmadi yoki serverda xatolik yuz berdi.
        </p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/students">Talabalar ro'yxatiga qaytish</Link>
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
            relationship_type: "Buyurtmachi (Shartnoma)",
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
        Ortga qaytish
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
          {getStatusBadge(student.status!)}
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
              Tug'ilgan sana:{" "}
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
              <p className="text-sm text-muted-foreground">Jami To'lovlar</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US").format(
                  transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
                )}{" "}
                UZS
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Faol Shartnomalar</p>
              <p className="text-2xl font-bold">
                {contracts?.filter((c) => c.status === "active").length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Davomat Foizi</p>
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
            <CardTitle>Ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guruh</span>
              <span className="font-medium">
                {group?.name || "Biriktirilmagan"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Murabbiy</span>
              <span className="font-medium">
                {coach?.full_name || "Biriktirilmagan"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Face ID</span>
              <Badge variant="secondary">
                {student.face_id || "O'rnatilmagan"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Qo'shilgan sana</span>
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
              <Users className="w-5 h-5" /> Ota-onalar / Vasiylar
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
                            Shartnomadan
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm flex items-center gap-2 bg-background dark:bg-muted/30 px-3 py-1.5 rounded border">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-foreground">
                        {parent.phone || "No phone"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>Ota-ona ma'lumotlari topilmadi.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shartnomalar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Shartnoma №</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead>Oylik To'lov</TableHead>
                <TableHead>Davr</TableHead>
                <TableHead>Davomiyligi</TableHead>
                {/* O'zgartirish: O'ng tomonga to'g'rilash uchun [&>div]:justify-end klassi qo'shildi */}
                <TableHead className="text-right [&>div]:justify-end">
                  Kontrakt
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts && contracts.length > 0 ? (
                contracts.map((c: ContractRead) => {
                  const startDate = new Date(c.start_date!);
                  const endDate = new Date(c.end_date!);
                  const monthsDiff = Math.round(
                    (endDate.getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24 * 30)
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{c.id}
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
                        <Badge variant="outline">{monthsDiff} oy</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <button
                            className="botao"
                            onClick={() => handleDownloadPdf(c)}
                          >
                            <span className="texto">Yuklash</span>
                            <span className="mysvg">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-6 h-6"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                />
                              </svg>
                            </span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    Shartnomalar mavjud emas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To'lovlar Tarixi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Yil/Oy</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>Manba</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead>Izoh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions && transactions.length > 0 ? (
                transactions.map((t: TransactionRead) => {
                  const paidDate = new Date(t.paid_at!);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{t.id}
                      </TableCell>
                      <TableCell>{format(paidDate, "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {format(paidDate, "yyyy-MM")}
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
                    To'lovlar topilmadi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Davomat Tarixi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead>Izoh</TableHead>
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
                    Davomat ma'lumotlari topilmadi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
