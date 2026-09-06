import { ImageOff, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, mediaUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { changeProductStatus, deleteProduct, getMyProducts } from '../catalog/api';
import { CATEGORY_LABELS, UNIT_LABELS, type Product } from '../catalog/types';
import { formatMoney } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { ButtonLink } from '../ui/ButtonLink';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { IconButton } from '../ui/IconButton';
import { PageHeader } from '../ui/PageHeader';
import { SkeletonLine } from '../ui/Skeleton';
import { useToast } from '../ui/toast/useToast';
import styles from './MyProductsPage.module.css';

export function MyProductsPage() {
  const { auth } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);

  useEffect(() => {
    if (!auth) return;
    getMyProducts(auth.token)
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar tus productos'))
      .finally(() => setLoading(false));
  }, [auth]);

  async function toggleStatus(product: Product) {
    if (!auth) return;
    setBusyId(product.id);
    setError(null);
    try {
      const next = product.status === 'ACTIVE' ? 'SOLD_OUT' : 'ACTIVE';
      const updated = await changeProductStatus(auth.token, product.id, next);
      setProducts((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(next === 'SOLD_OUT' ? 'Producto marcado como agotado.' : 'Producto reactivado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    if (!auth || !confirmTarget) return;
    const product = confirmTarget;
    setBusyId(product.id);
    setError(null);
    try {
      await deleteProduct(auth.token, product.id);
      setProducts((list) => list.filter((p) => p.id !== product.id));
      toast.success(`"${product.name}" se eliminó del catálogo.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto');
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Mis productos' }]} />
      <PageHeader
        title="Mis productos"
        actions={
          <ButtonLink to="/mis-productos/nuevo">
            <PackagePlus size={16} aria-hidden="true" />
            Nuevo producto
          </ButtonLink>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Card>
          <SkeletonLine width="50%" />
          <SkeletonLine width="70%" />
        </Card>
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="Todavía no publicaste ningún producto"
          description="Creá tu primera publicación para que aparezca en el catálogo."
          action={<ButtonLink to="/mis-productos/nuevo">Publicar el primero</ButtonLink>}
        />
      ) : (
        <ul className={styles.list}>
          {products.map((p) => (
            <Card key={p.id} as="li">
              <div className={styles.row}>
                {p.photoUrl ? (
                  <img src={mediaUrl(p.photoUrl)} alt={p.name} className={styles.thumb} />
                ) : (
                  <span className={styles.noPhoto}>
                    <ImageOff size={20} aria-hidden="true" />
                  </span>
                )}
                <div className={styles.info}>
                  <span className={styles.name}>
                    {p.name}
                    <Badge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {p.status === 'ACTIVE' ? 'Activo' : 'Agotado'}
                    </Badge>
                  </span>
                  <span className={styles.meta}>
                    {CATEGORY_LABELS[p.category]} · {p.municipality} · {formatMoney(p.price)} /{' '}
                    {UNIT_LABELS[p.unit].toLowerCase()}
                  </span>
                </div>
                <div className={styles.actions}>
                  <ButtonLink to={`/mis-productos/${p.id}/editar`} variant="secondary" size="sm">
                    <Pencil size={14} aria-hidden="true" />
                    Editar
                  </ButtonLink>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyId === p.id}
                    onClick={() => toggleStatus(p)}
                  >
                    Marcar {p.status === 'ACTIVE' ? 'agotado' : 'activo'}
                  </Button>
                  <IconButton
                    icon={<Trash2 size={16} aria-hidden="true" />}
                    label={`Eliminar ${p.name}`}
                    variant="danger"
                    disabled={busyId === p.id}
                    onClick={() => setConfirmTarget(p)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Eliminar producto"
        body={
          confirmTarget
            ? `"${confirmTarget.name}" no aparecerá más en el catálogo. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        loading={busyId !== null && confirmTarget !== null && busyId === confirmTarget.id}
        onConfirm={confirmRemove}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  );
}
