import {
  Bell,
  MessageSquare,
  Package,
  ShoppingBasket,
  Tractor,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Wordmark } from '../components/Wordmark';
import { ButtonLink } from '../ui/ButtonLink';
import { PageHeader } from '../ui/PageHeader';
import styles from './HomePage.module.css';

interface Access {
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

const BUYER_ACCESS: Access[] = [
  { to: '/catalogo', icon: ShoppingBasket, title: 'Catálogo', desc: 'Explorá productos por categoría y municipio.' },
  { to: '/chat', icon: MessageSquare, title: 'Conversaciones', desc: 'Tus chats con productores.' },
  { to: '/notificaciones', icon: Bell, title: 'Notificaciones', desc: 'Novedades de tus compras y mensajes.' },
];

const PRODUCER_ACCESS: Access[] = [
  { to: '/mis-productos', icon: Package, title: 'Mis productos', desc: 'Publicá y administrá tu catálogo.' },
  { to: '/mis-ventas', icon: TrendingUp, title: 'Mis ventas', desc: 'Ventas por la plataforma y dispersión.' },
  { to: '/chat', icon: MessageSquare, title: 'Conversaciones', desc: 'Tus chats con compradores.' },
  { to: '/notificaciones', icon: Bell, title: 'Notificaciones', desc: 'Nuevos mensajes y pagos confirmados.' },
  { to: '/farm-profile', icon: Tractor, title: 'Perfil de finca', desc: 'Departamento, municipio, vereda y finca.' },
  { to: '/catalogo', icon: ShoppingBasket, title: 'Catálogo', desc: 'Mirá lo que publican otros productores.' },
];

function AccessTile({ to, icon: Icon, title, desc }: Access) {
  return (
    <Link to={to} className={styles.tile}>
      <span className={styles.tileIcon}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span>
        <span className={styles.tileTitle}>{title}</span>
        <br />
        <span className={styles.tileDesc}>{desc}</span>
      </span>
    </Link>
  );
}

export function HomePage() {
  const { auth } = useAuth();

  if (!auth) {
    return (
      <section className={styles.hero}>
        <Wordmark size="lg" />
        <p className={styles.tagline}>
          Comprá y vendé productos agrícolas del Huila directamente entre productor y comprador,
          sin intermediarios.
        </p>
        <div className={styles.heroActions}>
          <ButtonLink to="/catalogo">Ver catálogo</ButtonLink>
          <ButtonLink to="/register" variant="secondary">
            Crear cuenta
          </ButtonLink>
        </div>
      </section>
    );
  }

  const access = auth.role === 'PRODUCER' ? PRODUCER_ACCESS : BUYER_ACCESS;

  return (
    <>
      <PageHeader
        title={`Hola, ${auth.name}`}
        subtitle={auth.role === 'PRODUCER' ? 'Cuenta de productor' : 'Cuenta de comprador'}
      />
      <div className={styles.grid}>
        {access.map((a) => (
          <AccessTile key={a.to} {...a} />
        ))}
      </div>
    </>
  );
}
