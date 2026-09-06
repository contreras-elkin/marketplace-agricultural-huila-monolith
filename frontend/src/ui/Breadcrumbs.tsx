import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  to?: string;
}

/** Ruta de navegación. El último ítem se muestra como actual (sin enlace). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className={styles.nav} aria-label="Ruta de navegación">
      <ol className={styles.list}>
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              <li className={styles.item}>
                {crumb.to && !last ? (
                  <Link className={styles.link} to={crumb.to}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={last ? styles.current : undefined} aria-current={last ? 'page' : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
              {!last && <ChevronRight className={styles.sep} size={14} aria-hidden="true" />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
