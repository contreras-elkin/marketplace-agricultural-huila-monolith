import { initials } from '../lib/initials';
import { cx } from './cx';
import styles from './Avatar.module.css';

/** Avatar circular con iniciales del nombre. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cx(styles.avatar, styles[size])} aria-hidden="true" title={name}>
      {initials(name)}
    </span>
  );
}
