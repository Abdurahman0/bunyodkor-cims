import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/services/api.service";
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
import { ArrowLeft, Home, Calendar, Clock, Phone } from "lucide-react";
import { format } from "date-fns";
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

const formatSource = (source: any) => {
  // Remove any "Paymentsource." prefix and format properly
  const cleanSource = source?.toString().replace(/^.*\./, '').toLowerCase() || ''
  return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1)
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id || "0", 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-full-info", studentId],
    queryFn: () => studentService.getStudentFullInfo(studentId),
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Clock className="animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-red-500">
          Error loading student data.
        </h2>
        <p className="text-muted-foreground">
          The student may not exist or an error occurred.
        </p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/students">Go back to students</Link>
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

  return (
    <div className="space-y-6">
      <Link
        to="/students"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students List
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
              <p className="text-muted-foreground">
                {student.phone}
              </p>
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
              Born on {format(new Date(student.date_of_birth!), "MMMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US").format(
                  transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
                )} UZS
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Active Contracts</p>
              <p className="text-2xl font-bold">
                {contracts?.filter((c) => c.status === "active").length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <p className="text-2xl font-bold">
                {attendances && attendances.length > 0
                  ? Math.round(
                      (attendances.filter((a) => a.status === "present").length /
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
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Group</span>
              <span className="font-medium">{group?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coach</span>
              <span className="font-medium">{coach?.full_name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Face ID</span>
              <Badge variant="secondary">{student.face_id || "Not set"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium">
                {format(new Date(student.created_at!), "MMM yyyy")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Parents/Guardians</CardTitle>
          </CardHeader>
          <CardContent>
            {parents && parents.length > 0 ? (
              <div className="space-y-3">
                {parents.map((parent: ParentRead) => (
                  <div
                    key={parent.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">
                        {parent.first_name} {parent.last_name} (
                        {parent.relationship_type})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {parent.email}
                      </p>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" /> {parent.phone}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No parent information available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Contract #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly Fee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts && contracts.length > 0 ? (
                contracts.map((c: ContractRead) => {
                  const startDate = new Date(c.start_date!);
                  const endDate = new Date(c.end_date!);
                  const monthsDiff = Math.round(
                    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{c.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.contract_number}
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status!)}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US").format(c.monthly_fee)} UZS
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(startDate, "MMM yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            to {format(endDate, "MMM yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{monthsDiff} months</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No contracts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Year/Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comment</TableHead>
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
                      <TableCell>
                        {format(paidDate, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {format(paidDate, "yyyy-MM")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {new Intl.NumberFormat("en-US").format(t.amount)} UZS
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatSource(t.source)}</Badge>
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
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances && attendances.length > 0 ? (
                attendances.map((a: AttendanceRead) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {format(new Date(a.created_at!), "MMM d, yyyy, p")}
                    </TableCell>
                    <TableCell>{getStatusBadge(a.status!)}</TableCell>
                    <TableCell>{a.comment}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No attendance records found.
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
