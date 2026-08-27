import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../auth/types';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: Role;
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { auth } = useAuth();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  if (role && auth.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
