import { MessagesSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { listConversations } from '../chat/api';
import { PURCHASE_METHOD_LABELS, type ConversationSummary } from '../chat/types';
import { formatRelative } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { ButtonLink } from '../ui/ButtonLink';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../ui/PageHeader';
import { SkeletonLine } from '../ui/Skeleton';
import styles from './ConversationsPage.module.css';

export function ConversationsPage() {
  const { auth } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    listConversations(auth.token)
      .then(setConversations)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar tus conversaciones'),
      )
      .finally(() => setLoading(false));
  }, [auth]);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Conversaciones' }]} />
      <PageHeader title="Mis conversaciones" />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Card padding="none">
          <ul className={styles.list}>
            {[0, 1, 2].map((i) => (
              <li key={i} className={styles.skeletonRow}>
                <SkeletonLine width="2.5rem" />
                <div className={styles.skeletonBody}>
                  <SkeletonLine width="45%" />
                  <SkeletonLine width="65%" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Todavía no tenés conversaciones"
          description="Abrí una desde el detalle de un producto en el catálogo."
          action={<ButtonLink to="/catalogo">Ir al catálogo</ButtonLink>}
        />
      ) : (
        <ul className={styles.list}>
          {conversations.map((c) => (
            <Card key={c.id} as="li" interactive padding="none">
              <Link to={`/chat/${c.id}`} className={styles.row}>
                <Avatar name={c.otherParticipantName} />
                <div className={styles.main}>
                  <div className={styles.title}>{c.productName}</div>
                  <div className={styles.sub}>con {c.otherParticipantName}</div>
                </div>
                <div className={styles.aside}>
                  <Badge variant={c.agreedPurchaseMethod === 'PLATFORM' ? 'info' : 'neutral'}>
                    {c.agreedPurchaseMethod
                      ? PURCHASE_METHOD_LABELS[c.agreedPurchaseMethod]
                      : 'Sin acordar'}
                  </Badge>
                  <span className={styles.time}>
                    {c.lastMessageAt ? formatRelative(c.lastMessageAt) : 'sin mensajes'}
                  </span>
                </div>
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
