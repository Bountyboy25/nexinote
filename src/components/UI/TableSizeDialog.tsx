import { useState } from 'react'
import styles from './TableSizeDialog.module.css'

// ─────────────────────────────────────────────────────────────
// TABLE SIZE DIALOG — Pre-creation row/column picker
//
// Shows before a table card is placed on the canvas.
// User specifies rows (1–20) and columns (1–10), then confirms.
// ─────────────────────────────────────────────────────────────

interface Props {
  onConfirm: (rows: number, cols: number) => void
  onCancel:  () => void
}

export function TableSizeDialog({ onConfirm, onCancel }: Props) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)

  function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v))
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>Create Table</h3>

        <div className={styles.field}>
          <label className={styles.label}>Rows</label>
          <div className={styles.stepper}>
            <button className={styles.stepBtn} onClick={() => setRows(r => clamp(r - 1, 1, 20))}>−</button>
            <input
              className={styles.stepInput}
              type="number"
              min={1} max={20}
              value={rows}
              onChange={e => setRows(clamp(parseInt(e.target.value) || 1, 1, 20))}
            />
            <button className={styles.stepBtn} onClick={() => setRows(r => clamp(r + 1, 1, 20))}>+</button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Columns</label>
          <div className={styles.stepper}>
            <button className={styles.stepBtn} onClick={() => setCols(c => clamp(c - 1, 1, 10))}>−</button>
            <input
              className={styles.stepInput}
              type="number"
              min={1} max={10}
              value={cols}
              onChange={e => setCols(clamp(parseInt(e.target.value) || 1, 1, 10))}
            />
            <button className={styles.stepBtn} onClick={() => setCols(c => clamp(c + 1, 1, 10))}>+</button>
          </div>
        </div>

        {/* Preview grid */}
        <div
          className={styles.preview}
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows:    `repeat(${rows}, 1fr)`,
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div key={i} className={styles.previewCell} />
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button className={styles.confirm} onClick={() => onConfirm(rows, cols)}>
            Create {rows}×{cols} Table
          </button>
        </div>
      </div>
    </div>
  )
}
