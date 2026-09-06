import { cx } from './cx';
import styles from './Skeleton.module.css';

/** Barra gris con shimmer. `width` acepta cualquier valor CSS. */
export function SkeletonLine({ width, className }: { width?: string; className?: string }) {
  return (
    <span
      className={cx(styles.base, styles.line, className)}
      style={width ? { width } : undefined}
      aria-hidden="true"
    />
  );
}

/** Placeholder de tarjeta con miniatura (para la grilla del catálogo). */
export function SkeletonCard({ withThumb = true }: { withThumb?: boolean }) {
  return (
    <div className={styles.card} aria-hidden="true">
      {withThumb && <span className={cx(styles.base, styles.thumb)} />}
      <SkeletonLine width="70%" />
      <SkeletonLine width="45%" />
      <SkeletonLine width="55%" />
    </div>
  );
}

/** N tarjetas skeleton, con aviso accesible de carga. */
export function SkeletonGrid({ count = 6, withThumb = true }: { count?: number; withThumb?: boolean }) {
  return (
    <>
      <span className="visually-hidden" role="status">
        Cargando…
      </span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} withThumb={withThumb} />
      ))}
    </>
  );
}
