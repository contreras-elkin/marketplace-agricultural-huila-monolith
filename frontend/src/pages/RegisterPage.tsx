import { ShoppingBasket, Tractor } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { register } from '../auth/api';
import type { Role } from '../auth/types';
import { Wordmark } from '../components/Wordmark';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { Field } from '../ui/Field';
import { PageHeader } from '../ui/PageHeader';
import { useToast } from '../ui/toast/useToast';
import styles from './authShell.module.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password, role);
      toast.success('Cuenta creada. Ya podés iniciar sesión.');
      navigate('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Link to="/" aria-label="Ir al inicio">
        <Wordmark size="lg" />
      </Link>

      <Card className={styles.card}>
        <PageHeader title="Crear cuenta" />
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Nombre" required>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
          <Field label="Correo" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Contraseña" hint="Mínimo 8 caracteres." required>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          <fieldset>
            <legend className={styles.roleLabel}>Rol</legend>
            <div className={styles.roles}>
              <label className={cx(styles.role, role === 'BUYER' && styles.roleActive)}>
                <input
                  type="radio"
                  name="role"
                  value="BUYER"
                  checked={role === 'BUYER'}
                  onChange={() => setRole('BUYER')}
                  className="visually-hidden"
                />
                <ShoppingBasket size={20} aria-hidden="true" />
                <span className={styles.roleLabel}>Comprador</span>
                Navego y compro productos
              </label>
              <label className={cx(styles.role, role === 'PRODUCER' && styles.roleActive)}>
                <input
                  type="radio"
                  name="role"
                  value="PRODUCER"
                  checked={role === 'PRODUCER'}
                  onChange={() => setRole('PRODUCER')}
                  className="visually-hidden"
                />
                <Tractor size={20} aria-hidden="true" />
                <span className={styles.roleLabel}>Productor</span>
                Publico y vendo productos
              </label>
            </div>
          </fieldset>

          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" block loading={submitting}>
            {submitting ? 'Registrando…' : 'Registrarme'}
          </Button>
        </form>
      </Card>

      <p className={styles.foot}>
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </div>
  );
}
