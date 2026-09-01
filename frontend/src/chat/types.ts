export type AgreedPurchaseMethod = 'PLATFORM' | 'OFF_PLATFORM';

/** Fila de "Mis conversaciones". `otherParticipantName` es la contraparte según quién consulta. */
export interface ConversationSummary {
  id: string;
  productId: string;
  productName: string;
  otherParticipantName: string;
  agreedPurchaseMethod: AgreedPurchaseMethod | null;
  lastMessageAt: string | null;
  createdAt: string;
}

/** Detalle de una conversación — trae ambas partes para saber de qué lado está el usuario. */
export interface Conversation {
  id: string;
  productId: string;
  productName: string;
  buyerId: string;
  producerId: string;
  buyerName: string;
  producerName: string;
  agreedPurchaseMethod: AgreedPurchaseMethod | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sentAt: string;
}

export const PURCHASE_METHOD_LABELS: Record<AgreedPurchaseMethod, string> = {
  PLATFORM: 'Por la plataforma',
  OFF_PLATFORM: 'Por fuera de la plataforma',
};

export const PURCHASE_METHOD_OPTIONS = Object.keys(PURCHASE_METHOD_LABELS) as AgreedPurchaseMethod[];
