import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Dropdown.module.css';

export interface DropdownItem {
  id: string;
  label: string;
  /** Small mono hint on the right (e.g. a shortcut or subtype tag). */
  hint?: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface DropdownProps {
  /** Trigger contents — pairs well with a <Button variant="ghost" />-style look. */
  label: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

/**
 * Click-to-open menu. Also works as the hover dropdown for card
 * subtypes (e.g. Note Card → Document Card) — see README.
 */
export function Dropdown({ label, items, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <span className={`${styles.chevron} ${open ? styles.chevronUp : ''}`}>▾</span>
      </button>

      {open && (
        <div className={`${styles.menu} ${align === 'right' ? styles.right : ''}`} role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              className={`${styles.item} ${item.danger ? styles.itemDanger : ''}`}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.icon && <span className={styles.icon}>{item.icon}</span>}
              <span className={styles.itemLabel}>{item.label}</span>
              {item.hint && <span className={styles.hint}>{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
