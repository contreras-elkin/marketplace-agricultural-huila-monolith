import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      login: async (email, password) => {
        const response = await loginRequest(email, password);
        setAuth({
          token: response.token,
          userId: response.userId,
          name: response.name,
          role: response.role,
        });
      },
      logout: () => setAuth(null),
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
