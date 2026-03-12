import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publicService } from "@/services/api.service";
import type { ContractInfoPublic } from "@/types/api";
import { format } from "date-fns";
import { formatNameParts } from "@/lib/name-utils";

export default function PublicContractCheck() {
  const [contractNumber, setContractNumber] = useState("");
  const [result, setResult] = useState<ContractInfoPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: (number: string) => publicService.getContractInfo(number),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: () => {
      setResult(null);
      setError(
        "Shartnoma topilmadi yoki xatolik yuz berdi. Raqamni tekshirib qayta urining."
      );
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNumber.trim()) return;
    searchMutation.mutate(contractNumber);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-2">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Shartnomani Tekshirish
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Bunyodkor Akademiyasi shartnoma holatini tekshirish uchun shartnoma
            raqamini kiriting.
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Masalan: BFA-2025-001"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={searchMutation.isPending || !contractNumber}
              >
                {searchMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                Tekshirish
              </Button>
            </form>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-3 border border-red-200 dark:border-red-900"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="overflow-hidden border-t-4 border-t-green-500">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        {formatNameParts(
                          result.student_last_name,
                          result.student_first_name,
                        )}
                      </CardTitle>
                      <CardDescription>
                        Shartnoma: {result.contract_number}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200 px-3 py-1"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Aktiv
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Oylik To'lov
                      </p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(result.monthly_fee)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Joriy Qarz
                      </p>
                      <p
                        className={`font-semibold text-lg ${
                          result.current_debt > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(result.current_debt)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Davr:</span>
                      <span className="font-medium">
                        {format(new Date(result.start_date), "dd.MM.yyyy")} -{" "}
                        {format(new Date(result.end_date), "dd.MM.yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Oxirgi to'lov:
                      </span>
                      <span className="font-medium">
                        {result.last_payment_date
                          ? format(
                              new Date(result.last_payment_date),
                              "dd.MM.yyyy"
                            )
                          : "Mavjud emas"}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-4 text-xs text-center text-muted-foreground">
                  Agar ma'lumotlarda xatolik bo'lsa, iltimos akademiya
                  ma'muriyatiga murojaat qiling.
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
