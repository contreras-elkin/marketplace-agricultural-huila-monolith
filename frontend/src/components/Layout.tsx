import { Outlet } from 'react-router-dom';
import { cx } from '../ui/cx';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import styles from './Layout.module.css';

/** Shell común: header pegajoso + contenido de la ruta + footer. */
export function Layout() {
  return (
    <div className={styles.shell}>
      <AppHeader />
      <main className={cx('container', styles.main)}>
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
