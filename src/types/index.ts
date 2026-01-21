// src/types/index.ts

// Re-export all API types from api.ts
export * from './api'

// Legacy types for backward compatibility (deprecated - use types from ./api.ts)
export interface Meta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Meta | null;
}

// Auth & User
export interface User {
  id: number;
  phone: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  status: "active" | "inactive";
  created_at: string;
  roles: Role[];
  role?: "admin" | "coach" | "head-coach" | "super-admin";
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Permission[];
  created_at?: string;
}

export interface Permission {
  id: number;
  code: string;
  description: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Students
export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
  photo_url?: string;
  face_id?: string;
  status: "active" | "graduated" | "dropped" | "suspended";
  group_id: number;
  created_at: string;
}

// Finance
export interface Transaction {
  id: number;
  external_id?: string;
  amount: number;
  source: "payme" | "click" | "bank" | "cash" | "manual";
  status: "pending" | "success" | "failed" | "cancelled" | "unassigned";
  paid_at: string;
  comment?: string;
  student_id?: number;
  contract_id?: number;
  created_by_user_id?: number;
  created_at: string;
}

// Coach
export interface CoachSession {
  id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  group_id: number;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  schedule_days: string;
  schedule_time: string;
  coach_id: number;
}
