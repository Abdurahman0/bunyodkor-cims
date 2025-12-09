import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { transactionService, contractService } from '@/services/api.service'
import type { TransactionSource } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguageStore } from '@/store/languageStore'
import { useDebounce } from '@/hooks/useDebounce'
import type { ContractRead } from '@/types/api'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// This interface is for the form state
interface TransactionFormData {
  amount: number
  source: TransactionSource
  contract_number: string
  payment_year: number
  payment_months: string // Input as comma-separated string
  comment?: string
}

export function TransactionDialog({ open, onOpenChange }: TransactionDialogProps) {
  const { t } = useLanguageStore()
  const queryClient = useQueryClient()
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [contractSearch, setContractSearch] = useState('')
  const [showContractDropdown, setShowContractDropdown] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ContractRead | null>(null)

  const debouncedContractSearch = useDebounce(contractSearch, 300)

  const monthNames = [
    t('january'), t('february'), t('march'), t('april'), t('may'), t('june'),
    t('july'), t('august'), t('september'), t('october'), t('november'), t('december')
  ]

  const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Fetch contracts for autocomplete
  const { data: contractsData } = useQuery({
    queryKey: ['contracts-search', debouncedContractSearch],
    queryFn: () =>
      contractService.getContracts({
        page: 1,
        page_size: 10,
        contract_number: debouncedContractSearch || undefined,
      }),
    enabled: debouncedContractSearch.length > 0,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    defaultValues: {
      amount: 0,
      source: 'cash',
      contract_number: '',
      payment_year: new Date().getFullYear(),
      payment_months: '',
    },
  })

  const toggleMonth = (monthNumber: number) => {
    const newSelectedMonths = selectedMonths.includes(monthNumber)
      ? selectedMonths.filter(m => m !== monthNumber)
      : [...selectedMonths, monthNumber].sort((a, b) => a - b)

    setSelectedMonths(newSelectedMonths)
    setValue('payment_months', newSelectedMonths.join(', '))
  }

  const handleContractSelect = (contract: ContractRead) => {
    setSelectedContract(contract)
    setContractSearch(contract.contract_number)
    setValue('contract_number', contract.contract_number)
    setValue('amount', contract.monthly_fee)
    setShowContractDropdown(false)
  }

  useEffect(() => {
    if (contractSearch !== selectedContract?.contract_number) {
      setSelectedContract(null)
    }
  }, [contractSearch, selectedContract])

  useEffect(() => {
    if (!open) {
      setContractSearch('')
      setSelectedContract(null)
      setSelectedMonths([])
    }
  }, [open])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showContractDropdown && !target.closest('.contract-autocomplete')) {
        setShowContractDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showContractDropdown])

  const mutation = useMutation({
    mutationFn: transactionService.createManualTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success(t('transactionCreatedSuccess'))
      reset()
      setSelectedMonths([])
      onOpenChange(false)
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      let errorMessage = t('failedToCreateTransaction')

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || detail[0].message || errorMessage
      } else if (typeof detail === 'string') {
        errorMessage = detail
      }

      toast.error(errorMessage)
    },
  })

  const onSubmit = (data: TransactionFormData) => {
    const paymentMonthsArray = data.payment_months
      .split(',')
      .map(m => parseInt(m.trim()))
      .filter(m => !isNaN(m) && m >= 1 && m <= 12)

    if (paymentMonthsArray.length === 0) {
      toast.error(t('selectAtLeastOneMonth'))
      return
    }

    mutation.mutate({
      amount: data.amount,
      source: data.source,
      contract_number: data.contract_number,
      payment_year: data.payment_year,
      payment_months: paymentMonthsArray,
      comment: data.comment,
      paid_at: new Date().toISOString(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] max-w-[95vw]" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{t('addTransaction')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="amount">{t('amount')} (UZS)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              {...register('amount', {
                required: t('amountRequired'),
                valueAsNumber: true,
                min: { value: 1, message: t('amountMustBeGreaterThanZero') },
              })}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="source">{t('paymentSource')}</Label>
            <Select id="source" {...register('source')}>
              <option value="cash">{t('cash')}</option>
              <option value="bank">{t('bankTransfer')}</option>
              <option value="payme">Payme</option>
              <option value="click">Click</option>
              <option value="manual">{t('manual')}</option>
            </Select>
          </div>

          <div className="space-y-1 relative contract-autocomplete">
            <Label htmlFor="contract_number">{t('contractNumber')}</Label>
            <div className="relative">
              <Input
                id="contract_number"
                placeholder={t('enterContractNumber')}
                value={contractSearch}
                onChange={(e) => {
                  setContractSearch(e.target.value)
                  setValue('contract_number', e.target.value)
                  setShowContractDropdown(true)
                }}
                onFocus={() => setShowContractDropdown(true)}
                autoComplete="off"
              />
              {selectedContract && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>
            {errors.contract_number && (
              <p className="text-sm text-red-500">
                {errors.contract_number.message}
              </p>
            )}

            {/* Autocomplete Dropdown */}
            {showContractDropdown && contractsData?.data && contractsData.data.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                {contractsData.data.map((contract: ContractRead) => (
                  <button
                    key={contract.id}
                    type="button"
                    onClick={() => handleContractSelect(contract)}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{contract.contract_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {contract.student_id ? `Student ID: ${contract.student_id}` : 'No student'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {new Intl.NumberFormat('uz-UZ').format(contract.monthly_fee)} UZS
                        </p>
                        <Badge className={`${
                          contract.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        } border-0 text-xs`}>
                          {contract.status}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="payment_year">{t('paymentYear')}</Label>
            <Input
              id="payment_year"
              type="number"
              placeholder="2025"
              {...register('payment_year', {
                required: t('paymentYearRequired'),
                valueAsNumber: true,
              })}
            />
            {errors.payment_year && (
              <p className="text-sm text-red-500">
                {errors.payment_year.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Label>{t('selectPaymentMonths')} <span className="text-red-500">*</span></Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {monthShortNames.map((month, index) => {
                const monthNumber = index + 1
                const isSelected = selectedMonths.includes(monthNumber)
                return (
                  <button
                    key={monthNumber}
                    type="button"
                    onClick={() => toggleMonth(monthNumber)}
                    className={`relative px-3 py-2.5 text-sm font-medium rounded-full border transition-all w-full min-w-0 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background hover:bg-muted border-input'
                    }`}
                  >
                    <span className="block">{month}</span>
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-md ring-2 ring-background">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <input type="hidden" {...register('payment_months', { required: t('selectAtLeastOneMonth') })} />
            {errors.payment_months && (
              <p className="text-sm text-red-500">{errors.payment_months.message}</p>
            )}
            {selectedMonths.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground font-medium">{t('selected')}:</span>
                {selectedMonths.map(month => (
                  <Badge key={month} variant="secondary" className="gap-1 px-3 py-1.5 text-sm">
                    {monthNames[month - 1]}
                    <button
                      type="button"
                      onClick={() => toggleMonth(month)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="comment">{t('comment')} ({t('optional')})</Label>
            <Input
              id="comment"
              placeholder={t('monthlyPayment')}
              {...register('comment')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
