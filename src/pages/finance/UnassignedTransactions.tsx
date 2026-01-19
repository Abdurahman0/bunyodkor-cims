import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableEmpty,
} from '@/components/ui/table';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Loader2, Inbox, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

import { transactionService } from '@/services/api.service';
import type { TransactionRead } from '@/types/api';
import { AssignTransactionDialog } from './AssignTransactionDialog';
import { useLanguageStore } from '@/store/languageStore';

export function UnassignedTransactions() {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRead | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['unassigned-transactions', page],
    queryFn: () => transactionService.getUnassignedTransactions({ page, page_size: 10 }),
    staleTime: 0, // Always refetch
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const handleOpenDialog = (transaction: TransactionRead) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  const formatSource = (source: TransactionRead['source']) => {
    // Remove any "Paymentsource." prefix and format properly
    const cleanSource = source?.toString().replace(/^.*\./, '').toLowerCase() || ''
    return cleanSource.charAt(0).toUpperCase() + cleanSource.slice(1)
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('unassignedTransactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table isLoading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('source')}</TableHead>
                <TableHead>{t('externalId')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.paid_at!), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell>{formatSource(transaction.source)}</TableCell>
                    <TableCell className="text-muted-foreground">{transaction.external_id}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleOpenDialog(transaction)}>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {t('assign')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty
                  icon={<Inbox className="w-12 h-12" />}
                  title={t('noUnassignedTransactions')}
                  description={t('allIncomingPaymentsAssigned')}
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
        </CardContent>
      </Card>

      <AssignTransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transaction={selectedTransaction}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['unassigned-transactions'],
            refetchType: "all"
          });
          queryClient.invalidateQueries({
            queryKey: ['transactions'],
            refetchType: "all"
          });
          queryClient.invalidateQueries({
            queryKey: ['all-transactions-stats'],
            refetchType: "all"
          });
        }}
      />
    </>
  );
}
