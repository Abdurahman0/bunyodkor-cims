// Generated from Swagger/OpenAPI specification
// DO NOT EDIT MANUALLY - This file is auto-generated

// ============================================================================
// Common Types
// ============================================================================

export interface ApiMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta | null;
}

export interface ValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginRequest {
  phone_or_email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  phone: string;
  email: string;
  full_name: string;
  password: string;
}

export interface CurrentUserResponse {
  user: UserWithRoles;
  permissions: string[];
}

// ============================================================================
// User Types
// ============================================================================

export type UserStatus = "active" | "inactive";

export interface UserBase {
  phone: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  status: UserStatus;
}

export interface UserRead extends UserBase {
  id: number;
  created_at: string;
  roles: RoleRead[];
}

export interface UserWithRoles extends UserBase {
  id: number;
  created_at: string;
  roles: RoleWithPermissions[];
}

export interface UserWithGroups extends UserBase {
  id: number;
  created_at: string;
  groups: GroupRead[];
}

export interface UserCreateRequest {
  phone: string;
  email: string;
  full_name: string;
  password: string;
  is_super_admin?: boolean;
  status?: UserStatus;
}

export interface UserUpdateRequest {
  phone?: string;
  email?: string;
  full_name?: string;
  password?: string;
  status?: UserStatus;
}

export interface UpdateUserRolesRequest {
  role_ids: number[];
}

// ============================================================================
// Role & Permission Types
// ============================================================================

export interface PermissionRead {
  id: number;
  code: string;
  description: string;
  created_at: string;
}

export interface RoleRead {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface RoleWithPermissions extends RoleRead {
  permissions: PermissionRead[];
}

export interface RoleCreateRequest {
  name: string;
  description: string;
  permission_ids: number[];
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string;
  permission_ids?: number[];
}

// ============================================================================
// Student Types
// ============================================================================

export type StudentStatus = "active" | "graduated" | "dropped" | "suspended";

export interface StudentRead {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
  photo_url: string | null;
  face_id: string | null;
  status: StudentStatus;
  group_id: number | null;
  created_at: string;
}

export interface StudentCreateRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
  photo_url?: string | null;
  face_id?: string | null;
  status?: StudentStatus;
  group_id?: number | null;
}

export interface StudentUpdateRequest {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  photo_url?: string | null;
  face_id?: string | null;
  status?: StudentStatus;
  group_id?: number | null;
}

export interface StudentWithDebtInfo {
  student_id: number;
  first_name: string;
  last_name: string;
  has_debt: boolean;
  debt_amount: number;
  debt_warning: string | null;
}

export interface UnpaidStudentInfo {
  student: StudentRead;
  total_expected: number;
  total_paid: number;
  debt_amount: number;
  active_contracts_count: number;
}

export interface StudentFullInfo {
  student: StudentRead;
  parents: ParentRead[];
  contracts: ContractRead[];
  group: GroupRead | null;
  coach: UserRead | null;
  transactions: TransactionRead[];
  attendances: AttendanceRead[];
}

// ============================================================================
// Parent Types
// ============================================================================

export interface ParentRead {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  relationship_type: string;
  student_id: number;
  created_at: string;
}

export interface ParentCreateRequest {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  relationship_type: string;
  student_id: number;
}

export interface ParentUpdateRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  relationship_type?: string;
}

// ============================================================================
// Group Types
// ============================================================================

export interface GroupRead {
  id: number;
  name: string;
  birth_year: number;
  description: string;
  schedule_days: string;
  schedule_time: string;
  capacity: number;
  coach_id: number;
  created_at: string;
  active_students_count: number;
  waiting_list_count: number;
}

export interface GroupCreateRequest {
  name: string;
  birth_year: number;
  description: string;
  schedule_days: string;
  schedule_time: string;
  capacity: number;
  coach_id: number;
}

export interface GroupUpdateRequest {
  name?: string;
  birth_year?: number;
  description?: string;
  schedule_days?: string;
  schedule_time?: string;
  capacity?: number;
  coach_id?: number;
}

export interface GroupCapacityInfo {
  group_id: number;
  group_name: string;
  capacity: number;
  active_contracts: number;
  available_slots: number;
  waiting_list_count: number;
  by_birth_year: Record<string, { used: number; available: number }>;
}

// ============================================================================
// Contract Types
// ============================================================================

export type ContractStatus =
  | "active"
  | "pending"
  | "expired"
  | "cancelled"
  | "terminated"
  | "completed";

export interface TerminatedByUser {
  id: number;
  full_name: string;
}

export interface ContractRead {
  id: number;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_fee: number;
  status: ContractStatus;
  student_id: number;
  group_id: number;
  birth_year: number;
  sequence_number: number;
  passport_copy_url: string | null;
  form_086_url: string | null;
  heart_checkup_url: string | null;
  birth_certificate_url: string | null;
  contract_images_urls: string | null;
  final_pdf_url: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_fields: any | null;
  terminated_at: string | null;
  terminated_by_user_id: number | null;
  termination_reason: string | null;
  terminated_by: TerminatedByUser | null;
  created_at: string;
}

