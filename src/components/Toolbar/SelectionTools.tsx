import { useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import { nanoid } from 'nanoid'
import { Icon } from '@/UI/Icon'
import type { Card, TaskCard, TableCard, ColumnCard, CheckboxStyle } from '@/types'
import styles from './Toolbar.module.css'

// ─────────────────────────────────────────────────────────────
// SELECTION TOOLS — the context half of the unified bottom bar
//
// The old SideTaskbar (a fixed left rail) merged into the Toolbar:
// there is now ONE dock, and it swaps its contents depending on
// whether a card is selected. This module renders the "card selected"
// state — formatting for notes/documents, row/column controls for
// tables, checklist controls for tasks, add shortcuts for columns —
// plus the actions every card shares (duplicate / delete / done).
//
// Two inherited rules that still matter here:
//   • Formatting buttons fire on onMouseDown + preventDefault, so the
//     DOM selection in the card's contentEditable survives the click —
//     document.execCommand acts on whatever is selected, and a normal
//     click would blur the editor first.
//   • The hover panels (color / size) are absolutely positioned
//     children of the toolbar, like the note/media dropdowns in build
//     mode. That works because the toolbar deliberately has no
//     `overflow` set — adding one would clip every panel.
// ─────────────────────────────────────────────────────────────

const PALETTE = [
  '#ffffff','#f0ede8','#d1d5db','#6b7280','#111827',
  '#fecaca','#f87171','#ef4444','#dc2626','#b91c1c',
  '#f9a8d4','#f472b6','#ec4899','#db2777','#be185d',
  '#fed7aa','#fb923c','#f97316','#ea580c','#fbbf24',
  '#fef08a','#4ade80','#22c55e','#16a34a','#15803d',
  '#bbf7d0','#34d399','#10b981','#059669','#047857',
  '#bae6fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8',
  '#ddd6fe','#a78bfa','#7c6af5','#5b4fd4','#4338ca',
]

const ALL_SIZES = [
  { label: 'XS',  size: '1', px: 10 },
  { label: 'S',   size: '2', px: 13 },
  { label: 'M',   size: '3', px: 16 },
  { label: 'L',   size: '4', px: 18 },
  { label: 'XL',  size: '5', px: 24 },
  { label: '2XL', size: '6', px: 32 },
  { label: '3XL', size: '7', px: 48 },
]

type Cmd = 'bold' | 'italic' | 'underline' | 'justifyLeft' | 'justifyCenter' | 'justifyRight'

// ── Shared hover-panel hook ───────────────────────────────────
// Same delayed-close behaviour as the build-mode tool menus, so the
// pointer can cross the gap between trigger and panel.
function useHoverPanel() {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }
  const onLeave = () => {
    timer.current = setTimeout(() => setOpen(false), 150)
  }

  // Don't let the close timer fire into an unmounted component.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { open, onEnter, onLeave }
}

