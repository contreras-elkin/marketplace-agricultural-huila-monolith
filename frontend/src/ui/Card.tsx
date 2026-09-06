import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Card.module.css';

type CardElement = 'div' | 'li' | 'article' | 'section';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md';
}

const PAD_CLASS = { none: styles.padNone, sm: styles.padSm, md: styles.padMd } as const;

export function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cx(styles.card, PAD_CLASS[padding], interactive && styles.interactive, className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
