import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cx } from './cx';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** El control del formulario: `<input>`, `<select>` o `<textarea>`. */
  children: ReactElement<{ className?: string }>;
  className?: string;
}

/**
 * Envuelve un control con label, hint y error, asociándolos por id y marcando
 * `aria-invalid` / `aria-describedby`. Unifica la maquetación de todos los campos.
 */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        className: cx(styles.control, children.props.className),
      } as Partial<typeof children.props> & Record<string, unknown>)
    : children;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.req} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {control}
      {hintId && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {errId && (
        <p id={errId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
