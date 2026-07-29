import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeStatus = 'stable' | 'caution' | 'critical';

interface BadgeProps {
  status?: BadgeStatus;
  children: ReactNode;
}

export function Badge({ status = 'stable', children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      <span className={styles.dot} />
      {children}
    </span>
  );
}
