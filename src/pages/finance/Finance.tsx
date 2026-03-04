/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/ui/charts";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Loader2,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { transactionService } from "@/services/api.service";
import type {
  TransactionSource,
  TransactionStatus,
  TransactionWithNameRead,
} from "@/types/api";
import { TransactionDialog } from "./TransactionDialog";
import toast from "react-hot-toast";
import { exportTransactions } from "@/lib/export-utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguageStore } from "@/store/languageStore";
import { UnassignedTransactions } from "./UnassignedTransactions";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";

export default function Finance() {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [activeDialog, setActiveDialog] = useState<"manual" | "spravka" | null>(
    null,
  );

  const pageSize = 10;
  const debouncedSearch = useDebounce(search, 500);
  const normalizedSearch = debouncedSearch.trim().toLowerCase();
  const isSearchingByName = normalizedSearch.length > 0;

  const { data: unassignedData } = useQuery({
    queryKey: ["unassigned-transactions-preview"],
    queryFn: () =>
      transactionService.getUnassignedTransactions({ page: 1, page_size: 5 }),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: [
      "transactions-with-name",
      page,
      debouncedSearch,
      statusFilter,
      sourceFilter,
    ],
    queryFn: () =>
      transactionService.getTransactionsWithName({
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
      }),
    enabled: !isSearchingByName,
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  const { data: searchSourceTransactions, isLoading: isSearchLoading } = useQuery({
    queryKey: [
      "transactions-with-name-local-search",
      normalizedSearch,
      statusFilter,
      sourceFilter,
    ],
    queryFn: async () => {
      const firstPage = await transactionService.getTransactionsWithName({
        page: 1,
        page_size: 100,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
      });

      const pages = firstPage.meta?.total_pages || 1;
      const restPages =
        pages > 1
          ? await Promise.all(
              Array.from({ length: pages - 1 }, (_, idx) =>
                transactionService.getTransactionsWithName({
                  page: idx + 2,
                  page_size: 100,
                  status: statusFilter || undefined,
                  source: sourceFilter || undefined,
                }),
              ),
            )
          : [];

      return [
        ...(firstPage.data || []),
        ...restPages.flatMap((response) => response.data || []),
      ];
    },
    enabled: isSearchingByName,
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  const { data: transactionStatisticsData } = useQuery({
    queryKey: ["transaction-statistics"],
    queryFn: () => transactionService.getTransactionStatistics(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const filteredTransactions = useMemo(() => {
    if (!isSearchingByName) {
      return transactionsData?.data ?? [];
    }

    return (searchSourceTransactions || []).filter((transaction) => {
      const studentName = (transaction.student_full_name || "").toLowerCase();
      const externalId = (transaction.external_id || "").toLowerCase();
      const transactionId = String(transaction.id);

      return (
        studentName.includes(normalizedSearch) ||
        externalId.includes(normalizedSearch) ||
        transactionId.includes(normalizedSearch)
      );
    });
  }, [
    isSearchingByName,
    transactionsData?.data,
    searchSourceTransactions,
    normalizedSearch,
  ]);

  const transactions = useMemo(() => {
    if (!isSearchingByName) {
      return filteredTransactions;
    }

    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [isSearchingByName, filteredTransactions, page, pageSize]);

  const totalItems = isSearchingByName
    ? filteredTransactions.length
    : (transactionsData?.meta?.total ?? 0);

  const totalPages = isSearchingByName
    ? Math.max(1, Math.ceil(totalItems / pageSize))
    : (transactionsData?.meta?.total_pages ?? 1);

  const isTableLoading = isSearchingByName ? isSearchLoading : isLoading;

  const displayedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (a, b) =>
          new Date(b.paid_at || 0).getTime() - new Date(a.paid_at || 0).getTime(),
      ),
    [transactions],
  );

  const cancelMutation = useMutation({
    mutationFn: (id: number) => transactionService.cancelTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions-with-name"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["finance-report"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-summary"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-transactions"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["transaction-statistics"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["student-full-info"],
        refetchType: "all",
      });
      toast.success(t("transactionCancelled"));
    },
    onError: () => toast.error(t("failedToCancelTransaction")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => transactionService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions-with-name"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["finance-report"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-summary"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-transactions"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["transaction-statistics"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["student-full-info"],
        refetchType: "all",
      });
      toast.success(t("transactionDeleted"));
    },
    onError: () => toast.error(t("failedToDeleteTransaction")),
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSourceFilter("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter || sourceFilter);

  const handleExport = async () => {
    const promise = (async () => {
      if (isSearchingByName) {
        if (filteredTransactions.length === 0) {
          throw new Error("NO_DATA");
        }

        exportTransactions(filteredTransactions);
        return;
      }

      const firstPage = await transactionService.getTransactionsWithName({
        page: 1,
        page_size: 100,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
      });

      if (!firstPage.data || firstPage.data.length === 0) {
        throw new Error("NO_DATA");
      }

      const pages = firstPage.meta?.total_pages || 1;
      const rest = await Promise.all(
        Array.from({ length: Math.max(pages - 1, 0) }, (_, idx) =>
          transactionService.getTransactionsWithName({
            page: idx + 2,
            page_size: 100,
            status: statusFilter || undefined,
            source: sourceFilter || undefined,
          }),
        ),
      );

      const all = [...firstPage.data, ...rest.flatMap((r) => r.data || [])];
      exportTransactions(all);
    })();

    toast.promise(promise, {
      loading: t("exportingData"),
      success: t("transactionsExported"),
      error: (error: Error) =>
        error.message === "NO_DATA"
          ? t("noDataToExport")
          : t("failedToExportTransactions"),
    });
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants: Record<
      string,
      { icon: React.ElementType; bg: string; text: string }
    > = {
      success: {
        icon: CheckCircle,
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
      },
      pending: {
        icon: Clock,
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-400",
      },
      failed: {
        icon: AlertTriangle,
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
      },
      cancelled: {
        icon: Ban,
        bg: "bg-gray-100 dark:bg-gray-900/30",
        text: "text-gray-700 dark:text-gray-400",
      },
      unassigned: {
        icon: AlertTriangle,
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
      },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0 gap-1`}>
        <variant.icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const formatSource = (source: TransactionSource) => {
    const clean = source?.toString().replace(/^.*\./, "").toLowerCase() || "";
    const sourceMap: Record<string, string> = {
      bank: t("bank"),
      payme: t("payme"),
      click: t("click"),
      manual: t("manual"),
    };
    return sourceMap[clean] || (clean.charAt(0).toUpperCase() + clean.slice(1));
  };

  const formatCurrency = (amount: number) =>
    formatCurrencyUtil(amount, "UZS", "uz-UZ", false);

  const formatPaymentMonths = (months: number[] | null | undefined) => {
    if (!months || months.length === 0) return "-";
    const monthNames = [
      t("january") || "Jan",
      t("february") || "Feb",
      t("march") || "Mar",
      t("april") || "Apr",
      t("may") || "May",
      t("june") || "Jun",
      t("july") || "Jul",
      t("august") || "Aug",
      t("september") || "Sep",
      t("october") || "Oct",
      t("november") || "Nov",
      t("december") || "Dec",
    ];
    return [...months]
      .sort((a, b) => a - b)
      .map((m) => monthNames[m - 1] || m)
      .join(", ");
  };

  const stats = transactionStatisticsData?.data;
  const unassignedCount = unassignedData?.meta?.total || 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("finance")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("manageTransactions")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t("export")}</span>
          </Button>
          <Button
            type="button"
            onClick={() => setActiveDialog("manual")}
            className="gap-2"
          >
            <Plus className="w-6 h-6" />
            <span className="hidden sm:inline">{t("addTransaction")}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setActiveDialog("spravka")}
            className="gap-2"
          >
            <Plus className="w-6 h-6" />
            <span className="hidden sm:inline">{t("addSpravka")}</span>
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <StatsCard
          title={t("totalDueAmount") || "Total Due"}
          value={formatCurrency(stats?.total_paid || 0)}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatsCard
          title={t("successful")}
          value={String(stats?.successful_transactions || 0)}
          icon={<CheckCircle className="w-6 h-6" />}
        />
        <StatsCard
          title="Payme tx"
          value={String(stats?.payme_transactions || 0)}
          icon={<CreditCard className="w-6 h-6" />}
        />
        <StatsCard
          title="Click tx"
          value={String(stats?.click_transactions || 0)}
          icon={<CreditCard className="w-6 h-6" />}
        />
        <StatsCard
          title={`${t("bank")} tx`}
          value={String(stats?.bank_transactions || 0)}
          icon={<CreditCard className="w-6 h-6" />}
        />
        <StatsCard
          title={t("unassigned")}
          value={unassignedCount.toString()}
          icon={<AlertTriangle className="w-6 h-6" />}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchByStudentId") || "Search by name..."}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-36"
                >
                  <option value="">{t("allStatuses")}</option>
                  <option value="success">{t("successful")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="failed">{t("failed")}</option>
                  <option value="cancelled">{t("cancelled")}</option>
                  <option value="unassigned">{t("unassigned")}</option>
                </Select>
                <Select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-32"
                >
                  <option value="">{t("allSources")}</option>
                  <option value="payme">Payme</option>
                  <option value="click">Click</option>
                  <option value="bank">{t("bank")}</option>
                  <option value="manual">{t("manual")}</option>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">{t("transactionsList")}</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("transaction")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("source")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("student")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("paymentMonth") || "Payment Month"}
                </TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("date")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-36 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">
                        Transaksiyalar yuklanmoqda...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedTransactions.length > 0 ? (
                displayedTransactions.map((transaction, idx) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <p className="font-medium text-foreground text-sm">
                        {(page - 1) * pageSize + idx + 1}
                      </p>
                    </TableCell>
                    <TableCell>
                      {transaction.external_id && (
                        <p className="text-xs text-muted-foreground">
                          {transaction.external_id.substring(0, 20)}...
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{formatSource(transaction.source)}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {transaction.student_full_name ? (
                        <button
                          onClick={() => {
                            if (transaction.student_id) {
                              navigate(`/students/${transaction.student_id}`);
                            }
                          }}
                          disabled={!transaction.student_id}
                          className={`text-sm ${
                            transaction.student_id
                              ? "cursor-pointer text-blue-600 dark:text-blue-400 hover:underline"
                              : "text-muted-foreground cursor-not-allowed"
                          }`}
                        >
                          {transaction.student_full_name}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t("unassigned")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatPaymentMonths(transaction.payment_months)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(transaction.paid_at || 0), "MMM d, yyyy HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {transaction.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate(transaction.id)}
                            disabled={cancelMutation.isPending}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(transaction.id)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty
                  icon={<CreditCard className="w-12 h-12" />}
                  title={t("noTransactionsFound")}
                  description={
                    hasActiveFilters ? t("adjustFilters") : t("transactionsWillAppear")
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        {t("clearFilters")}
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          onClick={() => setActiveDialog("manual")}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("addTransaction")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setActiveDialog("spravka")}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("addSpravka")}
                        </Button>
                      </div>
                    )
                  }
                />
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <UnassignedTransactions />
      </motion.div>

      <TransactionDialog
        open={activeDialog === "manual"}
        onOpenChange={(open) => setActiveDialog(open ? "manual" : null)}
        mode="manual"
      />
      <TransactionDialog
        open={activeDialog === "spravka"}
        onOpenChange={(open) => setActiveDialog(open ? "spravka" : null)}
        mode="spravka"
      />
    </div>
  );
}
