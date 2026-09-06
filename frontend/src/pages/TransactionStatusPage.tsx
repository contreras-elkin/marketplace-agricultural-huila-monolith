import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getTransaction } from '../transactions/api';
import { STATUS_LABELS, type Transaction, type TransactionStatus } from '../transactions/types';
import { formatDateTime, formatMoney } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { LoadingBlock } from '../ui/LoadingBlock';
import { PageHeader } from '../ui/PageHeader';
import styles from './TransactionStatusPage.module.css';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // ~30 s esperando la confirmación del webhook

const STATUS_META: Record<
  TransactionStatus,
  { icon: LucideIcon; cls: string; badge: 'success' | 'warning' | 'danger' }
> = {
  PENDING: { icon: Clock, cls: styles.pending, badge: 'warning' },
  CONFIRMED: { icon: CheckCircle2, cls: styles.confirmed, badge: 'success' },
  FAILED: { icon: XCircle, cls: styles.failed, badge: 'danger' },
};

function describeError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Error al cargar la transacción';
  if (err.status === 403) return 'No tenés acceso a esta transacción.';
  if (err.status === 404) return 'Esta transacción no existe.';
  return err.message;
}

export function TransactionStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { auth } = useAuth();
  const [params] = useSearchParams();
  const paidReturn = params.get('pago') === 'ok';
  const canceledReturn = params.get('pago') === 'cancelado';

  const [txn, setTxn] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const token = auth?.token;

  useEffect(() => {
    if (!id || !token) return;
    getTransaction(id, token)
      .then((data) => {
        setTxn(data);
        setError(null);
      })
      .catch((err) => setError(describeError(err)))
      .finally(() => setLoading(false));
  }, [id, token]);

  const refresh = useCallback(() => {
    if (!id || !token) return;
    getTransaction(id, token)
      .then((data) => {
        setTxn(data);
        setError(null);
      })
      .catch((err) => setError(describeError(err)));
  }, [id, token]);

  // El webhook puede tardar un segundo en confirmar tras volver de Stripe: se
  // reintenta mientras siga PENDING, con tope de intentos.
  useEffect(() => {
    if (!paidReturn || !txn || txn.status !== 'PENDING' || pollCount >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      setPollCount((n) => n + 1);
      refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [paidReturn, txn, pollCount, refresh]);

  if (!auth) return null;

  const crumbs = [
    { label: 'Inicio', to: '/' },
    { label: 'Conversaciones', to: '/chat' },
    { label: 'Estado de la compra' },
  ];

  if (loading) {
    return (
      <>
        <Breadcrumbs items={crumbs} />
        <LoadingBlock label="Cargando transacción…" />
      </>
    );
  }
  if (error && !txn) {
    return (
      <>
        <Breadcrumbs items={crumbs} />
        <Alert variant="error">{error}</Alert>
      </>
    );
  }
  if (!txn) return null;

  const meta = STATUS_META[txn.status];
  const StatusIcon = meta.icon;
  const waitingConfirmation = paidReturn && txn.status === 'PENDING';

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <PageHeader title="Estado de la compra" />

      <Card className={styles.card}>
        <div className={styles.statusRow}>
          <span className={cx(styles.statusIcon, meta.cls)}>
            <StatusIcon size={26} aria-hidden="true" />
          </span>
          <div>
            <Badge variant={meta.badge}>{STATUS_LABELS[txn.status]}</Badge>
            {waitingConfirmation && <p className={styles.key}>Confirmando el pago…</p>}
          </div>
        </div>

        {canceledReturn && txn.status === 'PENDING' && (
          <Alert variant="warning">
            Cancelaste el pago. Podés volver al chat e intentarlo de nuevo.
          </Alert>
        )}
        {txn.status === 'FAILED' && (
          <Alert variant="warning">La sesión de pago expiró. Volvé al chat para iniciar una nueva.</Alert>
        )}

        <dl className={styles.specs}>
          <dt className={styles.key}>Producto</dt>
          <dd className={styles.val}>{txn.productName}</dd>

          <dt className={styles.key}>Cantidad</dt>
          <dd className={styles.val}>
            {txn.quantity} × {formatMoney(txn.unitPrice)}
          </dd>

          <dt className={styles.key}>Total</dt>
          <dd className={cx(styles.val, styles.total)}>{formatMoney(txn.amount, { suffix: true })}</dd>

          <dt className={styles.key}>Con</dt>
          <dd className={styles.val}>{txn.otherPartyName}</dd>

          {txn.status === 'CONFIRMED' && txn.confirmedAt && (
            <>
              <dt className={styles.key}>Confirmada</dt>
              <dd className={styles.val}>{formatDateTime(txn.confirmedAt)}</dd>
            </>
          )}
        </dl>
      </Card>
    </>
  );
}
