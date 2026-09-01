import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, mediaUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { changeProductStatus, deleteProduct, getMyProducts } from '../catalog/api';
import { CATEGORY_LABELS, UNIT_LABELS, type Product } from '../catalog/types';

export function MyProductsPage() {
  const { auth } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(product: Product) {
    if (!auth) return;
    if (!window.confirm(`¿Eliminar "${product.name}"? No aparecerá más en el catálogo.`)) return;
    setBusyId(product.id);
    setError(null);
    try {
      await deleteProduct(auth.token, product.id);
      setProducts((list) => list.filter((p) => p.id !== product.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main>
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Mis productos</h1>
      <p>
        <Link to="/mis-productos/nuevo">+ Nuevo producto</Link>
      </p>

      {loading && <p>Cargando...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && products.length === 0 && <p>Todavía no publicaste ningún producto.</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
        {products.map((p) => (
          <li
            key={p.id}
            style={{ border: '1px solid #ccc', borderRadius: 8, padding: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}
          >
            {p.photoUrl ? (
              <img src={mediaUrl(p.photoUrl)} alt={p.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4 }} />
            ) : (
              <div style={{ width: 72, height: 72, background: '#eee', borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 12, color: '#888' }}>
                Sin foto
              </div>
            )}
            <div style={{ flex: 1 }}>
              <strong>{p.name}</strong>{' '}
              <span style={{ color: p.status === 'ACTIVE' ? '#1a7f37' : '#a15c00' }}>
                ({p.status === 'ACTIVE' ? 'Activo' : 'Agotado'})
              </span>
              <br />
              {CATEGORY_LABELS[p.category]} · {p.municipality} · ${p.price.toLocaleString('es-CO')} /{' '}
              {UNIT_LABELS[p.unit].toLowerCase()}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to={`/mis-productos/${p.id}/editar`}>Editar</Link>
              <button type="button" disabled={busyId === p.id} onClick={() => toggleStatus(p)}>
                Marcar {p.status === 'ACTIVE' ? 'agotado' : 'activo'}
              </button>
              <button type="button" disabled={busyId === p.id} onClick={() => remove(p)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
