/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Archive as ArchiveIcon,
  RotateCcw,
  FileX,
  AlertTriangle,
  Loader2,
  Calendar,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import { archiveService } from "@/services/api.service";
import type { ContractRead } from "@/types/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguageStore } from "@/store/languageStore";

export default function Archive() {
  const { t } = useLanguageStore();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [activeTab, setActiveTab] = useState("stats");

  // Arxiv statistikasi
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["archive-stats", selectedYear],
    queryFn: () => archiveService.getArchiveStats(selectedYear),
  });

  // Bekor qilingan shartnomalar
  const { data: terminatedData, isLoading: isTerminatedLoading } = useQuery({
    queryKey: ["terminated-contracts", selectedYear],
    queryFn: () => archiveService.getTerminatedContracts(selectedYear),
    enabled: activeTab === "terminated",
  });

  // Arxivlash mutatsiyasi
  const archiveMutation = useMutation({
    mutationFn: (year: number) => archiveService.archiveYear(year),
    onSuccess: () => {
      toast.success(
        `${selectedYear} yil ma'lumotlari muvaffaqiyatli arxivlandi`
      );
      queryClient.invalidateQueries({ queryKey: ["archive-stats"] });
    },
    onError: () => toast.error("Arxivlashda xatolik yuz berdi"),
  });

  // Arxivdan chiqarish mutatsiyasi
  const unarchiveMutation = useMutation({
    mutationFn: (year: number) => archiveService.unarchiveYear(year),
    onSuccess: () => {
      toast.success(`${selectedYear} yil ma'lumotlari arxivdan chiqarildi`);
      queryClient.invalidateQueries({ queryKey: ["archive-stats"] });
    },
    onError: () => toast.error("Arxivdan chiqarishda xatolik yuz berdi"),
  });

  const handleArchive = () => {
    if (
      confirm(
        `DIQQAT! ${selectedYear} yil uchun barcha ma'lumotlar arxivlanadi. Davom etasizmi?`
      )
    ) {
      archiveMutation.mutate(selectedYear);
    }
  };

  const handleUnarchive = () => {
    if (
      confirm(
        `${selectedYear} yil ma'lumotlarini arxivdan qaytarishni xohlaysizmi?`
      )
    ) {
      unarchiveMutation.mutate(selectedYear);
    }
  };

  // Safe access to stats data with default values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = statsData?.data || {
    active_count: 0,
    archived_count: 0,
    total: 0,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("Archive" as any) || "Arxiv"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Yillik ma'lumotlarni arxivlash va boshqarish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <Input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-32"
            min={2000}
            max={2100}
          />
        </div>
      </motion.div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="stats" className="gap-2">
            <ArchiveIcon className="w-4 h-4" />
            Statistika va Boshqaruv
          </TabsTrigger>
          <TabsTrigger value="terminated" className="gap-2">
            <FileX className="w-4 h-4" />
            Bekor qilingan shartnomalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Statistika Kartalari */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Jami Ma'lumotlar</CardTitle>
                <CardDescription>{selectedYear} yil uchun</CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <div className="text-3xl font-bold">{stats.total || 0}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-600">
                  Faol (Arxivlanmagan)
                </CardTitle>
                <CardDescription>Hozirgi aktiv ma'lumotlar</CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <div className="text-3xl font-bold text-green-600">
                    {stats.active_count || 0}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-orange-600">
                  Arxivlangan
                </CardTitle>
                <CardDescription>Arxivdagi ma'lumotlar</CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <div className="text-3xl font-bold text-orange-600">
                    {stats.archived_count || 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Boshqaruv Paneli */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Arxivlash Amallari</CardTitle>
              <CardDescription>
                Ushbu amallar {selectedYear} yilga tegishli barcha guruhlar,
                talabalar va shartnomalarga ta'sir qiladi.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                onClick={handleArchive}
                disabled={archiveMutation.isPending || stats.active_count === 0}
                className="gap-2 bg-orange-600 hover:bg-orange-700"
              >
                {archiveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArchiveIcon className="w-4 h-4" />
                )}
                Yilni Arxivlash
              </Button>

              <Button
                onClick={handleUnarchive}
                variant="outline"
                disabled={
                  unarchiveMutation.isPending || stats.archived_count === 0
                }
                className="gap-2 border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                {unarchiveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Arxivdan Chiqarish
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terminated">
          <Card>
            <CardHeader>
              <CardTitle>
                Bekor Qilingan Shartnomalar ({selectedYear})
              </CardTitle>
              <div className="relative max-w-sm mt-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Qidirish..." className="pl-8" />
              </div>
            </CardHeader>
            <CardContent>
              <Table isLoading={isTerminatedLoading}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shartnoma №</TableHead>
                    <TableHead>Talaba ID</TableHead>
                    <TableHead>Bekor Qilingan Sana</TableHead>
                    <TableHead>Sabab</TableHead>
                    <TableHead>Kim Tomonidan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminatedData?.data && terminatedData.data.length > 0 ? (
                    terminatedData.data.map((contract: ContractRead) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          {contract.contract_number}
                        </TableCell>
                        <TableCell>{contract.student_id}</TableCell>
                        <TableCell>
                          {contract.terminated_at
                            ? format(
                                new Date(contract.terminated_at),
                                "dd.MM.yyyy HH:mm"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={contract.termination_reason || ""}
                        >
                          {contract.termination_reason ||
                            "Sabab ko'rsatilmagan"}
                        </TableCell>
                        <TableCell>
                          {contract.terminated_by?.full_name ||
                            `ID: ${contract.terminated_by_user_id}`}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableEmpty
                      icon={
                        <AlertTriangle className="w-12 h-12 text-yellow-500" />
                      }
                      title="Ma'lumot topilmadi"
                      description={`${selectedYear} yilda bekor qilingan shartnomalar yo'q.`}
                    />
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
