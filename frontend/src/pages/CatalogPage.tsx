import { ImageOff, MapPin, PackageSearch } from 'lucide-react';
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
import { formatMoney } from '../lib/format';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Field } from '../ui/Field';
import { PageHeader } from '../ui/PageHeader';
import { SkeletonGrid } from '../ui/Skeleton';
import styles from './CatalogPage.module.css';

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros que se están editando, separados de los aplicados (los que se enviaron).
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

  const hasFilter = Boolean(applied.category || applied.municipality);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Catálogo' }]} />
      <PageHeader title="Catálogo" subtitle="Productos disponibles de productores del Huila." />

      <form
        className={styles.filters}
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ category, municipality });
        }}
      >
        <Field label="Categoría" className={styles.filterField}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory | '')}
          >
            <option value="">Todas</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Municipio" className={styles.filterField}>
          <input
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            placeholder="Ej. Pitalito"
          />
        </Field>
        <Button type="submit">Filtrar</Button>
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCategory('');
              setMunicipality('');
              setApplied({ category: '', municipality: '' });
            }}
          >
            Limpiar
          </Button>
        )}
      </form>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <ul className={styles.grid}>
          <SkeletonGrid count={8} />
        </ul>
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No hay productos que coincidan"
          description={
            hasFilter
              ? 'Probá con otra categoría o municipio.'
              : 'Todavía no hay productos publicados.'
          }
        />
      ) : (
        <ul className={styles.grid}>
          {products.map((p) => (
            <Card key={p.id} as="li" interactive className={styles.card}>
              <Link to={`/productos/${p.id}`} className={styles.link}>
                {p.photoUrl ? (
                  <img src={mediaUrl(p.photoUrl)} alt={p.name} className={styles.thumb} />
                ) : (
                  <div className={styles.noPhoto}>
                    <ImageOff size={20} aria-hidden="true" />
                    Sin foto
                  </div>
                )}
                <div className={styles.body}>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.meta}>
                    <MapPin size={13} aria-hidden="true" />
                    {CATEGORY_LABELS[p.category]} · {p.municipality}
                  </span>
                  {p.status === 'SOLD_OUT' && <Badge variant="neutral">Agotado</Badge>}
                  <span className={styles.price}>
                    {formatMoney(p.price)}{' '}
                    <span className={styles.priceUnit}>/ {UNIT_LABELS[p.unit].toLowerCase()}</span>
                  </span>
                </div>
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