// ── Color dropdown (opens upward from the bar) ────────────────
function ColorDropdown() {
  const { open, onEnter, onLeave } = useHoverPanel()

  return (
    <div className={styles.dropdownWrap} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className={styles.tbtn}
        title="Text color"
        onMouseDown={e => e.preventDefault()}
      >
        <span style={{ fontSize: 13, fontWeight: 700 }}>A</span>
        <span style={{ fontSize: 6 }}>&#9650;</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <span className={styles.panelLabel}>Color</span>
          <div className={styles.colorGrid}>
            {PALETTE.map(color => (
              <button
                key={color}
                className={styles.colorDot}
                style={{ background: color }}
                title={color}
                onMouseDown={e => {
                  e.preventDefault()
                  document.execCommand('foreColor', false, color)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Size dropdown ─────────────────────────────────────────────
function SizeDropdown({ maxSize = 7 }: { maxSize?: number }) {
  const { open, onEnter, onLeave } = useHoverPanel()
  const sizes = ALL_SIZES.slice(0, maxSize)

  return (
    <div className={styles.dropdownWrap} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className={styles.tbtn}
        title="Text size"
        onMouseDown={e => e.preventDefault()}
      >
        <span style={{ fontSize: 12 }}>Aa</span>
        <span style={{ fontSize: 6 }}>&#9650;</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <span className={styles.panelLabel}>Size</span>
          <div className={styles.sizeList}>
            {sizes.map(({ label, size, px }) => (
              <button
                key={size}
                className={styles.sizeOption}
                onMouseDown={e => {
                  e.preventDefault()
                  document.execCommand('fontSize', false, size)
                }}
              >
                <span className={styles.sizeName}>{label}</span>
                <span style={{ fontSize: px, lineHeight: 1, color: 'var(--text-2)' }}>A</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Note / Document formatting ────────────────────────────────
function NoteTools() {
  const fmtBtn = (label: string, cmd: Cmd, title: string) => (
    <button
      key={label}
      className={styles.tbtn}
      title={title}
      onMouseDown={e => {
        e.preventDefault()
        document.execCommand(cmd, false, undefined)
      }}
    >
      {label}
    </button>
  )

  return (
    <div className={styles.group}>
      {fmtBtn('B', 'bold',      'Bold')}
      {fmtBtn('I', 'italic',    'Italic')}
      {fmtBtn('U', 'underline', 'Underline')}
      <div className={styles.sep} />
      {fmtBtn('◄►', 'justifyLeft',   'Align left')}
      {fmtBtn('■',        'justifyCenter', 'Align center')}
      {fmtBtn('►◄', 'justifyRight',  'Align right')}
      <div className={styles.sep} />
      <SizeDropdown maxSize={7} />
      <ColorDropdown />
    </div>
  )
}

// ── Compact cell formatting (table cards) ─────────────────────
function CellFormatTools() {
  const fmtBtn = (label: string, cmd: string, title: string) => (
    <button
      key={label}
      className={styles.tbtn}
      title={title}
      onMouseDown={e => {
        e.preventDefault()
        document.execCommand(cmd, false, undefined)
      }}
    >
      {label}
    </button>
  )

  return (
    <div className={styles.group}>
      {fmtBtn('B', 'bold',      'Bold')}
      {fmtBtn('I', 'italic',    'Italic')}
      {fmtBtn('U', 'underline', 'Underline')}
      <SizeDropdown maxSize={5} />
      <ColorDropdown />
    </div>
  )
}

// ── Table structure tools ─────────────────────────────────────
function TableTools({ card }: { card: TableCard }) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const rows = card.content.rows

  const addRow = () => {
    const cols = rows[0]?.length ?? 3
    updateCard(card.id, { content: { rows: [...rows, Array(cols).fill('')] } })
  }
  const removeRow = () => {
    if (rows.length <= 1) return
    updateCard(card.id, { content: { rows: rows.slice(0, -1) } })
  }
  const addCol = () => {
    updateCard(card.id, { content: { rows: rows.map(r => [...r, '']) } })
  }
  const removeCol = () => {
    if ((rows[0]?.length ?? 0) <= 1) return
    updateCard(card.id, { content: { rows: rows.map(r => r.slice(0, -1)) } })
  }

  return (
    <div className={styles.group}>
      <button className={styles.tbtn} onClick={addRow}    title="Add row">+ Row</button>
      <button className={styles.tbtn} onClick={removeRow} title="Remove last row">&#8722; Row</button>
      <button className={styles.tbtn} onClick={addCol}    title="Add column">+ Col</button>
      <button className={styles.tbtn} onClick={removeCol} title="Remove last column">&#8722; Col</button>
    </div>
  )
}

// ── Task tools ────────────────────────────────────────────────
function TaskTools({ card }: { card: TaskCard }) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const cbStyle: CheckboxStyle = card.content.checkboxStyle ?? 'square'

  function setStyle(s: CheckboxStyle) {
    updateCard(card.id, { content: { ...card.content, checkboxStyle: s } })
  }
  function addTask() {
    const items = [...card.content.items, { id: nanoid(), text: 'New task', done: false }]
    updateCard(card.id, { content: { ...card.content, items } })
  }
  function clearDone() {
    const items = card.content.items.filter(i => !i.done)
    updateCard(card.id, { content: { ...card.content, items } })
  }
  function sortByDone() {
    const items = [...card.content.items].sort((a, b) => Number(a.done) - Number(b.done))
    updateCard(card.id, { content: { ...card.content, items } })
  }

  return (
    <div className={styles.group}>
      <button className={styles.tbtn} onClick={addTask}    title="Add task">+ Task</button>
      <button className={styles.tbtn} onClick={clearDone}  title="Remove completed">&#10003; Clear</button>
      <button className={styles.tbtn} onClick={sortByDone} title="Sort: active first">&#8597; Sort</button>
      <div className={styles.sep} />
      {([['square','□'],['circle','○'],['star','☆']] as [CheckboxStyle,string][]).map(([id,icon]) => (
        <button
          key={id}
          className={`${styles.tbtn} ${cbStyle === id ? styles.tbtnActive : ''}`}
          onClick={() => setStyle(id)}
          title={`${id} checkbox`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

// ── Column tools ──────────────────────────────────────────────
// Shortcuts for the card types people add to a stack most often.
// Everything else (and dropping an existing card in) happens on the
// column card itself.
function ColumnTools({ card }: { card: ColumnCard }) {
  const { updateCard, addCardToColumn } = useCanvasStore.getState()
  const items = card.content.items

  // Drop every embedded checklist whose entries are all ticked off.
  function clearDone() {
    const next = items.filter(it =>
      !(it.type === 'task' &&
        it.content.items.length > 0 &&
        it.content.items.every(t => t.done))
    )
    updateCard(card.id, { content: { ...card.content, items: next } })
  }

  return (
    <div className={styles.group}>
      <button className={styles.tbtn} onClick={() => addCardToColumn(card.id, 'note')} title="Add note"><Icon name="note" size={15} /></button>
      <button className={styles.tbtn} onClick={() => addCardToColumn(card.id, 'task')} title="Add task list"><Icon name="task" size={15} /></button>
      <button className={styles.tbtn} onClick={() => addCardToColumn(card.id, 'link')} title="Add link"><Icon name="link" size={15} /></button>
      <button className={styles.tbtn} onClick={() => addCardToColumn(card.id, 'media')} title="Add image"><Icon name="media" size={15} /></button>
      <div className={styles.sep} />
      <button className={styles.tbtn} onClick={clearDone} title="Remove finished checklists">✓ Clr</button>
    </div>
  )
}

// ── Main export — everything right of the type label ──────────
export function SelectionTools({ card }: { card: Card }) {
  const { deleteCard, duplicateCard, deselectAll } = useCanvasStore.getState()

  const isNote   = card.type === 'note' || card.type === 'document'
  const isTable  = card.type === 'table'
  const isTask   = card.type === 'task'
  const isColumn = card.type === 'column'
  const hasTools = isNote || isTable || isTask || isColumn

  return (
    <>
      <span className={styles.ctxLabel}>
        {card.type.charAt(0).toUpperCase() + card.type.slice(1)}
      </span>
      <div className={styles.sep} />

      {isNote   && <NoteTools />}
      {isTable  && <><CellFormatTools /><div className={styles.sep} /><TableTools card={card as TableCard} /></>}
      {isTask   && <TaskTools card={card as TaskCard} />}
      {isColumn && <ColumnTools card={card as ColumnCard} />}

      {hasTools && <div className={styles.sep} />}

      <div className={styles.group}>
        <button
          className={styles.tbtn}
          onClick={() => duplicateCard(card.id)}
          title="Duplicate card"
        >
          &#10697; Dup
        </button>
        <button
          className={`${styles.tbtn} ${styles.tbtnDanger}`}
          onClick={() => deleteCard(card.id)}
          title="Delete card"
        >
          &#10005; Del
        </button>
        {/* Escape hatch back to the build tools without hunting for
            empty canvas to click. */}
        <button
          className={styles.tbtn}
          onClick={deselectAll}
          title="Deselect — back to board tools"
        >
          Done
        </button>
      </div>
    </>
  )
}
