import { useCallback, useMemo, useState } from 'react'
import { useCanvasStore } from '@/store'
import type { TableCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// TABLE CARD CONTENT — Mini spreadsheet with formula evaluator
//
// Phase 3 change: equation/answer overlap fix.
//   - While a formula cell is focused → show the raw formula,
//     hide the calculated result.
//   - When the cell loses focus → hide the formula input,
//     show only the result.
//   - Plain (non-formula) cells always show the value directly.
//
// Supported formulas:
//   =A1+B1, =SUM(A1:A3), =AVG(A1:B2)
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

function parseRef(ref: string, rows: string[][], depth: number): number {
  const m = REF_RE.exec(ref)
  if (!m) return NaN
  return evaluateCell(rows[parseInt(m[2], 10) - 1]?.[colIndex(m[1])] ?? '', rows, depth + 1)
}

function parseRange(ref: string, rows: string[][], depth: number): number[] {
  const m = RANGE_RE.exec(ref)
  if (!m) return []
  const sm = REF_RE.exec(m[1])!
  const em = REF_RE.exec(m[2])!
  const r1 = parseInt(sm[2], 10) - 1, r2 = parseInt(em[2], 10) - 1
  const c1 = colIndex(sm[1]), c2 = colIndex(em[1])
  const vals: number[] = []
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++)
      vals.push(evaluateCell(rows[r]?.[c] ?? '', rows, depth + 1))
  return vals
}

function evaluateCell(raw: string, rows: string[][], depth = 0): number {
  if (depth > MAX_DEPTH) return NaN
  if (!raw.startsWith('=')) return parseFloat(raw) || 0
  const expr = raw.slice(1).trim()
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
  if (!raw.startsWith('=')) return raw
  const result = evaluateCell(raw, rows)
  return Number.isNaN(result) ? '#ERR' : String(+result.toFixed(6))
}

// ── Component ─────────────────────────────────────────────────

export function TableCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const rows = card.content.rows

  // Track which cell is currently focused
  const [focusedCell, setFocusedCell] = useState<string | null>(null)

  const displayed = useMemo(() => {
    return rows.map(row =>
      row.map(cell => (cell.startsWith('=') ? displayValue(cell, rows) : cell)),
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
                  const isFormula  = cell.startsWith('=')
                  const cellKey    = `${ri}-${ci}`
                  const isFocused  = focusedCell === cellKey
                  const resultText = isFormula ? displayed[ri][ci] : ''

                  return (
                    <td key={ci} className={styles.cell}>
                      {/* Show formula input when:
                            - plain cell (always),  OR
                            - formula cell that is focused */}
                      {(!isFormula || isFocused) && (
                        <input
                          className={styles.cellInput}
                          value={cell}
                          onChange={e => setCell(ri, ci, e.target.value)}
                          onFocus={() => setFocusedCell(cellKey)}
                          onBlur={() => setFocusedCell(null)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              (e.target as HTMLInputElement).blur()
                            }
                            e.stopPropagation()
                          }}
                        />
                      )}

                      {/* Show result overlay when:
                            formula cell AND not focused */}
                      {isFormula && !isFocused && (
                        <div
                          className={styles.cellResultDisplay}
                          onClick={() => setFocusedCell(cellKey)}
                          title="Click to edit formula"
                        >
                          {resultText}
                        </div>
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
