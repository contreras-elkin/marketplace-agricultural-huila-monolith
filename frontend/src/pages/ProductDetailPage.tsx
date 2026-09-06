import { Coins, ImageOff, MapPin, Package, Tag, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, mediaUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getProduct } from '../catalog/api';
import { CATEGORY_LABELS, UNIT_LABELS, type ProductDetail } from '../catalog/types';
import { openConversation } from '../chat/api';
import { formatMoney, formatQuantity } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { ButtonLink } from '../ui/ButtonLink';
import { EmptyState } from '../ui/EmptyState';
import { LoadingBlock } from '../ui/LoadingBlock';
import styles from './ProductDetailPage.module.css';

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

  if (loading) return <LoadingBlock label="Cargando producto…" />;

  if (error) {
    return (
      <EmptyState
        icon={ImageOff}
        title={error}
        action={<ButtonLink to="/catalogo">Volver al catálogo</ButtonLink>}
      />
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

  const chatTitle = !auth
    ? undefined
    : auth.role !== 'BUYER'
      ? 'Solo los compradores pueden iniciar un chat'
      : isOwnProduct
        ? 'Es tu propio producto'
        : soldOut
          ? 'Producto agotado'
          : undefined;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Inicio', to: '/' },
          { label: 'Catálogo', to: '/catalogo' },
          { label: product.name },
        ]}
      />

      <div className={styles.layout}>
        {product.photoUrl ? (
          <img src={mediaUrl(product.photoUrl)} alt={product.name} className={styles.photo} />
        ) : (
          <div className={styles.noPhoto}>
            <ImageOff size={24} aria-hidden="true" />
            Sin foto
          </div>
        )}

        <div className={styles.info}>
          <div className={styles.titleRow}>
            <h1>{product.name}</h1>
            {soldOut && <Badge variant="neutral">Agotado</Badge>}
          </div>

          <p className={styles.price}>
            {formatMoney(product.price)}{' '}
            <span className={styles.priceUnit}>por {UNIT_LABELS[product.unit].toLowerCase()}</span>
          </p>

          <dl className={styles.specs}>
            <dt className={styles.specKey}>
              <UserRound size={15} aria-hidden="true" /> Productor
            </dt>
            <dd className={styles.specVal}>{producerName}</dd>

            <dt className={styles.specKey}>
              <Tag size={15} aria-hidden="true" /> Categoría
            </dt>
            <dd className={styles.specVal}>{CATEGORY_LABELS[product.category]}</dd>

            <dt className={styles.specKey}>
              <MapPin size={15} aria-hidden="true" /> Municipio
            </dt>
            <dd className={styles.specVal}>{product.municipality}</dd>

            <dt className={styles.specKey}>
              <Package size={15} aria-hidden="true" /> Cantidad disponible
            </dt>
            <dd className={styles.specVal}>{formatQuantity(product.quantity, product.unit, { long: true })}</dd>

            <dt className={styles.specKey}>
              <Coins size={15} aria-hidden="true" /> Precio
            </dt>
            <dd className={styles.specVal}>
              {formatMoney(product.price)} / {UNIT_LABELS[product.unit].toLowerCase()}
            </dd>
          </dl>

          {/* Punto de entrada al chat (Épica 3): solo comprador, producto activo y ajeno. */}
          {!auth ? (
            <Button onClick={() => navigate('/login')}>
              Iniciá sesión para chatear con el productor
            </Button>
          ) : (
            <Button
              onClick={handleChat}
              disabled={!canChat || openingChat}
              loading={openingChat}
              title={chatTitle}
            >
              {openingChat ? 'Abriendo chat…' : 'Chatear con el productor'}
            </Button>
          )}
          {chatError && <Alert variant="error">{chatError}</Alert>}
        </div>
      </div>
    </>
  );
}
