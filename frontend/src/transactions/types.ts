export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

/** Detalle para la pantalla de estado del comprador (`GET /api/transactions/{id}`). */
export interface Transaction {
  id: string;
  status: TransactionStatus;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  productName: string;
  otherPartyName: string;
  createdAt: string;
  confirmedAt: string | null;
}

/** Desglose de la dispersión (solo en ventas confirmadas). Comisión = 0 en fase 1. */
export interface LedgerBreakdown {
  grossAmount: number;
  platformFeeAmount: number;
  netAmount: number;
}

/** Fila de `GET /api/transactions/mine` — sirve para "Mis compras" y "Mis ventas". */
export interface MyTransaction {
  id: string;
  conversationId: string;
  role: 'BUYER' | 'PRODUCER';
  status: TransactionStatus;
  productName: string;
  counterpartyName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  createdAt: string;
  confirmedAt: string | null;
  ledger: LedgerBreakdown | null;
}

export interface CheckoutStarted {
  transactionId: string;
  checkoutUrl: string;
}

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  FAILED: 'Fallida / expirada',
};

/**
 * Formato de dinero unificado (Épica 6): la implementación vive en `src/lib/format.ts`.
 * Se re-exporta desde acá para no romper los imports existentes de este módulo.
 */
export { formatMoney } from '../lib/format';
