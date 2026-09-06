import styles from './Spinner.module.css';

interface SpinnerProps {
  /** Diámetro en px (default 18). */
  size?: number;
  /** Grosor del anillo en px (default 2). */
  thickness?: number;
  className?: string;
}

/** Indicador de carga puramente visual. El texto accesible lo pone el contenedor. */
export function Spinner({ size = 18, thickness = 2, className }: SpinnerProps) {
  return (
    <span
      className={[styles.spinner, className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, borderWidth: thickness }}
      aria-hidden="true"
    />
  );
}
