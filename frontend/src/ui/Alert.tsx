import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Alert.module.css';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  /** Oculta el ícono de la izquierda. */
  hideIcon?: boolean;
  className?: string;
}

const ICON = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

export function Alert({ variant = 'info', children, hideIcon = false, className }: AlertProps) {
  const Icon = ICON[variant];
  return (
    <div
      className={cx(styles.alert, styles[variant], className)}
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
    >
      {!hideIcon && <Icon size={16} aria-hidden="true" />}
      <span className={styles.body}>{children}</span>
    </div>
  );
}
