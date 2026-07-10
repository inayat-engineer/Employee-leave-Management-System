import { api } from './api';

export type DashboardStats = {
  total_employees: number;
  leaves_pending: number;
  leaves_approved: number;
  leaves_rejected: number;
};

export type LeaveType =
  | 'casual'
  | 'sick'
  | 'annual'
  | 'wedding'
  | 'family_emergency'
  | 'personal'
  | 'other';

export type LeaveRecord = {
  id: number;
  employee_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id: number | null;
  created_at: string;
};

export type LeaveBalance = {
  id: number;
  user_id: number;
  casual_leave_total: number;
  casual_leave_used: number;
  sick_leave_total: number;
  sick_leave_used: number;
  annual_leave_total: number;
  annual_leave_used: number;
};

export type EmployeeRecord = {
  id: number;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  phone_number: string | null;
  profile_picture_url: string | null;
  joining_date: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
};

export async function fetchDashboardStats() {
  const response = await api.get<DashboardStats>('/dashboard/');
  return response.data;
}

export async function fetchLeaveBalance(userId: number) {
  const response = await api.get<LeaveBalance>(`/employees/${userId}/leave-balance`);
  return response.data;
}

export async function fetchLeaves(forSuperuser: boolean) {
  const endpoint = forSuperuser ? '/leaves/' : '/leaves/me';
  const response = await api.get<LeaveRecord[]>(endpoint);
  return response.data;
}

export async function fetchEmployee(userId: number) {
  const response = await api.get<EmployeeRecord>(`/employees/${userId}`);
  return response.data;
}
