import { api } from './api';

export type NotificationRecord = {
  id: number;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationListResponse = {
  items: NotificationRecord[];
  unread_count: number;
};

export async function fetchNotifications(unreadOnly = false) {
  const response = await api.get<NotificationListResponse>('/notifications/', {
    params: { unread_only: unreadOnly },
  });
  return response.data;
}

export async function markNotificationRead(id: number) {
  const response = await api.post<NotificationRecord>(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.post<{ marked_read: number }>('/notifications/read-all');
  return response.data;
}
