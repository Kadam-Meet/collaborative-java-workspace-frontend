import { apiJson } from "@/api/axiosClient";
import type { NotificationItem, NotificationListResponse } from "@/types/workspace.types";

export function getNotifications(limit = 20, unreadOnly = false): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (unreadOnly) {
    params.set("unreadOnly", "true");
  }
  return apiJson<NotificationListResponse>(`/api/notifications?${params.toString()}`, {
    method: "GET",
    auth: true,
  });
}

export function markNotificationRead(notificationId: number): Promise<NotificationItem> {
  return apiJson<NotificationItem>(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
    auth: true,
  });
}

export function markAllNotificationsRead(): Promise<{ updated: number; unreadCount: number }> {
  return apiJson<{ updated: number; unreadCount: number }>("/api/notifications/read-all", {
    method: "PUT",
    auth: true,
  });
}

export function deleteNotification(notificationId: number): Promise<{ deleted: boolean; notificationId: number; recipientEmail: string; unreadCount: number }> {
  return apiJson<{ deleted: boolean; notificationId: number; recipientEmail: string; unreadCount: number }>(`/api/notifications/${notificationId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function clearNotifications(): Promise<{ deleted: number; recipientEmail: string; unreadCount: number }> {
  return apiJson<{ deleted: number; recipientEmail: string; unreadCount: number }>("/api/notifications", {
    method: "DELETE",
    auth: true,
  });
}
