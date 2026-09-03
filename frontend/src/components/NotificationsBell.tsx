import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listNotifications } from '../notifications/api';

/**
 * Badge de notificaciones sin leer. Consulta `GET /api/notifications` al montar y
 * luego cada 20 s (polling — Decisión 5 del spec de Épica 5): el criterio de salida
 * tolera unos segundos de desfase. Errores silenciosos: el badge no debe romper la home.
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
    <Link
      to="/notificaciones"
      aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
    >
      🔔{unread > 0 && <strong> ({unread})</strong>}
    </Link>
  );
}
