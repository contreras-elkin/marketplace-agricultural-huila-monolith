import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { listMyTransactions } from '../transactions/api';
import { STATUS_LABELS, type MyTransaction, type TransactionStatus } from '../transactions/types';
import { formatDate, formatMoney } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../ui/PageHeader';
import { SkeletonLine } from '../ui/Skeleton';
import styles from './ProducerSalesPage.module.css';

const STATUS_VARIANT: Record<TransactionStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  FAILED: 'danger',
};

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
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Mis ventas' }]} />
      <PageHeader
        title="Mis ventas"
        actions={
          confirmed.length > 0 && (
            <span className={styles.summary}>
              <span className="muted">Neto confirmado</span>
              <span className={styles.summaryValue}>{formatMoney(totalNet, { suffix: true })}</span>
            </span>
          )
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Card>
          <SkeletonLine width="60%" />
          <SkeletonLine width="80%" />
          <SkeletonLine width="40%" />
        </Card>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Todavía no tenés ventas por la plataforma"
          description="Cuando un comprador pague una compra acordada por la plataforma, vas a verla acá."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Comprador</th>
                <th>Fecha</th>
                <th className={styles.num}>Cantidad × precio</th>
                <th className={styles.num}>Total</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td data-label="Producto">{s.productName}</td>
                  <td data-label="Comprador">{s.counterpartyName}</td>
                  <td data-label="Fecha">{formatDate(s.createdAt)}</td>
                  <td data-label="Cantidad × precio" className={styles.num}>
                    {s.quantity} × {formatMoney(s.unitPrice)}
                  </td>
                  <td data-label="Total" className={styles.num}>
                    {formatMoney(s.amount)}
                    {s.ledger && (
                      <div className={styles.ledger}>
                        Bruto {formatMoney(s.ledger.grossAmount)} · Comisión{' '}
                        {formatMoney(s.ledger.platformFeeAmount)} · Neto{' '}
                        {formatMoney(s.ledger.netAmount)}
                      </div>
                    )}
                  </td>
                  <td data-label="Estado">
                    <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                  </td>
                  <td data-label="" className={styles.num}>
                    <Link to={`/transacciones/${s.id}`}>Ver detalle</Link>
                  </td>
                </tr>
              ))}
              {confirmed.length > 0 && (
                <tr className={cx(styles.totalRow)}>
                  <td data-label="">Neto confirmado</td>
                  <td />
                  <td />
                  <td />
                  <td className={styles.num}>{formatMoney(totalNet, { suffix: true })}</td>
                  <td />
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
