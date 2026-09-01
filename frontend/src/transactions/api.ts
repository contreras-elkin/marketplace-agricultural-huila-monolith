import { apiGet, apiPost } from '../api/client';
import type { CheckoutStarted, MyTransaction, Transaction } from './types';

/**
 * Inicia el pago por la plataforma de una conversación con compra acordada
 * (`method === 'PLATFORM'`). Solo rol BUYER. Devuelve la URL de Stripe Checkout
 * a la que hay que redirigir. 409 si ya hay una transacción en curso para esa
 * conversación.
 */
export function startCheckout(conversationId: string, token: string): Promise<CheckoutStarted> {
  return apiPost<CheckoutStarted>('/api/transactions', { conversationId }, token);
}

export function getTransaction(id: string, token: string): Promise<Transaction> {
  return apiGet<Transaction>(`/api/transactions/${id}`, token);
}

/** "Mis compras" (comprador) y "Mis ventas" (productor) en una sola lista, más recientes primero. */
export function listMyTransactions(token: string): Promise<MyTransaction[]> {
  return apiGet<MyTransaction[]>('/api/transactions/mine', token);
}
