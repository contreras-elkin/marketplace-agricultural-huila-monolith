import { Spinner } from './Spinner';
import styles from './LoadingBlock.module.css';

/** Carga centrada para vistas que resuelven un solo objeto (detalle, formularios). */
export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className={styles.block} role="status">
      <Spinner size={24} thickness={3} />
      <span>{label}</span>
    </div>
  );
}
