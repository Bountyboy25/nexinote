import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

export interface ToolbarAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface ToolbarProps {
  /** Always-visible tools: select, note, task, table, connector, board… */
  actions: ToolbarAction[];
  /**
   * Context tools that slide in below a divider when something is
   * selected. Drive this from your canvas store, e.g. show Tiptap
   * formatting actions when the selection is a note card:
   *
   *   const selected = useCanvasStore((s) => s.selectedIds);
   *   const ctx = selectedIsNote ? noteFormattingActions : [];
   */
  contextActions?: ToolbarAction[];
  /** Pinned to the bottom of the rail (e.g. settings / theme button). */
  footer?: ReactNode;
}

export function Toolbar({ actions, contextActions = [], footer }: ToolbarProps) {
  return (
    <nav className={styles.rail} aria-label="Canvas tools">
      {actions.map((a) => (
        <ToolButton key={a.id} action={a} />
      ))}

      {contextActions.length > 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.context}>
            {contextActions.map((a) => (
              <ToolButton key={a.id} action={a} />
            ))}
          </div>
        </>
      )}

      {footer && (
        <>
          <div className={styles.spacer} />
          <div className={styles.divider} />
          {footer}
        </>
      )}
    </nav>
  );
}

function ToolButton({ action }: { action: ToolbarAction }) {
  return (
    <button
      className={`${styles.tool} ${action.active ? styles.active : ''}`}
      onClick={action.onClick}
      aria-label={action.label}
      aria-pressed={action.active}
    >
      {action.icon}
      <span className={styles.tip}>{action.label}</span>
    </button>
  );
}
