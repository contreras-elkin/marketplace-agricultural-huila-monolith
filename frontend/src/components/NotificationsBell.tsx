import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listNotifications } from '../notifications/api';
import styles from './NotificationsBell.module.css';

/**
 * Campana de notificaciones sin leer. Consulta `GET /api/notifications` al montar y
 * luego cada 20 s (polling — Decisión 5 del spec de Épica 5): el criterio de salida
 * tolera unos segundos de desfase. Errores silenciosos: no debe romper el header.
 */
const POLL_INTERVAL_MS = 20000;

export function NotificationsBell() {
  const { auth } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    const load = () => {
      listNotifications(auth.token)
        .then((data) => {
          if (active) setUnread(data.unreadCount);
        })
        .catch(() => {
          /* silencioso */
        });
    };

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [auth]);

  return (
    <NavLink
      to="/notificaciones"
      className={styles.bell}
      aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
    >
      <Bell size={18} aria-hidden="true" />
      {unread > 0 && <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
    </NavLink>
  );
}
