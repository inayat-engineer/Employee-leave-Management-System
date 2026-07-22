import { api } from './api';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveType = 'casual' | 'sick' | 'annual';

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  annual: 'Annual Leave',
};

export type LeaveRecord = {
  id: number;
  employee_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  approver_id: number | null;
  created_at: string;
};

export type LeaveCreatePayload = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
};

export async function applyLeave(payload: LeaveCreatePayload) {
  const response = await api.post<LeaveRecord>('/leaves/', payload);
  return response.data;
}

export async function fetchMyLeaves(params: { search?: string } = {}) {
  const response = await api.get<LeaveRecord[]>('/leaves/me', {
    params: {
      search: params.search || undefined,
    },
  });
  return response.data;
}

export async function fetchAllLeaves(params: { status?: LeaveStatus; search?: string } = {}) {
  const response = await api.get<LeaveRecord[]>('/leaves/', {
    params: {
      status: params.status || undefined,
      search: params.search || undefined,
    },
  });
  return response.data;
}

export async function approveLeave(leaveId: number) {
  const response = await api.post<LeaveRecord>(`/leaves/${leaveId}/approve`);
  return response.data;
}

export async function rejectLeave(leaveId: number) {
  const response = await api.post<LeaveRecord>(`/leaves/${leaveId}/reject`);
  return response.data;
}

export async function deleteLeave(leaveId: number) {
  await api.delete(`/leaves/${leaveId}`);
}
