import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  // exige que sea el dueño, se valida en el PUT). Creación: prellenó el municipio
  // con el del perfil de finca del productor (editable).
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
      const product = isEdit && editId
        ? await updateProduct(auth.token, editId, input)
        : await createProduct(auth.token, input);
      if (photoFile) {
        await uploadProductPhoto(auth.token, product.id, photoFile);
      }
      navigate('/mis-productos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el producto');
      setSubmitting(false);
    }
  }

  if (loading) return <p>Cargando producto...</p>;

  return (
    <main>
      <p>
        <Link to="/mis-productos">← Mis productos</Link>
      </p>
      <h1>{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} required />
        </label>
        <label>
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Unidad de venta
          <select value={unit} onChange={(e) => setUnit(e.target.value as ProductUnit)}>
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cantidad disponible
          <input
            type="number"
            min="0"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>
        <label>
          Precio (COP por unidad)
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label>
          Municipio
          <input
            list="huila-municipalities"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            maxLength={100}
            required
          />
        </label>
        <datalist id="huila-municipalities">
          {HUILA_MUNICIPALITIES.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <label>
          Foto {isEdit ? '(reemplaza la actual)' : '(opcional)'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {currentPhotoUrl && !photoFile && (
          <img src={mediaUrl(currentPhotoUrl)} alt="Foto actual" style={{ maxWidth: 200, borderRadius: 4 }} />
        )}

        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar producto'}
        </button>
      </form>
    </main>
  );
}
