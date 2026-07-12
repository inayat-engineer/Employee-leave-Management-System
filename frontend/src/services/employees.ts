import { api } from './api';

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

export type PaginatedEmployees = {
  items: EmployeeRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type FetchEmployeesParams = {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  is_active?: boolean;
};

export async function fetchEmployees(params: FetchEmployeesParams = {}) {
  const response = await api.get<PaginatedEmployees>('/employees/', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      department: params.department || undefined,
      is_active: params.is_active,
    },
  });
  return response.data;
}

export type EmployeeUpdatePayload = Partial<{
  full_name: string;
  email: string;
  password: string;
  department: string | null;
  designation: string | null;
  phone_number: string | null;
  profile_picture_url: string | null;
  joining_date: string | null;
}>;

export async function updateEmployee(id: number, payload: EmployeeUpdatePayload) {
  const response = await api.put<EmployeeRecord>(`/employees/${id}`, payload);
  return response.data;
}

export async function deleteEmployee(id: number) {
  await api.delete(`/employees/${id}`);
}

export type LeaveBalanceRecord = {
  id: number;
  user_id: number;
  casual_leave_total: number;
  casual_leave_used: number;
  sick_leave_total: number;
  sick_leave_used: number;
  annual_leave_total: number;
  annual_leave_used: number;
};

export async function fetchLeaveBalance(userId: number) {
  const response = await api.get<LeaveBalanceRecord>(`/employees/${userId}/leave-balance`);
  return response.data;
}

export type EmployeeInvitePayload = {
  full_name: string;
  email: string;
  department?: string | null;
  designation?: string | null;
  joining_date?: string | null;
};

export async function inviteEmployee(payload: EmployeeInvitePayload) {
  const response = await api.post<EmployeeRecord>('/employees/invite', payload);
  return response.data;
}