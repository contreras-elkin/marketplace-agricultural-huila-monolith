import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { listConversations } from '../chat/api';
import { PURCHASE_METHOD_LABELS, type ConversationSummary } from '../chat/types';

export function ConversationsPage() {
  const { auth } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    listConversations(auth.token)
      .then(setConversations)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar tus conversaciones'))
      .finally(() => setLoading(false));
  }, [auth]);

  return (
    <main>
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Mis conversaciones</h1>

      {loading && <p>Cargando...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && conversations.length === 0 && (
        <p>
          Todavía no tenés conversaciones. Abrí una desde el detalle de un producto en el{' '}
          <Link to="/catalogo">catálogo</Link>.
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
        {conversations.map((c) => (
          <li key={c.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: '0.75rem' }}>
            <Link to={`/chat/${c.id}`} style={{ fontWeight: 'bold' }}>
              {c.productName}
            </Link>
            <br />
            <span>con {c.otherParticipantName}</span>
            <br />
            <small style={{ color: '#666' }}>
              {c.agreedPurchaseMethod
                ? `Forma de compra: ${PURCHASE_METHOD_LABELS[c.agreedPurchaseMethod]}`
                : 'Forma de compra: sin acordar'}
              {' · '}
              {c.lastMessageAt
                ? `último mensaje ${new Date(c.lastMessageAt).toLocaleString('es-CO')}`
                : 'sin mensajes'}
            </small>
          </li>
        ))}
      </ul>
    </main>
  );
}
