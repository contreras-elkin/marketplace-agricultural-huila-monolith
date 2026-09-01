import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getConversation, getMessages, setPurchaseMethod } from '../chat/api';
import {
  PURCHASE_METHOD_LABELS,
  PURCHASE_METHOD_OPTIONS,
  type AgreedPurchaseMethod,
  type Conversation,
  type Message,
} from '../chat/types';
import { connectToConversation, type ChatSocket } from '../chat/ws';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { auth } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);

  const socketRef = useRef<ChatSocket | null>(null);
  const connectedOnceRef = useRef(false);

  const token = auth?.token;
  const myId = auth?.userId;

  // Carga inicial: detalle + historial.
  useEffect(() => {
    if (!conversationId || !token) return;
    let cancelled = false;
    Promise.all([getConversation(conversationId, token), getMessages(conversationId, token)])
      .then(([conv, history]) => {
        if (cancelled) return;
        setConversation(conv);
        setMessages(history);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.status === 403
              ? 'No tenés acceso a esta conversación.'
              : err.status === 404
                ? 'Esta conversación no existe.'
                : err.message
            : 'Error al cargar la conversación',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, token]);

  // Socket STOMP: mensajes en vivo + recarga del historial al reconectar.
  useEffect(() => {
    if (!conversationId || !token) return;
    connectedOnceRef.current = false;

    const socket = connectToConversation(conversationId, token, {
      onMessage: (message) => {
        setMessages((current) =>
          current.some((m) => m.id === message.id) ? current : [...current, message],
        );
      },
      onConnectedChange: (isConnected) => {
        setConnected(isConnected);
        if (isConnected) {
          if (connectedOnceRef.current) {
            // Reconexión: recargar por REST para tapar los mensajes perdidos durante el corte.
            getMessages(conversationId, token)
              .then(setMessages)
              .catch(() => undefined);
          }
          connectedOnceRef.current = true;
        }
      },
    });
    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [conversationId, token]);

  function handleSend(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !socketRef.current) return;
    socketRef.current.send(body);
    setDraft('');
  }

  async function handleMethodChange(method: AgreedPurchaseMethod) {
    if (!conversationId || !token) return;
    setSavingMethod(true);
    setError(null);
    try {
      const updated = await setPurchaseMethod(conversationId, method, token);
      setConversation(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la forma de compra');
    } finally {
      setSavingMethod(false);
    }
  }

  if (!auth) return null;
  if (loading) return <p>Cargando conversación...</p>;
  if (error && !conversation) {
    return (
      <main>
        <p role="alert">{error}</p>
        <Link to="/chat">← Mis conversaciones</Link>
      </main>
    );
  }
  if (!conversation) return null;

  const otherName =
    conversation.buyerId === myId ? conversation.producerName : conversation.buyerName;

  return (
    <main>
      <p>
        <Link to="/chat">← Mis conversaciones</Link>
      </p>
      <h1>{conversation.productName}</h1>
      <p>
        Conversación con <strong>{otherName}</strong>{' '}
        <span style={{ color: connected ? '#1a7f37' : '#a15c00' }}>
          ({connected ? 'en línea' : 'reconectando...'})
        </span>
      </p>

      <label style={{ display: 'block', margin: '0.5rem 0' }}>
        Forma de compra acordada{' '}
        <select
          value={conversation.agreedPurchaseMethod ?? ''}
          disabled={savingMethod}
          onChange={(e) => handleMethodChange(e.target.value as AgreedPurchaseMethod)}
        >
          <option value="" disabled>
            Sin acordar
          </option>
          {PURCHASE_METHOD_OPTIONS.map((method) => (
            <option key={method} value={method}>
              {PURCHASE_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </label>

      {error && <p role="alert">{error}</p>}

      <ul
        style={{
          listStyle: 'none',
          padding: '0.5rem',
          border: '1px solid #ccc',
          borderRadius: 8,
          minHeight: 200,
          maxHeight: 380,
          overflowY: 'auto',
          display: 'grid',
          gap: '0.4rem',
        }}
      >
        {messages.length === 0 && <li style={{ color: '#666' }}>Todavía no hay mensajes.</li>}
        {messages.map((message) => {
          const mine = message.senderId === myId;
          return (
            <li key={message.id} style={{ textAlign: mine ? 'right' : 'left' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: mine ? '#d7ebff' : '#eee',
                  borderRadius: 8,
                  padding: '0.35rem 0.6rem',
                  maxWidth: '80%',
                }}
              >
                <small style={{ color: '#555' }}>
                  {mine ? 'Vos' : otherName} · {new Date(message.sentAt).toLocaleTimeString('es-CO')}
                </small>
                <br />
                {message.body}
              </span>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí un mensaje..."
          maxLength={2000}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={!connected || draft.trim().length === 0}>
          Enviar
        </button>
      </form>
    </main>
  );
}
