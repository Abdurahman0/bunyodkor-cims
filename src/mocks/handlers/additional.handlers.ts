import { http, HttpResponse } from 'msw'

const API_URL = import.meta.env.VITE_API_URL || ''

// Dashboard Summary
const dashboardSummary = {
  today_revenue: 2500000,
  active_students: 156,
  total_debtors: 23,
  today_sessions: 8,
}

// Contracts mock data
const contracts = [
  { id: 1, contract_number: 'CTR-001', start_date: '2024-01-01', end_date: '2024-12-31', monthly_fee: 500000, status: 'active', student_id: 1, created_at: '2024-01-01T00:00:00Z' },
  { id: 2, contract_number: 'CTR-002', start_date: '2024-02-01', end_date: '2025-01-31', monthly_fee: 600000, status: 'active', student_id: 2, created_at: '2024-02-01T00:00:00Z' },
  { id: 3, contract_number: 'CTR-003', start_date: '2023-06-01', end_date: '2024-05-31', monthly_fee: 450000, status: 'expired', student_id: 3, created_at: '2023-06-01T00:00:00Z' },
]

// Gate logs mock data
const gateLogs = [
  { id: 1, allowed: true, reason: 'Valid pass', gate_timestamp: new Date().toISOString(), student_id: 1, created_at: new Date().toISOString() },
  { id: 2, allowed: false, reason: 'Has outstanding debt', gate_timestamp: new Date(Date.now() - 3600000).toISOString(), student_id: 2, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, allowed: true, reason: 'Valid pass', gate_timestamp: new Date(Date.now() - 7200000).toISOString(), student_id: 3, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, allowed: true, reason: 'Valid pass', gate_timestamp: new Date(Date.now() - 10800000).toISOString(), student_id: 1, created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 5, allowed: false, reason: 'Contract expired', gate_timestamp: new Date(Date.now() - 14400000).toISOString(), student_id: 4, created_at: new Date(Date.now() - 14400000).toISOString() },
]

