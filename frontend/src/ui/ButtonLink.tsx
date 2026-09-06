import { Link, type LinkProps } from 'react-router-dom';
import { cx } from './cx';
import type { ButtonSize, ButtonVariant } from './Button';
import styles from './Button.module.css';

interface ButtonLinkProps extends Omit<LinkProps, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

/** Un `<Link>` de react-router con la apariencia de `<Button>` (para CTAs de navegación). */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(styles.btn, styles[variant], styles[size], block && styles.block, className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
