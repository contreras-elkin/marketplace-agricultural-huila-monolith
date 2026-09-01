import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getTransaction } from '../transactions/api';
import { STATUS_LABELS, formatMoney, type Transaction, type TransactionStatus } from '../transactions/types';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // ~30 s esperando la confirmación del webhook

function statusColor(status: TransactionStatus): string {
  if (status === 'CONFIRMED') return '#1a7f37';
  if (status === 'FAILED') return '#b3261e';
  return '#a15c00';
}

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

  // Carga inicial (mismo patrón que el resto de páginas: promesa inline en el efecto).
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
  if (loading) return <p>Cargando transacción...</p>;
  if (error && !txn) {
    return (
      <main>
        <p role="alert">{error}</p>
        <Link to="/">← Inicio</Link>
      </main>
    );
  }
  if (!txn) return null;

  const waitingConfirmation = paidReturn && txn.status === 'PENDING';

  return (
    <main>
      <p>
        <Link to="/chat">← Mis conversaciones</Link>
      </p>
      <h1>Estado de la compra</h1>
      <p>
        {txn.productName} — {txn.quantity} × {formatMoney(txn.unitPrice, txn.currency)}
      </p>
      <p>
        <strong>Total: {formatMoney(txn.amount, txn.currency)}</strong>
      </p>
      <p>
        Estado:{' '}
        <strong style={{ color: statusColor(txn.status) }}>{STATUS_LABELS[txn.status]}</strong>
        {waitingConfirmation && ' — confirmando el pago...'}
      </p>

      {canceledReturn && txn.status === 'PENDING' && (
        <p role="alert">Cancelaste el pago. Podés volver al chat e intentarlo de nuevo.</p>
      )}
      {txn.status === 'CONFIRMED' && txn.confirmedAt && (
        <p>Pago confirmado el {new Date(txn.confirmedAt).toLocaleString('es-CO')}.</p>
      )}
      {txn.status === 'FAILED' && <p>La sesión de pago expiró. Volvé al chat para iniciar una nueva.</p>}

      <p>Con: {txn.otherPartyName}</p>
    </main>
  );
}
