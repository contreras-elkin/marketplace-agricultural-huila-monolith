import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { listMyTransactions } from '../transactions/api';
import { STATUS_LABELS, formatMoney, type MyTransaction, type TransactionStatus } from '../transactions/types';

function statusColor(status: TransactionStatus): string {
  if (status === 'CONFIRMED') return '#1a7f37';
  if (status === 'FAILED') return '#b3261e';
  return '#a15c00';
}

export function ProducerSalesPage() {
  const { auth } = useAuth();
  const [sales, setSales] = useState<MyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    listMyTransactions(auth.token)
      .then((all) => setSales(all.filter((t) => t.role === 'PRODUCER')))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar tus ventas'))
      .finally(() => setLoading(false));
  }, [auth]);

  const confirmed = sales.filter((s) => s.status === 'CONFIRMED');
  const totalNet = confirmed.reduce((sum, s) => sum + (s.ledger?.netAmount ?? 0), 0);

  return (
    <main>
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Mis ventas</h1>

      {loading && <p>Cargando...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && sales.length === 0 && <p>Todavía no tenés ventas por la plataforma.</p>}

      {confirmed.length > 0 && (
        <p>
          Neto recibido (ventas confirmadas): <strong>{formatMoney(totalNet)}</strong>
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
        {sales.map((s) => (
          <li key={s.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: '0.75rem' }}>
            <strong>{s.productName}</strong>{' '}
            <span style={{ color: statusColor(s.status) }}>({STATUS_LABELS[s.status]})</span>
            <br />
            Comprador: {s.counterpartyName} · {new Date(s.createdAt).toLocaleDateString('es-CO')}
            <br />
            {s.quantity} × {formatMoney(s.unitPrice, s.currency)} ={' '}
            <strong>{formatMoney(s.amount, s.currency)}</strong>
            {s.ledger && (
              <div style={{ marginTop: '0.35rem', fontSize: 14, color: '#444' }}>
                Bruto {formatMoney(s.ledger.grossAmount, s.currency)} · Comisión{' '}
                {formatMoney(s.ledger.platformFeeAmount, s.currency)} · Neto{' '}
                <strong>{formatMoney(s.ledger.netAmount, s.currency)}</strong>
              </div>
            )}
            <div style={{ marginTop: '0.35rem' }}>
              <Link to={`/transacciones/${s.id}`}>Ver detalle</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
