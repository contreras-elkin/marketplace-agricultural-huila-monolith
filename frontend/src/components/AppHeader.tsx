import { ChevronDown, LogOut, Tractor, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from '../ui/ButtonLink';
import { cx } from '../ui/cx';
import { NotificationsBell } from './NotificationsBell';
import { Wordmark } from './Wordmark';
import styles from './AppHeader.module.css';

function navClass({ isActive }: { isActive: boolean }) {
  return cx(styles.navLink, isActive && styles.navLinkActive);
}

function UserMenu() {
  const { auth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!auth) return null;

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.userButton}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserRound size={16} aria-hidden="true" />
        <span className={styles.userName}>{auth.name}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <span className={cx(styles.menuItem, 'subtle')} aria-hidden="true">
            {auth.role === 'PRODUCER' ? 'Productor' : 'Comprador'}
          </span>
          {auth.role === 'PRODUCER' && (
            <Link className={styles.menuItem} role="menuitem" to="/farm-profile" onClick={close}>
              <Tractor size={15} aria-hidden="true" />
              Perfil de finca
            </Link>
          )}
          <span className={styles.menuSep} />
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              close();
              logout();
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const { auth } = useAuth();

  return (
    <header className={styles.header}>
      <div className={cx('container', styles.inner)}>
        <Link to="/" className={styles.brand} aria-label="Ir al inicio">
          <Wordmark />
        </Link>

        <nav className={styles.nav} aria-label="Navegación principal">
          <NavLink to="/catalogo" className={navClass}>
            Catálogo
          </NavLink>

          {!auth && (
            <>
              <NavLink to="/login" className={navClass}>
                Ingresar
              </NavLink>
              <ButtonLink to="/register" size="sm">
                Crear cuenta
              </ButtonLink>
            </>
          )}

          {auth && (
            <>
              <NavLink to="/chat" className={navClass}>
                Conversaciones
              </NavLink>
              {auth.role === 'PRODUCER' && (
                <>
                  <NavLink to="/mis-productos" className={navClass}>
                    Mis productos
                  </NavLink>
                  <NavLink to="/mis-ventas" className={navClass}>
                    Mis ventas
                  </NavLink>
                </>
              )}
              <NotificationsBell />
              <UserMenu />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
