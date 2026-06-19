import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCanvasStore, useSelectedIds, useCards } from '@/store'
import { nanoid } from 'nanoid'
import type { TaskCard, TableCard, ColumnCard, ColumnItem, CheckboxStyle } from '@/types'
import styles from './SideTaskbar.module.css'

// ─────────────────────────────────────────────────────────────
// SIDE TASKBAR — Phase 3 context-sensitive tool panel
//
// Dropdown panels are rendered via createPortal into document.body.
// This is required because .taskbar uses backdrop-filter, which
// (per spec) makes it a containing block for position:fixed children,
// so those children get clipped by the taskbar's overflow:hidden.
// Portaling out of the taskbar's DOM subtree sidesteps this entirely.
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

// ── Shared dropdown hook ──────────────────────────────────────
function useDropdown() {
  const [open, setOpen] = useState(false)
  const [top,  setTop]  = useState(0)
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef      = useRef<HTMLDivElement>(null)

  const onEnterTrigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (triggerRef.current) {
      setTop(triggerRef.current.getBoundingClientRect().top)
    }
    setOpen(true)
  }, [])

  const onEnterPanel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const onLeave = useCallback(() => {
    timerRef.current = setTimeout(() => setOpen(false), 150)
  }, [])

  return { open, top, triggerRef, onEnterTrigger, onEnterPanel, onLeave }
}

// Panel left offset — just past the sidebar's right edge
const PANEL_LEFT = 64