export interface ContractCreateRequest {
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_fee: number;
  status?: ContractStatus;
  student_id: number;
}

export interface ContractUpdateRequest {
  start_date?: string;
  end_date?: string;
  monthly_fee?: number;
  status?: ContractStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_fields?: any;
}

export interface ContractTerminateRequest {
  termination_reason: string;
  terminated_at: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

export type TransactionSource = "payme" | "click" | "bank" | "cash" | "manual";
export type TransactionStatus =
  | "pending"
  | "success"
  | "failed"
  | "cancelled"
  | "unassigned";

export interface TransactionRead {
  id: number;
  external_id: string | null;
  amount: number;
  source: TransactionSource;
  status: TransactionStatus;
  paid_at: string;
  comment: string | null;
  payment_year: number | null;
  payment_months: number[];
  student_id: number | null;
  contract_id: number | null;
  created_by_user_id: number | null;
  created_at: string;
}

export interface ManualTransactionCreateRequest {
  amount: number;
  source: TransactionSource;
  contract_number: string;
  payment_year: number;
  payment_months: number[];
  comment?: string | null;
  paid_at?: string;
}

export interface AssignTransactionRequest {
  student_id: number;
  contract_id: number;
}

// ============================================================================
// Attendance Types
// ============================================================================

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRead {
  id: number;
  status: AttendanceStatus;
  comment: string | null;
  session_id: number;
  student_id: number;
  marked_by_user_id: number;
  created_at: string;
}

export interface AttendanceCreateRequest {
  student_id: number;
  status: AttendanceStatus;
  comment?: string | null;
}

export interface AttendanceUpdateRequest {
  status: AttendanceStatus;
  comment?: string | null;
}

export interface BulkAttendanceCreateRequest {
  session_id: number;
  attendances: AttendanceCreateRequest[];
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionRead {
  id: number;
  session_date: string;
  topic: string;
  start_time: string;
  end_time: string;
  group_id: number;
  created_by_user_id: number;
  created_at: string;
}

export interface SessionWithAttendances extends SessionRead {
  attendances: AttendanceRead[];
}

export interface SessionCreateRequest {
  session_date: string;
  topic: string;
  start_time: string;
  end_time: string;
  group_id: number;
}

// ============================================================================
// Gate Types
// ============================================================================

export interface GateLogRead {
  id: number;
  allowed: boolean;
  reason: string | null;
  gate_timestamp: string;
  student_id: number;
  created_at: string;
}

export interface GateCallbackRequest {
  student_id: number;
  face_id: string;
}

export interface GateCallbackResponse {
  allowed: boolean;
  reason: string | null;
  student_id: number;
}

// ============================================================================
// Report Types
// ============================================================================

export interface DashboardSummary {
  today_revenue: number;
  active_students: number;
  total_debtors: number;
  today_sessions: number;
}

export interface FinanceReportBreakdown {
  source: string;
  total_amount: number;
  transaction_count: number;
}

export interface FinanceReport {
  from_date: string;
  to_date: string;
  total_revenue: number;
  breakdown: FinanceReportBreakdown[];
}

export interface GroupAttendanceReport {
  group_id: number;
  group_name: string;
  total_sessions: number;
  total_students: number;
  attendance_percentage: number;
}

export interface StudentAttendanceReport {
  student_id: number;
  student_name: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_percentage: number;
}

export interface DebtorItem {
  student_id: number;
  student_name: string;
  contract_number: string;
  debt_amount: number;
  group_name: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface SystemSettingsRead {
  id: number;
  key: string;
  value: string;
  description: string;
  created_at: string;
}

export interface SystemSettingsUpdateRequest {
  [key: string]: string;
}

// ============================================================================
// Public Types
// ============================================================================

export interface ContractInfoPublic {
  contract_number: string;
  student_first_name: string;
  student_last_name: string;
  monthly_fee: number;
  start_date: string;
  end_date: string;
  current_debt: number;
  last_payment_date: string | null;
}

export interface InitiatePaymentRequest {
  contract_number: string;
  amount: number;
}

// ============================================================================
// Import Types
// ============================================================================

export interface ImportResultResponse {
  message: string;
  success_count: number;
  error_count: number;
}

// ============================================================================
// Waiting List Types
// ============================================================================

export interface WaitingListRead {
  id: number;
  student_first_name: string;
  student_last_name: string;
  birth_year: number;
  father_name: string;
  father_phone: string;
  mother_name: string;
  mother_phone: string;
  group_id: number;
  priority: number;
  notes: string | null;
  added_by_user_id: number;
  created_at: string;
}

export interface WaitingListCreate {
  student_first_name: string;
  student_last_name: string;
  birth_year: number;
  father_name: string;
  father_phone: string;
  mother_name: string;
  mother_phone: string;
  group_id: number;
  priority: number;
  notes?: string;
}

export interface WaitingListUpdate {
  student_first_name?: string;
  student_last_name?: string;
  birth_year?: number;
  father_name?: string;
  father_phone?: string;
  mother_name?: string;
  mother_phone?: string;
  group_id?: number;
  priority?: number;
  notes?: string;
}
