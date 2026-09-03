import { apiGet, apiPut } from '../api/client';
import type { NotificationList } from './types';

/** Lista las últimas ~50 notificaciones del usuario y el total sin leer. */
export function listNotifications(token: string): Promise<NotificationList> {
  return apiGet<NotificationList>('/api/notifications', token);
}

/** Marca una notificación como leída (204). 404 si no es del usuario. */
export function markNotificationRead(id: string, token: string): Promise<void> {
  return apiPut<void>(`/api/notifications/${id}/read`, undefined, token);
}

/** Marca como leídas todas las del usuario; devuelve cuántas cambiaron. */
export function markAllNotificationsRead(token: string): Promise<{ updated: number }> {
  return apiPut<{ updated: number }>('/api/notifications/read-all', undefined, token);
}