// ── Color dropdown ────────────────────────────────────────────
function ColorDropdown() {
  const { open, top, triggerRef, onEnterTrigger, onEnterPanel, onLeave } = useDropdown()

  return (
    <div
      ref={triggerRef}
      className={styles.dropTrigger}
      onMouseEnter={onEnterTrigger}
      onMouseLeave={onLeave}
    >
      <button className={styles.tool} title="Text color">
        <span style={{ fontSize: 14, fontWeight: 700 }}>A</span>
        <span style={{ fontSize: 6 }}>&#9660;</span>
      </button>

      {open && createPortal(
        <div
          className={styles.dropPanel}
          style={{ top, left: PANEL_LEFT }}
          onMouseEnter={onEnterPanel}
          onMouseLeave={onLeave}
        >
          <span className={styles.dropPanelLabel}>Color</span>
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
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Size dropdown ─────────────────────────────────────────────
function SizeDropdown({ maxSize = 7 }: { maxSize?: number }) {
  const { open, top, triggerRef, onEnterTrigger, onEnterPanel, onLeave } = useDropdown()
  const sizes = ALL_SIZES.slice(0, maxSize)

  return (
    <div
      ref={triggerRef}
      className={styles.dropTrigger}
      onMouseEnter={onEnterTrigger}
      onMouseLeave={onLeave}
    >
      <button className={styles.tool} title="Text size">
        <span style={{ fontSize: 12 }}>Aa</span>
        <span style={{ fontSize: 6 }}>&#9660;</span>
      </button>

      {open && createPortal(
        <div
          className={styles.dropPanel}
          style={{ top, left: PANEL_LEFT }}
          onMouseEnter={onEnterPanel}
          onMouseLeave={onLeave}
        >
          <span className={styles.dropPanelLabel}>Size</span>
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
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Note / Document tools ─────────────────────────────────────
function NoteTools() {
  const fmtBtn = (label: string, cmd: Cmd, value?: string, title?: string) => (
    <button
      key={label}
      className={styles.tool}
      title={title ?? label}
      onMouseDown={e => {
        e.preventDefault()
        document.execCommand(cmd, false, value)
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Format</div>
        {fmtBtn('B', 'bold',      undefined, 'Bold')}
        {fmtBtn('I', 'italic',    undefined, 'Italic')}
        {fmtBtn('U', 'underline', undefined, 'Underline')}
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Align</div>
        {fmtBtn('\u25c4\u25ba', 'justifyLeft',   undefined, 'Align left')}
        {fmtBtn('\u25a0',        'justifyCenter', undefined, 'Align center')}
        {fmtBtn('\u25ba\u25c4', 'justifyRight',  undefined, 'Align right')}
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Size</div>
        <SizeDropdown maxSize={7} />
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Color</div>
        <ColorDropdown />
      </div>
    </>
  )
}

// ── Compact cell format tools (table cards) ───────────────────
function CellFormatTools() {
  const fmtBtn = (label: string, cmd: string, value?: string, title?: string) => (
    <button
      key={label}
      className={styles.tool}
      title={title ?? label}
      onMouseDown={e => {
        e.preventDefault()
        document.execCommand(cmd, false, value)
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Cell</div>
        {fmtBtn('B', 'bold',      undefined, 'Bold')}
        {fmtBtn('I', 'italic',    undefined, 'Italic')}
        {fmtBtn('U', 'underline', undefined, 'Underline')}
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Size</div>
        <SizeDropdown maxSize={5} />
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Color</div>
        <ColorDropdown />
      </div>
      <div className={styles.divider} />
    </>
  )
}

// ── Table tools ───────────────────────────────────────────────
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
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Rows</div>
      <button className={styles.tool} onClick={addRow}    title="Add row">+ Row</button>
      <button className={styles.tool} onClick={removeRow} title="Remove last row">&#8722; Row</button>
      <div className={styles.divider} />
      <div className={styles.sectionLabel}>Cols</div>
      <button className={styles.tool} onClick={addCol}    title="Add column">+ Col</button>
      <button className={styles.tool} onClick={removeCol} title="Remove last column">&#8722; Col</button>
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
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Tasks</div>
        <button className={styles.tool} onClick={addTask}    title="Add task">+ Task</button>
        <button className={styles.tool} onClick={clearDone}  title="Remove completed">&#10003; Clear</button>
        <button className={styles.tool} onClick={sortByDone} title="Sort: active first">&#8597; Sort</button>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Checkbox</div>
        {([['square','\u25a1'],['circle','\u25cb'],['star','\u2606']] as [CheckboxStyle,string][]).map(([id,icon]) => (
          <button
            key={id}
            className={`${styles.tool} ${cbStyle === id ? styles.toolActive : ''}`}
            onClick={() => setStyle(id)}
            title={`${id} checkbox`}
          >
            {icon}
          </button>
        ))}
      </div>
    </>
  )
}

// ── Column tools ──────────────────────────────────────────────
function ColumnTools({ card }: { card: ColumnCard }) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const items = card.content.items

  function addItem(type: ColumnItem['type']) {
    const label = type === 'note' ? 'Note' : type === 'task' ? 'Task' : 'Link'
    const next = [...items, { id: nanoid(), type, title: label, text: '', done: false }]
    updateCard(card.id, { content: { ...card.content, items: next } })
  }

  function clearDone() {
    const next = items.filter(it => !it.done)
    updateCard(card.id, { content: { ...card.content, items: next } })
  }

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Add</div>
        <button className={styles.tool} onClick={() => addItem('note')}  title="Add note">📝</button>
        <button className={styles.tool} onClick={() => addItem('task')}  title="Add task">✅</button>
        <button className={styles.tool} onClick={() => addItem('link')}  title="Add link">🔗</button>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Items</div>
        <button className={styles.tool} onClick={clearDone} title="Remove completed tasks">✓ Clr</button>
      </div>
    </>
  )
}

// ── Main SideTaskbar ──────────────────────────────────────────
export function SideTaskbar() {
  const selectedIds = useSelectedIds()
  const cards       = useCards()
  const { deleteCard, duplicateCard } = useCanvasStore.getState()

  const selectedArr = [...selectedIds]
  if (selectedArr.length === 0) return null

  const cardId = selectedArr[0]
  const card   = cards.find(c => c.id === cardId)
  if (!card) return null

  const isNote   = card.type === 'note' || card.type === 'document'
  const isTable  = card.type === 'table'
  const isTask   = card.type === 'task'
  const isColumn = card.type === 'column'

  return (
    <aside className={styles.taskbar}>
      <div className={styles.typeLabel}>
        {card.type.charAt(0).toUpperCase() + card.type.slice(1)}
      </div>
      <div className={styles.divider} />

      {isNote   && <NoteTools />}
      {isTable  && <><CellFormatTools /><TableTools card={card as TableCard} /></>}
      {isTask   && <TaskTools card={card as TaskCard} />}
      {isColumn && <ColumnTools card={card as ColumnCard} />}

      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Card</div>
        <button
          className={styles.tool}
          onClick={() => duplicateCard(card.id)}
          title="Duplicate card"
        >
          &#10697; Dup
        </button>
        <button
          className={`${styles.tool} ${styles.toolDanger}`}
          onClick={() => deleteCard(card.id)}
          title="Delete card"
        >
          &#10005; Del
        </button>
      </div>
    </aside>
  )
}

