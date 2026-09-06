import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CatalogPage } from './pages/CatalogPage';
import { ConversationPage } from './pages/ConversationPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { FarmProfilePage } from './pages/FarmProfilePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyProductsPage } from './pages/MyProductsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProducerSalesPage } from './pages/ProducerSalesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { RegisterPage } from './pages/RegisterPage';
import { TransactionStatusPage } from './pages/TransactionStatusPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
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
          path="/notificaciones"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transacciones/:id"
          element={
            <ProtectedRoute>
              <TransactionStatusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-ventas"
          element={
            <ProtectedRoute role="PRODUCER">
              <ProducerSalesPage />
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
