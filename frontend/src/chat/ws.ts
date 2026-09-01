import { Client, type IMessage } from '@stomp/stompjs';
import { wsUrl } from '../api/client';
import type { Message } from './types';

export interface ChatSocket {
  /** Publica un mensaje en la conversación (frame STOMP `SEND /app/...`). */
  send: (body: string) => void;
  /** Cierra el socket y cancela la reconexión automática. */
  close: () => void;
}

interface ChatSocketHandlers {
  onMessage: (message: Message) => void;
  /** `true` al (re)conectar, `false` al caerse. El consumidor recarga el historial al reconectar. */
  onConnectedChange?: (connected: boolean) => void;
}

/**
 * Abre una conexión STOMP sobre WebSocket nativo y se suscribe al topic de la
 * conversación. El JWT viaja en el header `Authorization` del frame CONNECT
 * (nunca en la URL). `@stomp/stompjs` reintenta la conexión solo cada
 * `reconnectDelay` ms; en cada (re)conexión se re-suscribe.
 */
export function connectToConversation(
  conversationId: string,
  token: string,
  handlers: ChatSocketHandlers,
): ChatSocket {
  const destination = `/topic/conversations/${conversationId}`;
  const sendTo = `/app/conversations/${conversationId}/messages`;

  const client = new Client({
    brokerURL: wsUrl('/ws'),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(destination, (frame: IMessage) => {
        handlers.onMessage(JSON.parse(frame.body) as Message);
      });
      handlers.onConnectedChange?.(true);
    },
    onWebSocketClose: () => handlers.onConnectedChange?.(false),
    onStompError: () => handlers.onConnectedChange?.(false),
  });

  client.activate();

  return {
    send: (body: string) => {
      client.publish({
        destination: sendTo,
        body: JSON.stringify({ body }),
        headers: { 'content-type': 'application/json' },
      });
    },
    close: () => {
      void client.deactivate();
    },
  };
}
