import { cx } from '../ui/cx';
import { BackendStatus } from './BackendStatus';
import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={cx('container', styles.inner)}>
        <span>Marketplace Agrícola Huila · Sistemas Distribuidos 2026-b · Proyecto académico</span>
        <BackendStatus />
      </div>
    </footer>
  );
}
