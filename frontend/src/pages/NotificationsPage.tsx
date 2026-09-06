import { BellOff, CheckCircle2, MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../notifications/api';
import type { AppNotification } from '../notifications/types';
import { formatRelative } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../ui/PageHeader';
import { SkeletonLine } from '../ui/Skeleton';
import styles from './NotificationsPage.module.css';

const TYPE_ICON = {
  NUEVO_MENSAJE_CHAT: MessageSquare,
  TRANSACCION_CONFIRMADA: CheckCircle2,
};

export function NotificationsPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!auth) return;
    listNotifications(auth.token)
      .then((data) => {
        setItems(data.items);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar las notificaciones'),
      )
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const openNotification = async (n: AppNotification) => {
    if (!auth) return;
    try {
      if (!n.read) await markNotificationRead(n.id, auth.token);
    } catch {
      /* si falla el marcado, igual seguimos */
    }
    if (n.link) navigate(n.link);
    else load();
  };

  const markAll = async () => {
    if (!auth) return;
    await markAllNotificationsRead(auth.token);
    load();
  };

  if (!auth) return null;

  const hasUnread = items.some((n) => !n.read);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Notificaciones' }]} />
      <PageHeader
        title="Notificaciones"
        actions={
          items.length > 0 && (
            <Button variant="ghost" onClick={markAll} disabled={!hasUnread}>
              Marcar todas como leídas
            </Button>
          )
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Card>
          <SkeletonLine width="40%" />
          <SkeletonLine width="80%" />
          <SkeletonLine width="60%" />
        </Card>
      ) : items.length === 0 ? (
        <EmptyState icon={BellOff} title="No tenés notificaciones" />
      ) : (
        <ul className={styles.list}>
          {items.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? MessageSquare;
            return (
              <Card
                key={n.id}
                as="li"
                padding="none"
                className={cx(styles.item, !n.read && styles.itemUnread)}
              >
                <button type="button" className={styles.btn} onClick={() => openNotification(n)}>
                  <span className={styles.icon}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className={styles.body}>
                    <span className={styles.title}>
                      {!n.read && <span className={styles.unreadDot} aria-hidden="true" />}
                      {n.title}
                    </span>
                    <br />
                    <span className={styles.text}>{n.body}</span>
                    <br />
                    <span className={styles.time}>{formatRelative(n.createdAt)}</span>
                  </span>
                </button>
              </Card>
            );
          })}
        </ul>
      )}
    </>
  );
}
