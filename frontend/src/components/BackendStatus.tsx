import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { cx } from '../ui/cx';
import styles from './BackendStatus.module.css';

type State = 'loading' | 'ok' | 'down';

const LABEL: Record<State, string> = {
  loading: 'verificando backend…',
  ok: 'backend operativo',
  down: 'backend no disponible',
};

/** Indicador discreto del estado del backend (antes vivía inline en Home). */
export function BackendStatus() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let active = true;
    apiGet<{ status: string }>('/health')
      .then(() => active && setState('ok'))
      .catch(() => active && setState('down'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <span className={styles.status} title={LABEL[state]}>
      <span className={cx(styles.dot, styles[state])} aria-hidden="true" />
      <span>{LABEL[state]}</span>
    </span>
  );
}
