/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
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
import { StatsCard } from "@/components/ui/charts";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  TrendingUp,
  CreditCard,
  X,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Ban,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { transactionService } from "@/services/api.service";
import type {
  TransactionWithNameRead,
  TransactionRead,
  TransactionStatus,
  TransactionSource,
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sourceFilter]);

  const { data, isLoading } = useQuery({
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
        page_size: 10,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
      }),
    staleTime: 0, // Always refetch
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: unassignedData } = useQuery({
    queryKey: ["unassigned-transactions"],
    queryFn: () =>
      transactionService.getUnassignedTransactions({ page: 1, page_size: 5 }),
    staleTime: 0, // Always refetch
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Separate query for all transactions to calculate accurate statistics
  const { data: allTransactionsData } = useQuery({
    queryKey: ["all-transactions-stats"],
    queryFn: async () => {
      // Fetch all transactions by making multiple requests if needed
      let allTransactions: TransactionRead[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await transactionService.getTransactions({
          page: currentPage,
          page_size: 100, // Backend maximum is 100
        });

        if (response.data && response.data.length > 0) {
          allTransactions = [...allTransactions, ...response.data];

          // Check if there are more pages
          if (response.meta && currentPage < response.meta.total_pages) {
            currentPage++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      return { data: allTransactions, meta: { total: allTransactions.length } };
    },
    staleTime: 0, // Always refetch
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => transactionService.cancelTransaction(id),
    onSuccess: () => {
      // Invalidate AND refetch finance section queries
      queryClient.invalidateQueries({
        queryKey: ["transactions-with-name"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["all-transactions-stats"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["finance-report"],
        refetchType: "all",
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({
        queryKey: ["dashboard-summary"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-transactions"],
        refetchType: "all",
      });

      // Invalidate student detail page queries (all students)
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
      // Invalidate AND refetch finance section queries
      queryClient.invalidateQueries({
        queryKey: ["transactions-with-name"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["all-transactions-stats"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["finance-report"],
        refetchType: "all",
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({
        queryKey: ["dashboard-summary"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-transactions"],
        refetchType: "all",
      });

      // Invalidate student detail page queries (all students)
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
  };

  const hasActiveFilters = search || statusFilter || sourceFilter;

  const handleExport = async () => {
    try {
      const allItems: TransactionWithNameRead[] = [];
      let pageNum = 1;
      let totalPages = 1;

      while (pageNum <= totalPages) {
        const params: any = { page: pageNum, page_size: 100 };
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        if (sourceFilter) params.source = sourceFilter;

        const resp = await transactionService.getTransactionsWithName(params);
        if (resp && Array.isArray(resp.data)) {
          allItems.push(...resp.data);
        }

        if (resp && resp.meta && resp.meta.total_pages) {
          totalPages = resp.meta.total_pages;
        } else {
          totalPages = 1;
        }

        pageNum++;
      }

      if (allItems.length === 0) {
        toast.error(t("noDataToExport"));
        return;
      }

      exportTransactions(allItems);
      toast.success(t("transactionsExported"));
    } catch (error) {
      toast.error(t("failedToExportTransactions"));
    }
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
    const variant = variants[status!] || variants.pending;
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0 gap-1`}>
        {variant.icon && <variant.icon className="w-3 h-3" />}
        {status}
      </Badge>
    );
  };

  const getSourceIcon = (source: TransactionSource) => {
    const icons: Record<string, string> = {
      payme: "💳",
      click: "📱",
      bank: "🏦",
      cash: "💵",
      manual: "✍️",
    };
    return icons[source!] || "💰";
  };

  const formatSource = (source: TransactionSource) => {
    // Remove any "Paymentsource." prefix and format properly
    const cleanSource =
      source?.toString().replace(/^.*\./, "").toLowerCase() || "";
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1);
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, "UZS", "uz-UZ", false);
  };

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
    return months
      .sort((a, b) => a - b)
      .map((m) => monthNames[m - 1] || m)
      .join(", ");
  };

  // Calculate statistics from ALL transactions, not just current page
  const totalRevenue =
    allTransactionsData?.data
      ?.filter((t) => t.status === "success")
      .reduce((acc, t) => acc + t.amount, 0) || 0;
  const pendingAmount =
    allTransactionsData?.data
      ?.filter((t) => t.status === "pending")
      .reduce((acc, t) => acc + t.amount, 0) || 0;
  const successCount =
    allTransactionsData?.data?.filter((t) => t.status === "success").length ||
    0;
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
          <p className="text-muted-foreground mt-1">
            {t("manageTransactions")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t("export")}</span>
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-6 h-6" />
            <span className="hidden sm:inline">{t("addTransaction")}</span>
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          title={t("totalRevenue")}
          value={formatCurrency(totalRevenue)}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatsCard
          title={t("pendingAmount")}
          value={formatCurrency(pendingAmount)}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatsCard
          title={t("successful")}
          value={successCount.toString()}
          icon={<CheckCircle className="w-6 h-6" />}
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full sm:w-32"
                >
                  <option value="">{t("allSources")}</option>
                  <option value="payme">Payme</option>
                  <option value="click">Click</option>
                  <option value="bank">{t("bank")}</option>
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
          <Table isLoading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("transaction")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("source")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("student")}
                </TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("paymentMonth") || "Payment Month"}
                </TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("date")}
                </TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                (() => {
                  const displayed = [...data.data].sort(
                    (a: TransactionWithNameRead, b: TransactionWithNameRead) =>
                      new Date(b.paid_at!).getTime() -
                      new Date(a.paid_at!).getTime(),
                  );
                  return displayed.map((transaction, idx) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <p className="font-medium text-foreground text-sm">
                          {(page - 1) * 10 + idx + 1}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {getSourceIcon(transaction.source)}
                          </div>
                          <div>
                            {transaction.external_id && (
                              <p className="text-xs text-muted-foreground">
                                {transaction.external_id.substring(0, 20)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {formatSource(transaction.source)}
                        </Badge>
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
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {format(
                            new Date(transaction.paid_at!),
                            "MMM d, yyyy HH:mm",
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {transaction.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                cancelMutation.mutate(transaction.id)
                              }
                              disabled={cancelMutation.isPending}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deleteMutation.mutate(transaction.id)
                            }
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })()
              ) : (
                <TableEmpty
                  icon={<CreditCard className="w-12 h-12" />}
                  title={t("noTransactionsFound")}
                  description={
                    hasActiveFilters
                      ? t("adjustFilters")
                      : t("transactionsWillAppear")
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        {t("clearFilters")}
                      </Button>
                    ) : (
                      <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("addTransaction")}
                      </Button>
                    )
                  }
                />
              )}
            </TableBody>
          </Table>
          {data?.meta && data.meta.total_pages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={data.meta.total_pages}
              totalItems={data.meta.total}
              pageSize={10}
              onPageChange={setPage}
            />
          )}
        </Card>
      </motion.div>

      {/* Unassigned Transactions Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <UnassignedTransactions />
      </motion.div>

      <TransactionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