// Coach sessions mock data
const coachSessions = [
  { id: 1, session_date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:30', group_id: 1, created_at: new Date().toISOString() },
  { id: 2, session_date: new Date().toISOString().split('T')[0], start_time: '11:00', end_time: '12:30', group_id: 2, created_at: new Date().toISOString() },
  { id: 3, session_date: new Date().toISOString().split('T')[0], start_time: '14:00', end_time: '15:30', group_id: 1, created_at: new Date().toISOString() },
]

// Students with debt info
const studentsWithDebt = [
  { student_id: 1, first_name: 'Ali', last_name: 'Karimov', has_debt: false, debt_amount: 0, debt_warning: '' },
  { student_id: 2, first_name: 'Bobur', last_name: 'Rahimov', has_debt: true, debt_amount: 500000, debt_warning: '1 month overdue' },
  { student_id: 3, first_name: 'Sardor', last_name: 'Toshev', has_debt: false, debt_amount: 0, debt_warning: '' },
]

// System settings
const systemSettings = [
  { id: 1, key: 'academy_name', value: 'Bunyodkor Football Academy', description: 'Academy display name', created_at: new Date().toISOString() },
  { id: 2, key: 'timezone', value: 'Asia/Tashkent', description: 'System timezone', created_at: new Date().toISOString() },
  { id: 3, key: 'currency', value: 'UZS', description: 'Default currency', created_at: new Date().toISOString() },
  { id: 4, key: 'payme_enabled', value: 'true', description: 'Enable Payme payments', created_at: new Date().toISOString() },
  { id: 5, key: 'click_enabled', value: 'true', description: 'Enable Click payments', created_at: new Date().toISOString() },
  { id: 6, key: 'gate_enabled', value: 'true', description: 'Enable gate access control', created_at: new Date().toISOString() },
]

// Finance report mock
const financeReport = {
  from_date: '2024-01-01',
  to_date: '2024-12-31',
  total_revenue: 45000000,
  breakdown: [
    { source: 'payme', total_amount: 20000000, transaction_count: 45 },
    { source: 'click', total_amount: 15000000, transaction_count: 32 },
    { source: 'cash', total_amount: 8000000, transaction_count: 18 },
    { source: 'bank', total_amount: 2000000, transaction_count: 5 },
  ],
}

// Attendance report
const groupAttendance = [
  { group_id: 1, group_name: 'U-12 Morning', total_sessions: 24, total_students: 15, attendance_percentage: 85 },
  { group_id: 2, group_name: 'U-14 Afternoon', total_sessions: 20, total_students: 18, attendance_percentage: 78 },
  { group_id: 3, group_name: 'U-16 Evening', total_sessions: 22, total_students: 12, attendance_percentage: 92 },
]

// Debtors
const debtors = [
  { student_id: 2, student_name: 'Bobur Rahimov', contract_number: 'CTR-002', debt_amount: 500000, group_name: 'U-12 Morning' },
  { student_id: 5, student_name: 'Jamshid Aliyev', contract_number: 'CTR-005', debt_amount: 1000000, group_name: 'U-14 Afternoon' },
  { student_id: 8, student_name: 'Ulugbek Saidov', contract_number: 'CTR-008', debt_amount: 250000, group_name: 'U-16 Evening' },
]

export const reportsHandlers = [
  // Dashboard summary
  http.get(`${API_URL}/reports/dashboard/summary`, () => {
    return HttpResponse.json({ data: dashboardSummary, meta: null })
  }),

  // Finance report
  http.get(`${API_URL}/reports/finance`, () => {
    return HttpResponse.json({ data: financeReport, meta: null })
  }),

  // Group attendance
  http.get(`${API_URL}/reports/attendance/groups`, () => {
    return HttpResponse.json({ data: groupAttendance, meta: null })
  }),

  // Student attendance
  http.get(`${API_URL}/reports/attendance/students/:studentId`, ({ params }) => {
    return HttpResponse.json({
      data: {
        student_id: params.studentId,
        student_name: 'Test Student',
        total_sessions: 20,
        present_count: 17,
        absent_count: 2,
        late_count: 1,
        attendance_percentage: 85,
      },
      meta: null,
    })
  }),

  // Debtors
  http.get(`${API_URL}/reports/debtors`, () => {
    return HttpResponse.json({
      data: debtors,
      meta: { page: 1, page_size: 10, total: debtors.length, total_pages: 1 },
    })
  }),
]

export const contractsHandlers = [
  // Get contracts
  http.get(`${API_URL}/contracts`, () => {
    return HttpResponse.json({
      data: contracts,
      meta: { page: 1, page_size: 10, total: contracts.length, total_pages: 1 },
    })
  }),

  // Create contract
  http.post(`${API_URL}/contracts`, async ({ request }) => {
    const body = await request.json() as any
    const newContract = {
      id: contracts.length + 1,
      ...body,
      created_at: new Date().toISOString(),
    }
    contracts.push(newContract)
    return HttpResponse.json({ data: newContract, meta: null })
  }),

  // Update contract
  http.patch(`${API_URL}/contracts/:id`, async ({ params, request }) => {
    const body = await request.json() as any
    const index = contracts.findIndex((c) => c.id === parseInt(params.id as string))
    if (index !== -1) {
      contracts[index] = { ...contracts[index], ...body }
      return HttpResponse.json({ data: contracts[index], meta: null })
    }
    return HttpResponse.json({ detail: 'Contract not found' }, { status: 404 })
  }),
]

export const coachHandlers = [
  // Get coach groups
  http.get(`${API_URL}/coach/groups`, () => {
    return HttpResponse.json({
      data: [
        { id: 1, name: 'U-12 Morning', description: 'Under 12 morning training', schedule_days: 'Mon, Wed, Fri', schedule_time: '09:00-10:30', coach_id: 1, created_at: new Date().toISOString() },
        { id: 2, name: 'U-14 Afternoon', description: 'Under 14 afternoon training', schedule_days: 'Tue, Thu, Sat', schedule_time: '14:00-15:30', coach_id: 1, created_at: new Date().toISOString() },
      ],
      meta: null,
    })
  }),

  // Get coach sessions
  http.get(`${API_URL}/coach/sessions`, () => {
    return HttpResponse.json({ data: coachSessions, meta: null })
  }),

  // Get students with debt info
  http.get(`${API_URL}/coach/sessions/:sessionId/students-with-debt-info`, () => {
    return HttpResponse.json({ data: studentsWithDebt, meta: null })
  }),

  // Mark attendance
  http.post(`${API_URL}/coach/sessions/:sessionId/attendance`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({ data: { success: true, ...body }, meta: null })
  }),
]

export const gateHandlers = [
  // Get gate logs
  http.get(`${API_URL}/gate/logs`, () => {
    return HttpResponse.json({
      data: gateLogs,
      meta: { page: 1, page_size: 15, total: gateLogs.length, total_pages: 1 },
    })
  }),

  // Gate callback
  http.post(`${API_URL}/gate/callback`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      allowed: true,
      reason: 'Valid pass',
      student_id: body.student_id,
    })
  }),
]

export const settingsHandlers = [
  // Get system settings
  http.get(`${API_URL}/settings/system`, () => {
    return HttpResponse.json({ data: systemSettings, meta: null })
  }),

  // Update system settings
  http.patch(`${API_URL}/settings/system`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    Object.entries(body).forEach(([key, value]) => {
      const setting = systemSettings.find((s) => s.key === key)
      if (setting) {
        setting.value = value
      }
    })
    return HttpResponse.json({ data: { success: true }, meta: null })
  }),
]
