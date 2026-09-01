import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { apiGet } from './api/client';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CatalogPage } from './pages/CatalogPage';
import { ConversationPage } from './pages/ConversationPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { FarmProfilePage } from './pages/FarmProfilePage';
import { LoginPage } from './pages/LoginPage';
import { MyProductsPage } from './pages/MyProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { RegisterPage } from './pages/RegisterPage';

interface HealthResponse {
  status: string;
}

type HealthState =
  | { phase: 'loading' }
  | { phase: 'ok'; status: string }
  | { phase: 'error'; message: string };

function Home() {
  const { auth, logout } = useAuth();
  const [health, setHealth] = useState<HealthState>({ phase: 'loading' });

  useEffect(() => {
    apiGet<HealthResponse>('/health')
      .then((data) => setHealth({ phase: 'ok', status: data.status }))
      .catch((err) => setHealth({ phase: 'error', message: err.message }));
  }, []);

  return (
    <main>
      <h1>Marketplace Agrícola Huila</h1>
      <p>
        Estado del backend:{' '}
        {health.phase === 'loading' && 'consultando...'}
        {health.phase === 'ok' && health.status}
        {health.phase === 'error' && `error (${health.message})`}
      </p>
      <p>
        <Link to="/catalogo">Ver catálogo</Link>
      </p>
      {auth ? (
        <div>
          <p>
            Sesión iniciada como {auth.name} ({auth.role === 'PRODUCER' ? 'Productor' : 'Comprador'})
          </p>
          <p>
            <Link to="/chat">Mis conversaciones</Link>
            {auth.role === 'PRODUCER' && (
              <>
                {' · '}
                <Link to="/mis-productos">Mis productos</Link> ·{' '}
                <Link to="/farm-profile">Editar perfil de finca</Link>
              </>
            )}
          </p>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      ) : (
        <p>
          <Link to="/login">Iniciar sesión</Link> · <Link to="/register">Registrarme</Link>
        </p>
      )}
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route path="/productos/:id" element={<ProductDetailPage />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ConversationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <ProtectedRoute>
            <ConversationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farm-profile"
        element={
          <ProtectedRoute role="PRODUCER">
            <FarmProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-productos"
        element={
          <ProtectedRoute role="PRODUCER">
            <MyProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-productos/nuevo"
        element={
          <ProtectedRoute role="PRODUCER">
            <ProductFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-productos/:id/editar"
        element={
          <ProtectedRoute role="PRODUCER">
            <ProductFormPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
