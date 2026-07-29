import type { ReactNode } from 'react';
import { Badge, type BadgeStatus } from './Badge';
import styles from './ReactorGauge.module.css';

// ─────────────────────────────────────────────────────────────
// REACTOR GAUGE — signature Nuclear Nexus status element.
// Ring gauge + pulsing core dot + % readout + status badge.
// Fully theme-driven: every color reads a --nx-* token.
// ─────────────────────────────────────────────────────────────

const R = 44;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface ReactorGaugeProps {
  /** 0–100 output percentage shown in the ring */
  value: number;
  /** Heading, e.g. "Cherenkov core online" */
  title: string;
  /** Supporting line under the heading */
  subtitle?: ReactNode;
  /** stable | caution | critical */
  status?: BadgeStatus;
  /** Badge label; defaults to the status name */
  statusLabel?: string;
}

export function ReactorGauge({
  value,
  title,
  subtitle,
  status = 'stable',
  statusLabel,
}: ReactorGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={styles.panel}>
      <div className={styles.ring}>
        <svg width="104" height="104" viewBox="0 0 104 104">
          <circle className={styles.track} cx="52" cy="52" r={R} fill="none" strokeWidth="7" />
          <circle
            className={styles.fill}
            cx="52" cy="52" r={R} fill="none" strokeWidth="7"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
          />
        </svg>
        <div className={styles.coreDot} />
        <div className={styles.value}>{Math.round(clamped)}%</div>
      </div>
      <div className={styles.meta}>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        <div className={styles.badges}>
          <Badge status={status}>{statusLabel ?? status}</Badge>
        </div>
      </div>
    </div>
  );
}
