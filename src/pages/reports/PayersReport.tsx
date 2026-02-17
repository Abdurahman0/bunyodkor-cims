/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type FC } from "react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableEmpty,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { reportService, groupService } from "@/services/api.service";
import { useLanguageStore } from "@/store/languageStore";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { exportReport } from "@/lib/export-utils";
import toast from "react-hot-toast";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";

const PayersReport: FC = () => {
  const { t } = useLanguageStore();
  const currentYear = new Date().getFullYear();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [paymentYear, setPaymentYear] = useState<number | "">(currentYear);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [minPaidAmount, setMinPaidAmount] = useState<number | "">("");
  const [fromDate, setFromDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [toDate, setToDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups-list-all"],
    queryFn: async () => {
      const allGroups: any[] = [];
      let currentPage = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await groupService.getGroups({ page: currentPage, page_size: 100 });
        if (response.data && response.data.length > 0) {
          allGroups.push(...response.data);
          if (response.meta && currentPage < response.meta.total_pages) {
            currentPage++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return { data: allGroups };
    },
  });

  // Normalize groups response in case API is double-wrapped: { data: { data: [...] } }
  const groupsList: any[] = useMemo(() => {
    if (!groupsData?.data) return [];
    return groupsData.data;
  }, [groupsData]);

  const { data: payersData, isLoading } = useQuery({
    queryKey: [
      "payers-report",
      page,
      pageSize,
      paymentYear,
      groupId,
      minPaidAmount,
      fromDate,
      toDate,
    ],
    queryFn: () => {
      const params: any = { page, page_size: pageSize };
      if (paymentYear !== "") params.payment_year = paymentYear;
      if (groupId) params.group_id = groupId;
      if (minPaidAmount !== "") params.min_paid_amount = minPaidAmount;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      return reportService.getPayers(params);
    },
    placeholderData: (previousData) => previousData,
  });

  const formatCurrency = (amount: number) =>
    formatCurrencyUtil(amount, "UZS", "uz-UZ", false);

  const handleExport = async () => {
    try {
      const toastId = toast.loading(t("exportingData"));
      const params: any = { page: 1, page_size: 100000 };
      if (paymentYear !== "") params.payment_year = paymentYear;
      if (groupId) params.group_id = groupId;
      if (minPaidAmount !== "") params.min_paid_amount = minPaidAmount;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const resp = await reportService.getPayers(params);

      if (!resp?.data || resp.data.length === 0) {
        toast.error(t("noDataToExport"), { id: toastId });
        return;
      }
      
      const allItems = resp.data;

      const exportData = allItems.map((item: any) => {
        const groupFromList = groupsList.find(
          (g: any) => g.id === item.group_id,
        );
        return {
          "Student ID": item.student_id,
          "Student Name": item.student_name,
          Group:
            item.group_name || (groupFromList ? groupFromList.name : "N/A"),
          Contract: item.contract_number,
          "Payment Year": item.payment_year,
          "Payment Months": (item.payment_months || []).join(","),
          "Total Paid": item.total_paid,
        };
      });

      exportReport(exportData, `payers-report-${paymentYear || "all"}`);
      toast.success(t("exportedSuccessfully"), { id: toastId });
    } catch (err) {
      toast.error(t("errorExportingData"));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("payersReport")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("paymentYear")}
              </label>
              <select
                value={paymentYear}
                onChange={(e) => {
                  setPaymentYear(e.target.value ? Number(e.target.value) : "");
                  setPage(1);
                }}
                className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {[
                  currentYear - 2,
                  currentYear - 1,
                  currentYear,
                  currentYear + 1,
                ].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="">{t("allYears")}</option>
              </select>
            </div>

            <div className="w-64">
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("group")}
              </label>
              <select
                value={groupId ? String(groupId) : ""}
                onChange={(e) => {
                  setGroupId(e.target.value ? Number(e.target.value) : null);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={groupsLoading}
              >
                <option value="">{t("allGroups")}</option>
                {groupsLoading ? (
                  <option value="" disabled>
                    {t("loading")}
                  </option>
                ) : groupsList && groupsList.length > 0 ? (
                  groupsList.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    {t("noGroupsAvailable")}
                  </option>
                )}
              </select>{" "}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("minPaidAmount")}
              </label>
              <Input
                type="number"
                value={minPaidAmount as any}
                onChange={(e) => {
                  setMinPaidAmount(
                    e.target.value ? Number(e.target.value) : "",
                  );
                  setPage(1);
                }}
                className="h-10 w-40"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("fromDate")}
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-40"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("toDate")}
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-40"
              />
            </div>

            <div className="ml-auto flex gap-2">
              <Button onClick={handleExport}>{t("exportReport")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table isLoading={isLoading}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("student")}</TableHead>
              <TableHead>{t("group")}</TableHead>
              <TableHead>{t("contractNumber")}</TableHead>
              <TableHead>{t("paymentYear")}</TableHead>
              <TableHead>{t("paymentMonths")}</TableHead>
              <TableHead className="text-right [&>div]:justify-end">
                {t("totalPaid")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payersData?.data && payersData.data.length > 0 ? (
              payersData.data.map((p: any) => (
                <TableRow key={`${p.student_id}-${p.contract_number}`}>
                  <TableCell className="font-medium">
                    {p.student_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {p.group_name ||
                        (groupsList.find((g: any) => g.id === p.group_id)
                          ?.name ??
                          "N/A")}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.contract_number}</TableCell>
                  <TableCell>{p.payment_year}</TableCell>
                  <TableCell>{(p.payment_months || []).join(", ")}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.total_paid)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty
                title={t("noData")}
                description={t("noPayersFound")}
              />
            )}
          </TableBody>
        </Table>

        {payersData?.meta && payersData.meta.total_pages > 1 && (
          <TablePagination
            currentPage={page}
            totalPages={payersData.meta.total_pages}
            totalItems={payersData.meta.total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
};

export default PayersReport;
