import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { getFarmProfile, saveFarmProfile, type FarmProfileInput } from '../auth/api';
import { useAuth } from '../auth/AuthContext';

const emptyForm: FarmProfileInput = { department: '', municipality: '', village: '', farmName: '' };

export function FarmProfilePage() {
  const { auth } = useAuth();
  const [form, setForm] = useState<FarmProfileInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!auth) return;
    getFarmProfile(auth.token)
      .then((profile) => setForm(profile))
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(err instanceof ApiError ? err.message : 'Error al cargar el perfil');
        }
      })
      .finally(() => setLoading(false));
  }, [auth]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setError(null);
    setSaved(false);
    try {
      const updated = await saveFarmProfile(auth.token, form);
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar el perfil');
    }
  }

  if (loading) {
    return <p>Cargando perfil...</p>;
  }

  return (
    <main>
      <h1>Perfil de finca</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Departamento
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            required
          />
        </label>
        <label>
          Municipio
          <input
            value={form.municipality}
            onChange={(e) => setForm({ ...form, municipality: e.target.value })}
            required
          />
        </label>
        <label>
          Vereda
          <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} required />
        </label>
        <label>
          Nombre de la finca
          <input value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} required />
        </label>
        {error && <p role="alert">{error}</p>}
        {saved && <p>Perfil guardado.</p>}
        <button type="submit">Guardar</button>
      </form>
    </main>
  );
}
