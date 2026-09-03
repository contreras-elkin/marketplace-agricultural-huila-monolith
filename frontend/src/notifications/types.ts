export type NotificationType = 'NUEVO_MENSAJE_CHAT' | 'TRANSACCION_CONFIRMADA';

/**
 * Notificación tal como la devuelve `GET /api/notifications`. El texto
 * (`title`/`body`/`link`) ya viene armado del backend; el front solo lo pinta.
 * Se llama `AppNotification` para no chocar con el `Notification` global del DOM.
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Cuerpo de `GET /api/notifications`: lista + contador de no leídas en una sola llamada. */
export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

export const TYPE_LABELS: Record<NotificationType, string> = {
  NUEVO_MENSAJE_CHAT: 'Mensaje de chat',
  TRANSACCION_CONFIRMADA: 'Transacción',
};
