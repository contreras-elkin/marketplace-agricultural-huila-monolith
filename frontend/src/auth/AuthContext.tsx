import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest } from './api';
import type { Role } from './types';

interface AuthState {
  token: string;
  userId: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  auth: AuthState | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * El JWT se persiste en `localStorage` (Épica 3): el chat necesita que la sesión
 * y el socket sobrevivan a un refresh. Al montar se rehidrata decodificando el
 * payload del token (sin verificar la firma — solo para leer `sub`/`name`/`role`
 * y `exp`); si está vencido, se descarta. La firma la sigue validando el backend
 * en cada llamada.
 */
const STORAGE_KEY = 'marketplace.token';

interface JwtClaims {
  sub: string;
  name: string;
  role: Role;
  exp: number;
}

function decodeToken(token: string): AuthState | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as JwtClaims;
    if (!claims.exp || claims.exp * 1000 <= Date.now()) {
      return null;
    }
    return { token, userId: claims.sub, name: claims.name, role: claims.role };
  } catch {
    return null;
  }
}

function readStoredAuth(): AuthState | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    return token ? decodeToken(token) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(readStoredAuth);

  useEffect(() => {
    // client.ts emite este evento cuando una llamada autenticada devuelve 401.
    function onExpired() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // localStorage no disponible (modo privado); no hay nada que limpiar.
      }
      setAuth(null);
    }
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      login: async (email, password) => {
        const response = await loginRequest(email, password);
        try {
          localStorage.setItem(STORAGE_KEY, response.token);
        } catch {
          // Sesión solo en memoria si no se puede persistir.
        }
        setAuth({
          token: response.token,
          userId: response.userId,
          name: response.name,
          role: response.role,
        });
      },
      logout: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // nada que limpiar
        }
        setAuth(null);
      },
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
