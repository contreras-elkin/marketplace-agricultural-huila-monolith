import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { getFarmProfile, saveFarmProfile, type FarmProfileInput } from '../auth/api';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../ui/Alert';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { LoadingBlock } from '../ui/LoadingBlock';
import { PageHeader } from '../ui/PageHeader';
import { useToast } from '../ui/toast/useToast';
import styles from './ProductFormPage.module.css';

const emptyForm: FarmProfileInput = { department: '', municipality: '', village: '', farmName: '' };

export function FarmProfilePage() {
  const { auth } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<FarmProfileInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const updated = await saveFarmProfile(auth.token, form);
      setForm(updated);
      toast.success('Perfil de finca guardado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar el perfil');
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Perfil de finca' }]} />
      <PageHeader
        title="Perfil de finca"
        subtitle="Ubicación de tu finca. Se usa para prellenar el municipio de tus productos."
      />

      {loading ? (
        <LoadingBlock label="Cargando perfil…" />
      ) : (
        <Card>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.grid2}>
              <Field label="Departamento" required>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  required
                />
              </Field>
              <Field label="Municipio" required>
                <input
                  value={form.municipality}
                  onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                  required
                />
              </Field>
              <Field label="Vereda" required>
                <input
                  value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                  required
                />
              </Field>
              <Field label="Nombre de la finca" required>
                <input
                  value={form.farmName}
                  onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                  required
                />
              </Field>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <div className={styles.actions}>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
