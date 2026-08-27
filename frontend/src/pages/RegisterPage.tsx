import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { register } from '../auth/api';
import type { Role } from '../auth/types';

export function RegisterPage() {
  const navigate = useNavigate();
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
      navigate('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Registro</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <fieldset>
          <legend>Rol</legend>
          <label>
            <input
              type="radio"
              name="role"
              value="BUYER"
              checked={role === 'BUYER'}
              onChange={() => setRole('BUYER')}
            />
            Comprador
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="PRODUCER"
              checked={role === 'PRODUCER'}
              onChange={() => setRole('PRODUCER')}
            />
            Productor
          </label>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Registrando...' : 'Registrarme'}
        </button>
      </form>
      <p>
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </main>
  );
}
