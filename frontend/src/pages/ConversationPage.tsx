import { Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { listMyTransactions, startCheckout } from '../transactions/api';
import { formatTime } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { LoadingBlock } from '../ui/LoadingBlock';
import styles from './ConversationPage.module.css';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { auth } = useAuth();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);
  const [paying, setPaying] = useState(false);

  const socketRef = useRef<ChatSocket | null>(null);
  const connectedOnceRef = useRef(false);
  const historyRef = useRef<HTMLDivElement>(null);

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

  // Autoscroll del historial al último mensaje.
  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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

  async function handlePay() {
    if (!conversationId || !token) return;
    setPaying(true);
    setError(null);
    try {
      const { checkoutUrl } = await startCheckout(conversationId, token);
      window.location.href = checkoutUrl; // se sale de la SPA hacia Stripe Checkout
    } catch (err) {
      // 409: ya hay una transacción en curso para esta conversación → llevar a su estado.
      if (err instanceof ApiError && err.status === 409) {
        try {
          const mine = await listMyTransactions(token);
          const existing = mine.find(
            (t) => t.conversationId === conversationId && t.status !== 'FAILED',
          );
          if (existing) {
            navigate(`/transacciones/${existing.id}`);
            return;
          }
        } catch {
          // cae al mensaje genérico de abajo
        }
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar el pago');
      setPaying(false);
    }
  }

  if (!auth) return null;
  if (loading) return <LoadingBlock label="Cargando conversación…" />;
  if (error && !conversation) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Conversaciones', to: '/chat' }]} />
        <Alert variant="error">{error}</Alert>
      </>
    );
  }
  if (!conversation) return null;

  const otherName =
    conversation.buyerId === myId ? conversation.producerName : conversation.buyerName;
  const isBuyer = conversation.buyerId === myId;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Inicio', to: '/' },
          { label: 'Conversaciones', to: '/chat' },
          { label: conversation.productName },
        ]}
      />

      <div className={styles.head}>
        <h1 className={styles.headTitle}>{conversation.productName}</h1>
        <span className={styles.headSub}>con {otherName}</span>
        <Badge variant={connected ? 'success' : 'warning'} dot>
          {connected ? 'en línea' : 'reconectando…'}
        </Badge>
      </div>

      <div className={styles.controls}>
        <div className={styles.methodRow}>
          <label htmlFor="purchase-method">Forma de compra acordada</label>
          <select
            id="purchase-method"
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
        </div>

        {conversation.agreedPurchaseMethod === 'PLATFORM' &&
          (isBuyer ? (
            <div className={styles.payBlock}>
              <span className={styles.payTitle}>Compra por la plataforma</span>
              <p>Se cobra la cantidad publicada del producto en un checkout seguro de la pasarela.</p>
              <Button onClick={handlePay} loading={paying}>
                {paying ? 'Redirigiendo al pago…' : 'Pagar por la plataforma'}
              </Button>
            </div>
          ) : (
            <Alert variant="success">
              Compra por la plataforma acordada — esperando que el comprador realice el pago.
            </Alert>
          ))}

        {error && <Alert variant="error">{error}</Alert>}
      </div>

      <div className={styles.history} ref={historyRef}>
        {messages.length === 0 && <p className={styles.emptyHistory}>Todavía no hay mensajes.</p>}
        {messages.map((message) => {
          const mine = message.senderId === myId;
          return (
            <div
              key={message.id}
              className={cx(styles.bubbleRow, mine && styles.bubbleRowMine)}
            >
              <span className={styles.bubbleMeta}>
                {mine ? 'Vos' : otherName} · {formatTime(message.sentAt)}
              </span>
              <span className={cx(styles.bubble, mine && styles.bubbleMine)}>{message.body}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className={styles.composer}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí un mensaje…"
          maxLength={2000}
          className={styles.composerInput}
          aria-label="Mensaje"
        />
        <Button type="submit" disabled={!connected || draft.trim().length === 0}>
          <Send size={16} aria-hidden="true" />
          Enviar
        </Button>
      </form>
    </>
  );
}
