/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type SetStateAction,
  type JSXElementConstructor,
  type Key,
  type ReactElement,
  type ReactNode,
  type ReactPortal,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import {
  coachService,
  groupService,
  reportService,
  studentService,
} from "@/services/api.service";
import type {
  GroupRead,
  SessionRead,
  AttendanceCreateRequest,
  DebtorItem,
  ContractRead,
} from "@/types/api";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Upload,
  History,
  GraduationCap,
  List,
  BarChart2,
  MapPin,
  AlignLeft,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { toast } from "react-hot-toast";
import { useLanguageStore } from "@/store/languageStore";
import { Badge } from "@/components/ui/badge";
import { DonutChart, StatsCard } from "@/components/ui/charts";
import {
  formatGroupSelectLabel,
  formatNameParts,
  formatPersonName,
} from "@/lib/name-utils";
import { formatCurrency, formatNumber } from "@/lib/format-utils";

const normalizeSessionForUi = (
  session:
    | (Partial<SessionRead> & {
        notes?: string | null;
        comment?: string | null;
        location?: string | null;
      })
    | null
    | undefined,
) => {
  if (!session) return null;

  const normalizedDescription =
    session.description ?? session.notes ?? session.comment ?? "";
  const normalizedStation = session.station ?? session.location ?? "";

  return {
    ...session,
    description: normalizedDescription,
    station: normalizedStation,
    location: session.location ?? normalizedStation,
  } as SessionRead;
};

const getDebtMonthLocale = (language: string) =>
  language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ";

type FormattedOverdueMonth = {
  key: string;
  label: string;
  amount: number;
  sortValue: number;
};

const getOverdueMonthDate = (
  year?: number | null,
  month?: number | null,
) => {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !year ||
    !month ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, 1));
};

const capitalizeLabel = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const getStudentId = (item: any) =>
  Number(item?.student_id ?? item?.id ?? item?.student?.id ?? 0);

const fetchAllGroupContracts = async (
  groupId: number,
  status: ContractRead["status"],
) => {
  const firstPage = await groupService.getGroupContracts(groupId, {
    status,
    page: 1,
    page_size: 100,
  });

  const totalPages = firstPage.meta?.total_pages || 1;
  const restPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, idx) =>
            groupService.getGroupContracts(groupId, {
              status,
              page: idx + 2,
              page_size: 100,
            }),
          ),
        )
      : [];

  return [
    ...(firstPage.data || []),
    ...restPages.flatMap((page) => page.data || []),
  ];
};

const parseOverdueMonthLabel = (rawLabel: string) => {
  const normalized = rawLabel.trim();
  if (!normalized) return null;

  const dashedMatch = normalized.match(/^(\d{4})-(\d{1,2})$/);
  if (dashedMatch) {
    return {
      year: Number(dashedMatch[1]),
      month: Number(dashedMatch[2]),
    };
  }

  const spacedMatch = normalized.match(/^(\d{4})\s*M?(\d{1,2})$/i);
  if (spacedMatch) {
    return {
      year: Number(spacedMatch[1]),
      month: Number(spacedMatch[2]),
    };
  }

  const monthOnlyMatch = normalized.match(/^M(\d{1,2})$/i);
  if (monthOnlyMatch) {
    const m = Number(monthOnlyMatch[1]);
    if (m >= 1 && m <= 12) {
      return {
        year: new Date().getFullYear(),
        month: m,
      };
    }
  }

  return null;
};

const formatOverdueMonths = (
  overdueMonths: DebtorItem["overdue_months"] | undefined,
  locale: string,
) => {
  const parsedMonths = (overdueMonths || []).map((overdueMonth, index) => {
    const monthFromFields = getOverdueMonthDate(
      overdueMonth.year,
      overdueMonth.month,
    );

    if (monthFromFields) {
      return {
        key: `${overdueMonth.year}-${String(overdueMonth.month).padStart(2, "0")}`,
        date: monthFromFields,
        amount: Number(overdueMonth.amount) || 0,
        sortValue: Number(overdueMonth.year) * 100 + Number(overdueMonth.month),
        fallbackLabel: overdueMonth.label?.trim() || "",
      };
    }

    const rawLabel = overdueMonth.label?.trim() || "";
    const parsedLabel = parseOverdueMonthLabel(rawLabel);
    if (parsedLabel) {
      const monthFromLabel = getOverdueMonthDate(
        parsedLabel.year,
        parsedLabel.month,
      );

      if (monthFromLabel) {
        return {
          key: `${parsedLabel.year}-${String(parsedLabel.month).padStart(2, "0")}`,
          date: monthFromLabel,
          amount: Number(overdueMonth.amount) || 0,
          sortValue: parsedLabel.year * 100 + parsedLabel.month,
          fallbackLabel: rawLabel,
        };
      }
    }

    return {
      key: rawLabel || `overdue-${index}`,
      date: null,
      amount: Number(overdueMonth.amount) || 0,
      sortValue: Number.MAX_SAFE_INTEGER - (overdueMonths?.length || 0) + index,
      fallbackLabel: rawLabel,
    };
  });

  const uzMonths = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];

  const formatter = new Intl.DateTimeFormat(locale, {
    month: "long",
  });

  const formatMonth = (date: Date) => {
    if (locale.startsWith("uz")) return uzMonths[date.getMonth()];
    return formatter.format(date);
  };

  const monthMap = new Map<string, FormattedOverdueMonth>();

  parsedMonths.forEach((item) => {
    const label = item.date
      ? capitalizeLabel(formatMonth(item.date))
      : capitalizeLabel(item.fallbackLabel);

    if (!label) return;

    const existing = monthMap.get(item.key);

    monthMap.set(item.key, {
      key: item.key,
      label,
      amount: (existing?.amount || 0) + item.amount,
      sortValue: Math.min(existing?.sortValue ?? item.sortValue, item.sortValue),
    });
  });

  return Array.from(monthMap.values()).sort(
    (a, b) => a.sortValue - b.sortValue,
  );
};

