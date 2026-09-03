import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../notifications/api';
import type { AppNotification } from '../notifications/types';

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

  return (
    <main>
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Notificaciones</h1>

      {loading && <p>Cargando...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <p>No tenés notificaciones.</p>}

      {items.length > 0 && (
        <p>
          <button onClick={markAll}>Marcar todas como leídas</button>
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
        {items.map((n) => (
          <li
            key={n.id}
            style={{
              border: '1px solid #ccc',
              borderLeftWidth: 4,
              borderLeftColor: n.read ? '#ccc' : '#0b5fff',
              borderRadius: 8,
              padding: '0.75rem',
            }}
          >
            <button
              onClick={() => openNotification(n)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
                cursor: 'pointer',
              }}
            >
              <strong>{n.title}</strong>
              {!n.read && <span style={{ color: '#0b5fff' }}> ●</span>}
              <br />
              <span>{n.body}</span>
              <br />
              <small style={{ color: '#666' }}>
                {new Date(n.createdAt).toLocaleString('es-CO')}
              </small>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
