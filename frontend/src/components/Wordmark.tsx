import { Sprout } from 'lucide-react';
import { cx } from '../ui/cx';
import styles from './Wordmark.module.css';

/** Marca de la app: brote + "Marketplace Agrícola Huila". Solo visual (no es un link). */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={cx(styles.wordmark, size === 'lg' && styles.lg)}>
      <span className={styles.mark}>
        <Sprout size={size === 'lg' ? 22 : 16} aria-hidden="true" />
      </span>
      <span className={styles.text}>
        Marketplace <span className={styles.accent}>Agrícola Huila</span>
      </span>
    </span>
  );
}
