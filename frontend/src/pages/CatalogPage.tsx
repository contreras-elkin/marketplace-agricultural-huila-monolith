import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, mediaUrl } from '../api/client';
import { browseCatalog } from '../catalog/api';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  UNIT_LABELS,
  type Product,
  type ProductCategory,
} from '../catalog/types';

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros aplicados (los que se enviaron), separados de los que se están editando.
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [municipality, setMunicipality] = useState('');
  const [applied, setApplied] = useState({ category: '' as ProductCategory | '', municipality: '' });

  useEffect(() => {
    let active = true;
    browseCatalog(applied)
      .then((list) => {
        if (!active) return;
        setProducts(list);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Error al cargar el catálogo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied]);

  return (
    <main>
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Catálogo</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ category, municipality });
        }}
      >
        <label>
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory | '')}>
            <option value="">Todas</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Municipio
          <input
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            placeholder="Ej. Pitalito"
          />
        </label>
        <button type="submit">Filtrar</button>
        {(applied.category || applied.municipality) && (
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setMunicipality('');
              setApplied({ category: '', municipality: '' });
            }}
          >
            Limpiar
          </button>
        )}
      </form>

      {loading && <p>Cargando catálogo...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && products.length === 0 && <p>No hay productos que coincidan con el filtro.</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {products.map((p) => (
          <li key={p.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: '0.75rem' }}>
            <Link to={`/productos/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              {p.photoUrl ? (
                <img
                  src={mediaUrl(p.photoUrl)}
                  alt={p.name}
                  style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 4 }}
                />
              ) : (
                <div style={{ width: '100%', height: 140, background: '#eee', borderRadius: 4, display: 'grid', placeItems: 'center', color: '#888' }}>
                  Sin foto
                </div>
              )}
              <h3 style={{ margin: '0.5rem 0 0.25rem' }}>{p.name}</h3>
              <p style={{ margin: 0 }}>{CATEGORY_LABELS[p.category]} · {p.municipality}</p>
              <p style={{ margin: '0.25rem 0 0', fontWeight: 'bold' }}>
                ${p.price.toLocaleString('es-CO')} / {UNIT_LABELS[p.unit].toLowerCase()}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
