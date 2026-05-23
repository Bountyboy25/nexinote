import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import type { TableCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// TABLE CARD CONTENT — Mini spreadsheet with rich text cells
//
// Cell model (stored as string[][]):
//   - Starts with '='  → formula cell → plain <input>
//   - Anything else    → rich text cell → contentEditable <div>
//     (HTML is stored; execCommand from SideTaskbar formats it)
//
// Formula evaluator strips HTML tags before parsing so a cell
// containing <b>5</b> still counts as numeric value 5 when
// referenced from another formula.
//
// Supported formulas: =A1+B1, =SUM(A1:A3), =AVG(A1:B2)
// ─────────────────────────────────────────────────────────────

interface Props { card: TableCard }

const MAX_DEPTH = 32
const REF_RE   = /^([A-Za-z])(\d+)$/
const RANGE_RE = /^([A-Za-z]\d+):([A-Za-z]\d+)$/
const SUM_RE   = /^SUM\(([A-Za-z]\d+:[A-Za-z]\d+)\)$/i
const AVG_RE   = /^AVG\(([A-Za-z]\d+:[A-Za-z]\d+)\)$/i
const BINOP_RE = /^([A-Za-z]\d+|[\d.]+)\s*([+\-*/])\s*([A-Za-z]\d+|[\d.]+)$/

function colIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65
}

/** Strip HTML tags to get plain text for formula evaluation */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim()
}

function isFormulaCell(raw: string): boolean {
  // Formulas are plain strings starting with '='
  // HTML never starts with '=', so this is unambiguous
  return raw.startsWith('=')
}

function parseRef(ref: string, rows: string[][], depth: number): number {
  const m = REF_RE.exec(ref)
  if (!m) return NaN
  const raw = rows[parseInt(m[2], 10) - 1]?.[colIndex(m[1])] ?? ''
  return evaluateCell(raw, rows, depth + 1)
}

function parseRange(ref: string, rows: string[][], depth: number): number[] {
  const m = RANGE_RE.exec(ref)
  if (!m) return []
  const sm = REF_RE.exec(m[1])!
  const em = REF_RE.exec(m[2])!
  const r1 = parseInt(sm[2], 10) - 1, r2 = parseInt(em[2], 10) - 1
  const c1 = colIndex(sm[1]),          c2 = colIndex(em[1])
  const vals: number[] = []
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++)
      vals.push(evaluateCell(rows[r]?.[c] ?? '', rows, depth + 1))
  return vals
}

function evaluateCell(raw: string, rows: string[][], depth = 0): number {
  if (depth > MAX_DEPTH) return NaN
  // Strip HTML so rich-text cells (e.g. <b>5</b>) work as numeric references
  const text = stripHtml(raw)
  if (!text.startsWith('=')) return parseFloat(text) || 0
  const expr = text.slice(1).trim()
  const sumM = SUM_RE.exec(expr)
  if (sumM) return parseRange(sumM[1], rows, depth).reduce((a, b) => a + b, 0)
  const avgM = AVG_RE.exec(expr)
  if (avgM) {
    const vals = parseRange(avgM[1], rows, depth)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  const opM = BINOP_RE.exec(expr)
  if (opM) {
    const l = /^[A-Za-z]/.test(opM[1]) ? parseRef(opM[1], rows, depth) : parseFloat(opM[1])
    const r = /^[A-Za-z]/.test(opM[3]) ? parseRef(opM[3], rows, depth) : parseFloat(opM[3])
    switch (opM[2]) {
      case '+': return l + r
      case '-': return l - r
      case '*': return l * r
      case '/': return r !== 0 ? l / r : NaN
    }
  }
  return NaN
}

function displayValue(raw: string, rows: string[][]): string {
  const text = stripHtml(raw)
  if (!text.startsWith('=')) return text
  const result = evaluateCell(raw, rows)
  return Number.isNaN(result) ? '#ERR' : String(+result.toFixed(6))
}

// ── Rich text cell ─────────────────────────────────────────────
// Uses contentEditable so execCommand (bold, color, size, etc.)
// from the SideTaskbar works on focused cells just like note cards.

interface RichCellProps {
  value:   string
  onSave:  (html: string) => void
  onFocus: () => void
  onBlur:  () => void
}

function RichCell({ value, onSave, onFocus, onBlur }: RichCellProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Set innerHTML once on mount and when value changes externally
  // (skip while the cell has focus to avoid cursor jumps)
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el) {
      el.innerHTML = value
    }
  }, [value])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={styles.cellRichText}
      onFocus={onFocus}
      onBlur={e => {
        onSave((e.currentTarget as HTMLElement).innerHTML)
        onBlur()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.preventDefault() // no newlines in table cells
        e.stopPropagation()
      }}
      onMouseDown={e => e.stopPropagation()}
    />
  )
}

// ── Component ─────────────────────────────────────────────────

export function TableCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const rows = card.content.rows

  const [focusedCell, setFocusedCell] = useState<string | null>(null)

  const displayed = useMemo(() => {
    return rows.map(row =>
      row.map(cell => (isFormulaCell(cell) ? displayValue(cell, rows) : stripHtml(cell))),
    )
  }, [rows])

  const setCell = useCallback((r: number, c: number, value: string) => {
    const next = rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
    )
    updateCard(card.id, { content: { rows: next } })
  }, [card.id, rows, updateCard])

  const addRow = () => {
    const cols = rows[0]?.length ?? 3
    updateCard(card.id, { content: { rows: [...rows, Array(cols).fill('')] } })
  }
  const addCol = () => {
    updateCard(card.id, { content: { rows: rows.map(r => [...r, '']) } })
  }

  return (
    <div className={styles.table} onMouseDown={e => e.stopPropagation()}>
      <div className={styles.tableScroll}>
        <table className={styles.tableEl}>
          <thead>
            <tr>
              {rows[0]?.map((_, ci) => (
                <th key={ci} className={styles.colHeader}>
                  {String.fromCharCode(65 + ci)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const isFormula = isFormulaCell(cell)
                  const cellKey   = `${ri}-${ci}`
                  const isFocused = focusedCell === cellKey

                  return (
                    <td key={ci} className={styles.cell}>
                      {isFormula ? (
                        <>
                          {isFocused && (
                            <input
                              className={styles.cellInput}
                              value={cell}
                              onChange={e => setCell(ri, ci, e.target.value)}
                              onFocus={() => setFocusedCell(cellKey)}
                              onBlur={() => setFocusedCell(null)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === 'Tab')
                                  (e.target as HTMLInputElement).blur()
                                e.stopPropagation()
                              }}
                              autoFocus
                            />
                          )}
                          {!isFocused && (
                            <div
                              className={styles.cellResultDisplay}
                              onClick={() => setFocusedCell(cellKey)}
                              title="Click to edit formula"
                            >
                              {displayed[ri][ci]}
                            </div>
                          )}
                        </>
                      ) : (
                        <RichCell
                          value={cell}
                          onSave={html => setCell(ri, ci, html)}
                          onFocus={() => setFocusedCell(cellKey)}
                          onBlur={() => setFocusedCell(null)}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableActions}>
        <button className={styles.tableBtn} onClick={addRow}>+ Row</button>
        <button className={styles.tableBtn} onClick={addCol}>+ Col</button>
      </div>
    </div>
  )
}
