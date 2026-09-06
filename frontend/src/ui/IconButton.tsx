import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import styles from './IconButton.module.css';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Ícono (ej. `<Trash2 size={16} />`). */
  icon: ReactNode;
  /** Etiqueta accesible — obligatoria: el botón no tiene texto visible. */
  label: string;
  variant?: 'default' | 'danger';
}

export function IconButton({
  icon,
  label,
  variant = 'default',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.iconBtn, variant === 'danger' && styles.danger, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </button>
  );
}
