import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, mediaUrl } from '../api/client';
import { getFarmProfile } from '../auth/api';
import { useAuth } from '../auth/AuthContext';
import { createProduct, getProduct, updateProduct, uploadProductPhoto } from '../catalog/api';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  UNIT_LABELS,
  UNIT_OPTIONS,
  type ProductCategory,
  type ProductInput,
  type ProductUnit,
} from '../catalog/types';
import { Alert } from '../ui/Alert';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { ButtonLink } from '../ui/ButtonLink';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { LoadingBlock } from '../ui/LoadingBlock';
import { PageHeader } from '../ui/PageHeader';
import { useToast } from '../ui/toast/useToast';
import styles from './ProductFormPage.module.css';

// Municipios frecuentes del Huila — solo sugerencias del datalist, no una lista cerrada.
const HUILA_MUNICIPALITIES = [
  'Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'Gigante', 'Palermo', 'Rivera',
  'Aipe', 'Timaná', 'San Agustín', 'Isnos', 'Acevedo', 'Suaza', 'Tello', 'Baraya', 'Íquira',
];

export function ProductFormPage() {
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = Boolean(editId);
  const { auth } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('FRUTAS');
  const [unit, setUnit] = useState<ProductUnit>('KILOGRAMO');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edición: traigo el producto por el endpoint público de detalle (la propiedad
  // se valida en el PUT). Creación: prellenó el municipio con el del perfil de finca.
  useEffect(() => {
    if (!auth) return;
    if (isEdit && editId) {
      getProduct(editId)
        .then(({ product }) => {
          setName(product.name);
          setCategory(product.category);
          setUnit(product.unit);
          setQuantity(String(product.quantity));
          setPrice(String(product.price));
          setMunicipality(product.municipality);
          setCurrentPhotoUrl(product.photoUrl);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el producto'))
        .finally(() => setLoading(false));
    } else {
      getFarmProfile(auth.token)
        .then((profile) => setMunicipality((current) => current || profile.municipality))
        .catch(() => {
          /* sin perfil de finca todavía: se deja vacío */
        });
    }
  }, [auth, editId, isEdit]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setError(null);
    setSubmitting(true);
    try {
      const input: ProductInput = {
        name: name.trim(),
        category,
        unit,
        quantity: Number(quantity),
        price: Number(price),
        municipality: municipality.trim(),
      };
      const product =
        isEdit && editId
          ? await updateProduct(auth.token, editId, input)
          : await createProduct(auth.token, input);
      if (photoFile) {
        await uploadProductPhoto(auth.token, product.id, photoFile);
      }
      toast.success(isEdit ? 'Producto actualizado.' : 'Producto publicado.');
      navigate('/mis-productos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el producto');
      setSubmitting(false);
    }
  }

  const crumbs = [
    { label: 'Inicio', to: '/' },
    { label: 'Mis productos', to: '/mis-productos' },
    { label: isEdit ? 'Editar' : 'Nuevo' },
  ];

  if (loading) {
    return (
      <>
        <Breadcrumbs items={crumbs} />
        <LoadingBlock label="Cargando producto…" />
      </>
    );
  }

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <PageHeader title={isEdit ? 'Editar producto' : 'Nuevo producto'} />

      <Card>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Datos del producto</span>

            <Field label="Nombre" required>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} required />
            </Field>

            <div className={styles.grid2}>
              <Field label="Categoría">
                <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Unidad de venta">
                <select value={unit} onChange={(e) => setUnit(e.target.value as ProductUnit)}>
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className={styles.grid2}>
              <Field label="Cantidad disponible" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </Field>
              <Field label="Precio" hint="COP por unidad" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field label="Municipio" required>
              <input
                list="huila-municipalities"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                maxLength={100}
                required
              />
            </Field>
            <datalist id="huila-municipalities">
              {HUILA_MUNICIPALITIES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Foto</span>
            <Field label={isEdit ? 'Reemplazar la foto actual' : 'Foto (opcional)'}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            {currentPhotoUrl && !photoFile && (
              <img src={mediaUrl(currentPhotoUrl)} alt="Foto actual" className={styles.preview} />
            )}
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <div className={styles.actions}>
            <Button type="submit" loading={submitting}>
              {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Publicar producto'}
            </Button>
            <ButtonLink to="/mis-productos" variant="ghost">
              Cancelar
            </ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