export default function CoachPanel() {
  const { t, language } = useLanguageStore();
  const queryClient = useQueryClient();
  const debtLocale = useMemo(() => getDebtMonthLocale(language), [language]);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(
    null,
  );
  const [selectedGroupForStats, setSelectedGroupForStats] = useState<
    string | null
  >(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupRead | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<number, "present" | "absent" | "late">
  >({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSession(null);
    setAttendanceStatus({});
  }, [selectedDate]);

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["coach-groups"],
    queryFn: () => coachService.getCoachGroups(),
    select: (res) => {
      if (!res) return [];
      if (Array.isArray((res as any).data)) return (res as any).data;
      return (res as any).data?.data || (res as any).data || [];
    },
  });

  const { data: allStudents, isLoading: allStudentsLoading } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => studentService.getStudents({ page_size: 10000 }),
    select: (res) => {
      if (!res) return [];
      if (Array.isArray((res as any).data)) return (res as any).data;
      return (res as any).data?.data || (res as any).data || [];
    },
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["coach-sessions", selectedDate],
    queryFn: () => coachService.getCoachSessions({ date: selectedDate }),
    select: (res) => {
      if (!res) return [];
      const rawSessions = Array.isArray((res as any).data)
        ? (res as any).data
        : (res as any).data?.data || (res as any).data || [];
      if (!Array.isArray(rawSessions)) return [];
      return rawSessions
        .map((session) => normalizeSessionForUi(session))
        .filter(Boolean) as SessionRead[];
    },
  });

  const { data: allSessions, isLoading: allSessionsLoading } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: () => coachService.getCoachSessions({}),
    select: (res) => {
      if (!res) return [];
      const rawSessions = Array.isArray((res as any).data)
        ? (res as any).data
        : (res as any).data?.data || (res as any).data || [];
      if (!Array.isArray(rawSessions)) return [];
      return rawSessions
        .map((session) => normalizeSessionForUi(session))
        .filter(Boolean) as SessionRead[];
    },
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["session-students", selectedSession?.id],
    queryFn: () => {
      if (!selectedSession) return null;
      return coachService
        .getSessionStudentsWithDebt(selectedSession.id)
        .then((res) => res.data);
    },
    enabled: !!selectedSession,
  });

  const {
    data: sessionActiveContracts = [],
    isLoading: sessionActiveContractsLoading,
  } = useQuery({
    queryKey: ["session-group-contracts", selectedSession?.group_id, "active"],
    queryFn: () => {
      if (!selectedSession?.group_id) return Promise.resolve([]);
      return fetchAllGroupContracts(selectedSession.group_id, "active");
    },
    enabled: !!selectedSession?.group_id,
  });

  const { data: groupStudentsData, isLoading: groupStudentsLoading } = useQuery(
    {
      queryKey: ["group-students", selectedGroup?.id],
      queryFn: () => {
        if (!selectedGroup) return Promise.resolve({ data: [] });
        return groupService.getGroupStudents(selectedGroup.id);
      },
      select: (res: any) => res.data,
      enabled: !!selectedGroup,
    },
  );

  const { data: groupContractsData, isLoading: groupContractsLoading } =
    useQuery({
      queryKey: ["group-contracts", selectedGroup?.id],
      queryFn: () =>
        selectedGroup
          ? fetchAllGroupContracts(selectedGroup.id, "active")
          : Promise.resolve([]),
      enabled: !!selectedGroup,
    });

  const { data: groupDebtorsData, isLoading: groupDebtorsLoading } = useQuery({
    queryKey: ["group-debtors", selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];

      const firstPage = await reportService.getDebtorsReport({
        group_id: selectedGroup.id,
        page: 1,
        page_size: 100,
      });

      const totalPages = firstPage.meta?.total_pages || 1;
      const restPages =
        totalPages > 1
          ? await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, idx) =>
                reportService.getDebtorsReport({
                  group_id: selectedGroup.id,
                  page: idx + 2,
                  page_size: 100,
                }),
              ),
            )
          : [];

      return [
        ...(firstPage.data || []),
        ...restPages.flatMap((page) => page.data || []),
      ];
    },
    enabled: !!selectedGroup,
  });

  // Build parent phone map from debtors report (primary_phone/father_phone/mother_phone)
  // and fall back to student.phone (typically the parent contact in youth academies)
  const groupParentPhonesMap = useMemo(() => {
    const map: Record<number, string[]> = {};

    console.log("[PHONES] groupDebtorsData sample:", (groupDebtorsData || []).slice(0, 2));
    console.log("[PHONES] groupStudentsData sample:", (groupStudentsData || []).slice(0, 2));

    // First: populate from debtors report which carries explicit parent phone fields
    (groupDebtorsData || []).forEach((debtor: any) => {
      const sid = Number(debtor.student_id);
      if (!sid) return;
      const phones = [
        debtor.primary_phone,
        debtor.father_phone,
        debtor.mother_phone,
      ]
        .map((p: any) => String(p || "").trim())
        .filter(Boolean);
      if (phones.length > 0) map[sid] = phones;
    });

    // Second: for students not covered by debtors, use student.phone as fallback
    (groupStudentsData || []).forEach((s: any) => {
      const sid = Number(s?.id ?? s?.student_id ?? 0);
      if (!sid || map[sid]) return;
      const phone = String(s?.phone || "").trim();
      if (phone) map[sid] = [phone];
    });

    console.log("[PHONES] final map:", map);
    return map;
  }, [groupDebtorsData, groupStudentsData]);

  const { data: myAttendancesData, isLoading: myAttendancesLoading } = useQuery(
    {
      queryKey: ["my-attendances"],
      queryFn: () => coachService.getMyAttendances({}),
      select: (res: any) => res.data,
    },
  );

  const historyStudentIds = useMemo(() => {
    if (!Array.isArray(myAttendancesData)) return [];

    return Array.from(
      new Set(
        myAttendancesData
          .map((attendance: any) => Number(attendance?.student_id))
          .filter((studentId: number) => Number.isFinite(studentId) && studentId > 0),
      ),
    );
  }, [myAttendancesData]);

  const historySessionIds = useMemo(() => {
    if (!Array.isArray(myAttendancesData)) return [];

    return Array.from(
      new Set(
        myAttendancesData
          .map((attendance: any) => Number(attendance?.session_id))
          .filter((sessionId: number) => Number.isFinite(sessionId) && sessionId > 0),
      ),
    );
  }, [myAttendancesData]);

  const { data: historyStudents, isLoading: historyStudentsLoading } = useQuery({
    queryKey: ["history-students", historyStudentIds],
    queryFn: async () => {
      if (historyStudentIds.length === 0) return [];

      const responses = await Promise.allSettled(
        historyStudentIds.map((studentId) => studentService.getStudent(studentId)),
      );

      return responses
        .filter(
          (
            response,
          ): response is PromiseFulfilledResult<{ data?: any } | any> =>
            response.status === "fulfilled",
        )
        .map((response) => response.value?.data ?? response.value)
        .filter(Boolean);
    },
    enabled: historyStudentIds.length > 0,
  });

  const { data: historySessions, isLoading: historySessionsLoading } = useQuery({
    queryKey: ["history-sessions", historySessionIds],
    queryFn: async () => {
      if (historySessionIds.length === 0) return [];

      const responses = await Promise.allSettled(
        historySessionIds.map((sessionId) => coachService.getSessionDetails(sessionId)),
      );

      return responses
        .filter(
          (
            response,
          ): response is PromiseFulfilledResult<{ data?: any } | any> =>
            response.status === "fulfilled",
        )
        .map((response) =>
          normalizeSessionForUi(response.value?.data ?? response.value),
        )
        .filter(Boolean) as SessionRead[];
    },
    enabled: historySessionIds.length > 0,
  });

  const { data: groupStats, isLoading: groupStatsLoading } = useQuery({
    queryKey: ["group-stats", selectedGroupForStats],
    queryFn: () => {
      if (!selectedGroupForStats) return null;
      return coachService.getGroupAttendanceStats(
        Number(selectedGroupForStats),
      );
    },
    enabled: !!selectedGroupForStats,
    select: (res) => res?.data,
  });

  const bulkAttendanceMutation = useMutation({
    mutationFn: (data: {
      session_id: number;
      attendances: AttendanceCreateRequest[];
    }) => coachService.bulkAttendance(data),
    onSuccess: () => {
      toast.success(
        t("attendanceSubmittedSuccessfully") ||
          "Attendance submitted successfully",
      );
      setAttendanceStatus({});
      queryClient.invalidateQueries({
        queryKey: ["session-students", selectedSession?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["my-attendances"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail ||
          t("failedToSubmitAttendance") ||
          "Failed to submit attendance",
      );
    },
  });

  const uploadKonspektMutation = useMutation({
    mutationFn: ({ sessionId, file }: { sessionId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return coachService.uploadKonspekt(sessionId, formData);
    },
    onSuccess: () => {
      toast.success(t("konspektUploaded") || "Konspekt uploaded successfully!");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({
        queryKey: ["coach-sessions", selectedDate],
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail ||
          t("errorUploadingKonspekt") ||
          "Error uploading konspekt",
      );
    },
  });

  const handleDateChange = (days: number) => {
    const newDate =
      days > 0
        ? addDays(new Date(selectedDate), days)
        : subDays(new Date(selectedDate), Math.abs(days));
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const handleSessionSelect = async (session: SessionRead) => {
    const normalizedSession = normalizeSessionForUi(session) || session;
    setSelectedSession(normalizedSession);

    try {
      const response = await coachService.getSessionDetails(session.id);

      const rawSession =
        (response as { data?: Partial<SessionRead> }).data &&
        typeof (response as { data?: Partial<SessionRead> }).data === "object"
          ? (response as { data?: Partial<SessionRead> }).data
          : (response as Partial<SessionRead>);

      const normalizedDetails = normalizeSessionForUi(rawSession);
      if (normalizedDetails) {
        setSelectedSession((prev) => {
          if (!prev || prev.id !== session.id) return prev;
          return { ...prev, ...normalizedDetails };
        });
      }
    } catch {
      // Keep list payload as fallback if details endpoint fails.
    }
  };

  const handleMarkAttendance = (
    studentId: number,
    status: "present" | "absent" | "late",
  ) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmitAttendance = () => {
    if (!selectedSession || Object.keys(attendanceStatus).length === 0) {
      toast.error(
        t("noAttendanceChangesToSubmit") || "No attendance changes to submit",
      );
      return;
    }
    const attendances: AttendanceCreateRequest[] = Object.entries(
      attendanceStatus,
    ).map(([student_id, status]) => ({
      student_id: parseInt(student_id, 10),
      status,
      comment: "",
    }));
    bulkAttendanceMutation.mutate({
      session_id: selectedSession.id,
      attendances,
    });
  };

  const handleUploadKonspekt = () => {
    if (!selectedSession || !selectedFile) {
      toast.error(t("pleaseSelectFile") || "Please select a file");
      return;
    }
    uploadKonspektMutation.mutate({
      sessionId: selectedSession.id,
      file: selectedFile,
    });
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: "present" | "absent" | "late") => {
    switch (status) {
      case "present":
        return (
          <Badge variant="default" className="bg-green-500">
            {t("present")}
          </Badge>
        );
      case "absent":
        return <Badge variant="destructive">{t("absent")}</Badge>;
      case "late":
        return <Badge variant="secondary">{t("late")}</Badge>;
      default:
        return null;
    }
  };

  const studentMap = useMemo(() => {
    const mergedStudents = [...(allStudents || []), ...(historyStudents || [])];

    if (mergedStudents.length === 0) return new Map<number, any>();

    return new Map(
      mergedStudents.map((student: { id: any }) => [Number(student.id), student]),
    );
  }, [allStudents, historyStudents]);

  const sessionMap = useMemo(() => {
    const mergedSessions = [...(allSessions || []), ...(historySessions || [])];

    if (mergedSessions.length === 0) return new Map<number, any>();

    return new Map(
      mergedSessions.map((session: { id: any }) => [Number(session.id), session]),
    );
  }, [allSessions, historySessions]);

  const groupMap = useMemo(() => {
    if (!groupsData) return new Map<number, any>();
    return new Map(
      groupsData.map((group: { id: any }) => [Number(group.id), group]),
    );
  }, [groupsData]);

  const contractsByStudentId = useMemo(() => {
    const contractMap = new Map<number, string>();

    if (!groupContractsData) {
      return contractMap;
    }

    groupContractsData.forEach((contract) => {
      if (!contractMap.has(contract.student_id)) {
        contractMap.set(contract.student_id, contract.contract_number);
      }
    });

    return contractMap;
  }, [groupContractsData]);

  const debtorsByStudentId = useMemo(() => {
    const debtorMap = new Map<
      number,
      {
        debtAmount: number;
        contractNumber: string;
        overdueMonths: FormattedOverdueMonth[];
      }
    >();

    if (!groupDebtorsData) {
      return debtorMap;
    }

    groupDebtorsData.forEach((debtor) => {
      const existingDebtor = debtorMap.get(debtor.student_id);

      debtorMap.set(debtor.student_id, {
        debtAmount:
          (existingDebtor?.debtAmount || 0) + (Number(debtor.debt_amount) || 0),
        contractNumber: existingDebtor?.contractNumber || debtor.contract_number,
        overdueMonths: formatOverdueMonths(
          [
            ...(existingDebtor?.overdueMonths || []).map((month) => ({
              label: month.key,
              amount: month.amount,
            })),
            ...(debtor.overdue_months || []),
          ],
          debtLocale,
        ),
      });
    });

    return debtorMap;
  }, [debtLocale, groupDebtorsData]);

  const getStudentNameValue = (item: any) => {
    if (!item) return "";

    return (
      formatPersonName(item) ||
      formatPersonName(item.student) ||
      formatNameParts(item?.student_last_name, item?.student_first_name) ||
      item.student_full_name ||
      item.student_name ||
      item.name ||
      item.student?.name ||
      ""
    );
  };

  const getStudentDisplayName = (item: any) => {
    const displayName = getStudentNameValue(item);

    if (displayName) {
      return displayName;
    }

    const studentId = getStudentId(item);
    if (studentId) return `#${studentId}`;
    return t("unknownStudent") || "Unknown Student";
  };

  const getStudentDebtAmount = (item: any) => {
    const studentId = getStudentId(item);
    const debtorInfo = debtorsByStudentId.get(studentId);
    const debtAmount =
      debtorInfo?.debtAmount ??
      item?.current_debt ??
      item?.debt_amount ??
      item?.student?.current_debt ??
      item?.student?.debt_amount ??
      0;

    return Number(debtAmount) || 0;
  };

  const getStudentOverdueMonths = (item: any) => {
    const studentId = getStudentId(item);
    const directOverdueMonths = formatOverdueMonths(
      item?.overdue_months ?? item?.student?.overdue_months,
      debtLocale,
    );

    if (directOverdueMonths.length > 0) {
      return directOverdueMonths;
    }

    return debtorsByStudentId.get(studentId)?.overdueMonths ?? [];
  };

  const getStudentContractNumber = (item: any) => {
    const studentId = getStudentId(item);

    return (
      item?.contract_number ??
      item?.student?.contract_number ??
      debtorsByStudentId.get(studentId)?.contractNumber ??
      contractsByStudentId.get(studentId) ??
      "-"
    );
  };

  const getStudentBirthYear = (item: any) => {
    const rawBirthValue =
      item?.birth_year ??
      item?.student?.birth_year ??
      item?.date_of_birth ??
      item?.student?.date_of_birth;

    if (typeof rawBirthValue === "number") {
      return String(rawBirthValue);
    }

    if (typeof rawBirthValue === "string") {
      const trimmedBirthValue = rawBirthValue.trim();

      if (/^\d{4}$/.test(trimmedBirthValue)) {
        return trimmedBirthValue;
      }

      const birthDate = new Date(trimmedBirthValue);
      if (!Number.isNaN(birthDate.getTime())) {
        return format(birthDate, "yyyy");
      }
    }

    return "-";
  };

  const sessionActiveStudentIds = useMemo(
    () =>
      new Set(
        sessionActiveContracts
          .map((contract) => Number(contract.student_id))
          .filter((studentId) => Number.isFinite(studentId) && studentId > 0),
      ),
    [sessionActiveContracts],
  );

  const visibleSessionStudents = useMemo(() => {
    if (!Array.isArray(studentsData)) return [];
    if (!selectedSession?.group_id) return studentsData;

    return studentsData.filter((student) =>
      sessionActiveStudentIds.has(getStudentId(student)),
    );
  }, [selectedSession?.group_id, sessionActiveStudentIds, studentsData]);

  const groupActiveStudentIds = useMemo(
    () =>
      new Set(
        (groupContractsData || [])
          .map((contract) => Number(contract.student_id))
          .filter((studentId) => Number.isFinite(studentId) && studentId > 0),
      ),
    [groupContractsData],
  );

  const groupStudentRows = (groupStudentsData || [])
    .filter((student: any) => groupActiveStudentIds.has(getStudentId(student)))
    .map((student: any) => {
      const sid = getStudentId(student) || student.id;
      return {
        id: sid,
        firstName: student?.first_name ?? student?.student?.first_name ?? "-",
        lastName: student?.last_name ?? student?.student?.last_name ?? "-",
        contractNumber: getStudentContractNumber(student),
        debtAmount: getStudentDebtAmount(student),
        overdueMonths: getStudentOverdueMonths(student),
        birthYear: getStudentBirthYear(student),
        parentPhones: (groupParentPhonesMap as Record<number, string[]>)[sid] ?? [],
      };
    })
    .sort((a: any, b: any) => {
      const aNum = String(a.contractNumber ?? "");
      const bNum = String(b.contractNumber ?? "");
      return aNum.localeCompare(bNum, undefined, { numeric: true });
    });

  const isGroupStudentsTableLoading =
    groupStudentsLoading || groupContractsLoading || groupDebtorsLoading;
  const isSessionStudentsLoading =
    studentsLoading || sessionActiveContractsLoading;

  const getSessionGroupName = (session: SessionRead | null | undefined) => {
    if (!session) return t("unknownGroup") || "Unknown Group";

    return (
      session.group_name ||
      session.group?.name ||
      groupMap.get(Number(session.group_id))?.name ||
      t("unknownGroup") ||
      "Unknown Group"
    );
  };

  const getAttendanceStudentName = (attendance: any) => {
    const student =
      attendance?.student ??
      studentMap.get(Number(attendance?.student_id ?? attendance?.student?.id));

    const directName =
      getStudentNameValue(student) || getStudentNameValue(attendance);

    if (directName) {
      return directName;
    }

    const studentId = getStudentId(student ?? attendance);
    if (studentId) {
      return `#${studentId}`;
    }

    return t("unknownStudent") || "Unknown Student";
  };

  const getAttendanceGroupName = (attendance: any) => {
    const session =
      attendance?.session ??
      sessionMap.get(Number(attendance?.session_id ?? attendance?.session?.id));

    const directGroupName =
      attendance?.group_name ||
      attendance?.group?.name ||
      session?.group_name ||
      session?.group?.name;

    if (directGroupName) {
      return directGroupName;
    }

    const groupId = Number(
      attendance?.group_id ??
        attendance?.group?.id ??
        session?.group_id ??
        session?.group?.id,
    );

    if (groupId) {
      return groupMap.get(groupId)?.name || t("unknownGroup") || "Unknown Group";
    }

    return t("unknownGroup") || "Unknown Group";
  };

  const renderAttendanceActions = (studentId: number) => (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <Button
        size="sm"
        variant={attendanceStatus[studentId] === "present" ? "default" : "outline"}
        className="rounded-r-none"
        onClick={() => handleMarkAttendance(studentId, "present")}
      >
        <CheckCircle className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant={attendanceStatus[studentId] === "late" ? "secondary" : "outline"}
        className="rounded-none"
        onClick={() => handleMarkAttendance(studentId, "late")}
      >
        <Clock className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant={attendanceStatus[studentId] === "absent" ? "destructive" : "outline"}
        className="rounded-l-none"
        onClick={() => handleMarkAttendance(studentId, "absent")}
      >
        <XCircle className="w-4 h-4" />
      </Button>
    </div>
  );

  const groupStatsChartData = useMemo(() => {
    if (!groupStats) return [];
    return [
      {
        label: t("present"),
        value: groupStats.present_count,
        color: "hsl(142, 71%, 45%)",
      },
      {
        label: t("absent"),
        value: groupStats.absent_count,
        color: "hsl(0, 84%, 60%)",
      },
      {
        label: t("late"),
        value: groupStats.late_count,
        color: "hsl(48, 96%, 53%)",
      },
    ];
  }, [groupStats, t]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t("coachPanel") || "Coach Panel"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("manageSessionsAndAttendance") ||
            "Manage your sessions and student attendance."}
        </p>
      </motion.div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 sm:grid-cols-4">
          <TabsTrigger value="attendance" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            {t("attendance") || "Attendance"}
          </TabsTrigger>
          <TabsTrigger value="groups" className="w-full">
            <GraduationCap className="w-4 h-4 mr-2" />
            {t("myGroups") || "My Groups"}
          </TabsTrigger>
          <TabsTrigger value="history" className="w-full">
            <History className="w-4 h-4 mr-2" />
            {t("history") || "History"}
          </TabsTrigger>
          <TabsTrigger value="stats" className="w-full">
            <BarChart2 className="w-4 h-4 mr-2" />
            {t("statistics") || "Statistics"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDateChange(-1)}
                  className="shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border bg-background px-3 py-2">
                  <Calendar className="w-5 h-5 shrink-0 text-muted-foreground" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-center text-foreground outline-none"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDateChange(1)}
                  className="shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Card className="lg:col-span-1 h-full">
              <CardHeader>
                <CardTitle>
                  {format(new Date(selectedDate), "MMMM d, yyyy")}
                </CardTitle>
                <CardDescription>
                  {t("todaysSessions") || "Today's training sessions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : sessionsData && sessionsData.length > 0 ? (
                  <div className="space-y-3">
                    {sessionsData.map(
                      (session: SetStateAction<SessionRead | null> | any) => {
                        return (
                          <button
                            key={session.id}
                            onClick={() => void handleSessionSelect(session)}
                            className={`w-full text-left p-4 rounded-lg border transition-all ${
                              selectedSession?.id === session.id
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-start justify-between">
                                <p className="font-bold text-slate-900 dark:text-slate-100">
                                  {getSessionGroupName(session)}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {session.topic || "-"}
                              </p>
                              {session.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                                  {session.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono font-medium">
                                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  {session.start_time} - {session.end_time}
                                </span>
                              {(session.location || session.station) && (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {session.location || session.station}
                                </span>
                              )}
                              </div>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p>
                      {t("noSessionsForDate") || "No sessions for this date."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedSession ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <List className="w-5 h-5" />
                            {t("attendanceList") || "Attendance List"}
                          </CardTitle>
                          <CardDescription className="mt-3 space-y-3">
                            <div className="flex flex-col gap-2 text-base font-medium text-slate-800 dark:text-slate-200 [&>span:nth-child(2)]:hidden sm:flex-row sm:flex-wrap sm:items-center sm:[&>span:nth-child(2)]:inline">
                              <span className="break-words">
                                {selectedSession.topic || "-"}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span>{getSessionGroupName(selectedSession)}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                              <span className="flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                <Clock className="w-4 h-4" />
                                {selectedSession.start_time} -{" "}
                                {selectedSession.end_time}
                              </span>
                              {(selectedSession.location ||
                                selectedSession.station) && (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                                  <MapPin className="w-4 h-4" />
                                  {selectedSession.location ||
                                    selectedSession.station}
                                </span>
                              )}
                            </div>

                            {selectedSession.description && (
                              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                {selectedSession.description}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUploadDialogOpen(true)}
                          className="w-full sm:w-auto"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t("uploadKonspekt") || "Upload Konspekt"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isSessionStudentsLoading ? (
                        <div className="flex h-24 items-center justify-center rounded-lg border">
                          <Loader2 className="animate-spin text-primary" />
                        </div>
                      ) : visibleSessionStudents.length > 0 ? (
                        <>
                          <div className="space-y-3 md:hidden">
                            {visibleSessionStudents.map((student: any) => {
                              const studentId = getStudentId(student);

                              return (
                                <div
                                  key={studentId}
                                  className="rounded-xl border bg-card p-4 shadow-sm"
                                >
                                  <div className="flex flex-col gap-3">
                                    <p className="font-semibold text-foreground">
                                      {getStudentDisplayName(student)}
                                    </p>
                                    <div>{renderAttendanceActions(studentId)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="pl-6">
                                    {t("student")}
                                  </TableHead>
                                  <TableHead className="w-[1%] whitespace-nowrap pr-6 [&>div]:justify-end">
                                    {t("markAttendance")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {visibleSessionStudents.map((student: any) => {
                                  const studentId = getStudentId(student);

                                  return (
                                    <TableRow key={studentId}>
                                      <TableCell className="w-full pl-6 font-medium">
                                        {getStudentDisplayName(student)}
                                      </TableCell>
                                      <TableCell className="pr-6">
                                        <div className="flex justify-end">
                                          {renderAttendanceActions(studentId)}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-lg border text-center text-sm text-muted-foreground">
                          {t("noStudentsInSession") ||
                            "No students in this session."}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button
                        onClick={handleSubmitAttendance}
                        disabled={bulkAttendanceMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {bulkAttendanceMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {t("submitAttendance") || "Submit Attendance"}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-full">
                  <Users className="w-12 h-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {t("selectSession")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("selectSessionToViewStudents") ||
                      "Select a session from the list to view students and mark attendance."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="groups">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Card className="lg:col-span-1 h-full">
              <CardHeader>
                <CardTitle>{t("myGroups")}</CardTitle>
                <CardDescription>{t("groupsAssignedToYou")}</CardDescription>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : groupsData && groupsData.length > 0 ? (
                  <div className="space-y-3">
                    {groupsData.map(
                      (group: SetStateAction<GroupRead | null> | any) => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroup(group)}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedGroup?.id === group.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <p className="font-semibold">{group.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {group.schedule_days} {group.schedule_time}
                          </p>
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p>{t("noGroupsAssigned")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedGroup ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedGroup.name}</CardTitle>
                      <CardDescription>{t("studentsInGroup")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table className="min-w-[960px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[220px]">
                                {t("fullName")}
                              </TableHead>
                              <TableHead className="w-[120px] whitespace-nowrap">
                                {t("birthYear")}
                              </TableHead>
                              <TableHead className="w-[160px] whitespace-nowrap">
                                {t("contractNumber")}
                              </TableHead>
                              <TableHead className="w-[200px] whitespace-nowrap">
                                {t("parentPhone") || "Ota-ona telefon"}
                              </TableHead>
                              <TableHead className="w-[260px] whitespace-nowrap">
                                {t("indebtedness")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isGroupStudentsTableLoading ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="h-24 text-center"
                                >
                                  <Loader2 className="mx-auto animate-spin text-primary" />
                                </TableCell>
                              </TableRow>
                            ) : groupStudentRows.length > 0 ? (
                              groupStudentRows.map((student: any) => (
                                <TableRow key={student.id}>
                                  <TableCell className="font-medium align-top">
                                    {student.lastName} {student.firstName}
                                  </TableCell>
                                  <TableCell className="align-top whitespace-nowrap">
                                    {student.birthYear}
                                  </TableCell>
                                  <TableCell className="align-top whitespace-nowrap">
                                    {student.contractNumber}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    {student.parentPhones.length > 0 ? (
                                      <div className="flex flex-col gap-1 py-1">
                                        {student.parentPhones.map((phone: string) => (
                                          <span key={phone} className="text-sm font-medium whitespace-nowrap">
                                            {phone}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    {student.debtAmount > 0 ? (
                                      <div className="flex max-w-[260px] flex-col gap-1 py-2">
                                        {student.overdueMonths.length > 0 ? (
                                          <div className="text-sm font-medium leading-snug text-foreground">
                                            {student.overdueMonths
                                              .map((overdueMonth: FormattedOverdueMonth) => overdueMonth.label)
                                              .join(", ")}
                                          </div>
                                        ) : null}
                                        <div className="whitespace-nowrap text-sm font-semibold text-red-600">
                                          {formatNumber(student.debtAmount, debtLocale)}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex max-w-[260px] flex-col gap-1 py-2">
                                        <div className="text-sm font-medium text-foreground">
                                          {t("noDebt")}
                                        </div>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="h-24 text-center"
                                >
                                  {t("noStudentsInGroup")}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-full">
                  <GraduationCap className="w-12 h-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {t("selectGroup")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("selectGroupToViewStudents")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t("attendanceHistory")}</CardTitle>
              <CardDescription>
                {t("allAttendancesMarkedByYou")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("student")}</TableHead>
                    <TableHead>{t("group")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAttendancesLoading ||
                  allStudentsLoading ||
                  allSessionsLoading ||
                  historyStudentsLoading ||
                  historySessionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="mx-auto animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : myAttendancesData && myAttendancesData.length > 0 ? (
                    myAttendancesData.map((attendance: any) => {
                      return (
                        <TableRow key={attendance.id}>
                          <TableCell>
                            {format(
                              new Date(attendance.created_at),
                              "dd.MM.yyyy HH:mm",
                            )}
                          </TableCell>
                          <TableCell>{getAttendanceStudentName(attendance)}</TableCell>
                          <TableCell>{getAttendanceGroupName(attendance)}</TableCell>
                          <TableCell>
                            {getStatusBadge(attendance.status)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        {t("noAttendanceHistory")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics")}</CardTitle>
                <CardDescription>{t("selectGroupToSeeStats")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedGroupForStats || ""}
                  onChange={(e) => {
                    setSelectedGroupForStats(e.target.value);
                  }}
                >
                  <option value="" disabled>
                    {t("selectGroup")}
                  </option>
                  {Array.isArray(groupsData) && (groupsData as any[]).map(
                    (group: {
                      id: Key | null | undefined;
                      name: ReactNode;
                    }) => (
                      <option
                        key={group.id}
                        value={(group.id as any).toString()}
                      >
                        {formatGroupSelectLabel(group as any)}
                      </option>
                    ),
                  )}
                </Select>
              </CardContent>
            </Card>

            {groupStatsLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-primary" />
              </div>
            )}

            {groupStats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {groupMap.get(Number(selectedGroupForStats))?.name} -{" "}
                      {t("groupAttendance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DonutChart
                      data={groupStatsChartData}
                      centerLabel={t("attendanceRate")}
                      centerValue={`${groupStats.attendance_rate}%`}
                    />
                    <div className="space-y-4">
                      <StatsCard
                        title={t("totalSessions")}
                        value={groupStats.total_sessions}
                      />
                      <StatsCard
                        title={t("present")}
                        value={groupStats.present_count}
                      />
                      <StatsCard
                        title={t("absent")}
                        value={groupStats.absent_count}
                      />
                      <StatsCard
                        title={t("late")}
                        value={groupStats.late_count}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open && !uploadKonspektMutation.isPending) {
            clearSelectedFile();
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/70 dark:bg-slate-900/40">
            <DialogTitle>{t("uploadKonspekt")}</DialogTitle>
            <DialogDescription className="mt-1">
              {t("uploadKonspektDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            {selectedSession && (
              <div className="rounded-lg border bg-slate-50/60 dark:bg-slate-900/30 p-4 space-y-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedSession.topic || t("attendanceList")}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {getSessionGroupName(selectedSession)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedSession.start_time} - {selectedSession.end_time}
                  </span>
                  {(selectedSession.location || selectedSession.station) && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedSession.location || selectedSession.station}
                    </span>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              id="konspekt-file-upload"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />

            <label
              htmlFor="konspekt-file-upload"
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                selectedFile
                  ? "border-primary/40 bg-primary/5"
                  : "border-slate-300 dark:border-slate-700 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900/20"
              }`}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {selectedFile
                  ? "Fayl tanlandi"
                  : "PDF yoki DOC faylni tanlang"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Klik qiling va faylni yuklang (PDF, DOC, DOCX)
              </p>
            </label>

            {selectedFile ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(selectedFile.size)}
                    {selectedFile.type ? ` • ${selectedFile.type}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={clearSelectedFile}
                  disabled={uploadKonspektMutation.isPending}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/20 p-3 text-xs text-slate-600 dark:text-slate-400">
                Konspekt fayli darsga biriktiriladi va keyin ko'rish/yuklab olish
                uchun saqlanadi.
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-slate-50/70 dark:bg-slate-900/40">
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploadKonspektMutation.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleUploadKonspekt}
              disabled={!selectedFile || uploadKonspektMutation.isPending}
              className="min-w-28"
            >
              {uploadKonspektMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("upload") || "Yuklash"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {t("upload") || "Yuklash"}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
