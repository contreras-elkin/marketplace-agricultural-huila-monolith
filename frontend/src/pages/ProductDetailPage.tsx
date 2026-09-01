import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, mediaUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getProduct } from '../catalog/api';
import { CATEGORY_LABELS, UNIT_LABELS, type ProductDetail } from '../catalog/types';
import { openConversation } from '../chat/api';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.status === 404
              ? 'Este producto no existe o fue eliminado.'
              : err.message
            : 'Error al cargar el producto',
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Cargando producto...</p>;
  if (error) {
    return (
      <main>
        <p role="alert">{error}</p>
        <Link to="/catalogo">← Volver al catálogo</Link>
      </main>
    );
  }
  if (!data) return null;

  const { product, producerName } = data;
  const soldOut = product.status === 'SOLD_OUT';
  const isOwnProduct = auth?.userId === product.producerId;
  const canChat = Boolean(auth) && auth?.role === 'BUYER' && !isOwnProduct && !soldOut;

  async function handleChat() {
    if (!auth) {
      navigate('/login');
      return;
    }
    setOpeningChat(true);
    setChatError(null);
    try {
      const conversation = await openConversation(product.id, auth.token);
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      setChatError(err instanceof ApiError ? err.message : 'No se pudo abrir el chat');
      setOpeningChat(false);
    }
  }

  return (
    <main>
      <p>
        <Link to="/catalogo">← Volver al catálogo</Link>
      </p>
      <h1>{product.name}</h1>
      {soldOut && <p role="status" style={{ color: '#a15c00' }}>Producto agotado</p>}

      {product.photoUrl ? (
        <img
          src={mediaUrl(product.photoUrl)}
          alt={product.name}
          style={{ maxWidth: 420, width: '100%', borderRadius: 8 }}
        />
      ) : (
        <div style={{ maxWidth: 420, height: 240, background: '#eee', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#888' }}>
          Sin foto
        </div>
      )}

      <dl>
        <dt>Productor</dt>
        <dd>{producerName}</dd>
        <dt>Categoría</dt>
        <dd>{CATEGORY_LABELS[product.category]}</dd>
        <dt>Municipio</dt>
        <dd>{product.municipality}</dd>
        <dt>Precio</dt>
        <dd>
          ${product.price.toLocaleString('es-CO')} por {UNIT_LABELS[product.unit].toLowerCase()}
        </dd>
        <dt>Cantidad disponible</dt>
        <dd>
          {product.quantity.toLocaleString('es-CO')} {UNIT_LABELS[product.unit].toLowerCase()}
        </dd>
      </dl>

      {/* Punto de entrada al chat (Épica 3): solo comprador, producto activo y ajeno. */}
      {!auth && (
        <button type="button" onClick={() => navigate('/login')}>
          Iniciá sesión para chatear con el productor
        </button>
      )}
      {auth && auth.role !== 'BUYER' && (
        <button type="button" disabled title="Solo los compradores pueden iniciar un chat">
          Chatear con el productor
        </button>
      )}
      {auth && auth.role === 'BUYER' && (
        <button
          type="button"
          onClick={handleChat}
          disabled={!canChat || openingChat}
          title={
            isOwnProduct
              ? 'Es tu propio producto'
              : soldOut
                ? 'Producto agotado'
                : undefined
          }
        >
          {openingChat ? 'Abriendo chat...' : 'Chatear con el productor'}
        </button>
      )}
      {chatError && <p role="alert">{chatError}</p>}
    </main>
  );
}
