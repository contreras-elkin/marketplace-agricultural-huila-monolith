import { apiGet, apiPost, apiPut } from '../api/client';
import type { AgreedPurchaseMethod, Conversation, ConversationSummary, Message } from './types';

/** Abre (o reusa) la conversación del comprador sobre un producto. Solo rol BUYER. */
export function openConversation(productId: string, token: string): Promise<Conversation> {
  return apiPost<Conversation>('/api/chat/conversations', { productId }, token);
}

/** Conversaciones del usuario autenticado, sea comprador o productor. */
export function listConversations(token: string): Promise<ConversationSummary[]> {
  return apiGet<ConversationSummary[]>('/api/chat/conversations', token);
}

export function getConversation(id: string, token: string): Promise<Conversation> {
  return apiGet<Conversation>(`/api/chat/conversations/${id}`, token);
}

/** Historial completo, orden cronológico. Se recarga tras reconectar el socket para cubrir huecos. */
export function getMessages(id: string, token: string): Promise<Message[]> {
  return apiGet<Message[]>(`/api/chat/conversations/${id}/messages`, token);
}

export function setPurchaseMethod(
  id: string,
  method: AgreedPurchaseMethod,
  token: string,
): Promise<Conversation> {
  return apiPut<Conversation>(`/api/chat/conversations/${id}/purchase-method`, { method }, token);
}
