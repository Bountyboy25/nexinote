import { useCanvasStore, useSelectedIds, useCards } from '@/store'
import { nanoid } from 'nanoid'
import type { TaskCard, TableCard, CheckboxStyle } from '@/types'
import styles from './SideTaskbar.module.css'

// ─────────────────────────────────────────────────────────────
// SIDE TASKBAR — Phase 3 global context-sensitive tool panel
//
// Behaviour:
//   • Anchored to the left edge of the screen
//   • Hidden when nothing is selected
//   • Appears when a card is clicked/selected
//   • Content is dynamic: changes based on the selected card type
//   • Hides when user clicks away (deselectAll in CanvasView)
//
// Supported card types:
//   note / document → text formatting tools
//   table           → add/remove row & col, cell tools
//   task            → add task, checkbox style, sort
//   (others)        → duplicate / delete only
// ─────────────────────────────────────────────────────────────

type Cmd = 'bold' | 'italic' | 'underline' | 'justifyLeft' | 'justifyCenter' | 'justifyRight'

function execFormat(cmd: Cmd, value?: string) {
  document.execCommand(cmd, false, value)
}

// ── Note / Document tools ─────────────────────────────────────
// Note tools use document.execCommand — no card-specific state needed
function NoteTools() {

  const fmtBtn = (label: string, cmd: Cmd, value?: string, title?: string) => (
    <button
      key={label}
      className={styles.tool}
      title={title ?? label}
      onMouseDown={e => {
        e.preventDefault()  // Don't steal focus from the editor
        execFormat(cmd, value)
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Format</div>
        {fmtBtn('B',  'bold',      undefined, 'Bold (Ctrl+B)')}
        {fmtBtn('I',  'italic',    undefined, 'Italic (Ctrl+I)')}
        {fmtBtn('U',  'underline', undefined, 'Underline')}
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Align</div>
        {fmtBtn('⬤⬤', 'justifyLeft',   undefined, 'Align left')}
        {fmtBtn('⬛',  'justifyCenter', undefined, 'Align center')}
        {fmtBtn('⬤⬤', 'justifyRight',  undefined, 'Align right')}
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Size</div>
        {(['1','2','3','4','5','6','7'] as const).map(sz => (
          <button
            key={sz}
            className={styles.tool}
            title={`Font size ${sz}`}
            onMouseDown={e => {
              e.preventDefault()
              document.execCommand('fontSize', false, sz)
            }}
          >
            {sz}
          </button>
        ))}
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Color</div>
        {['#f0ede8','#f87171','#fb923c','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6'].map(color => (
          <button
            key={color}
            className={styles.colorSwatch}
            style={{ background: color }}
            title={color}
            onMouseDown={e => {
              e.preventDefault()
              document.execCommand('foreColor', false, color)
            }}
          />
        ))}
      </div>
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
      <button className={styles.tool} onClick={addRow} title="Add row">+ Row</button>
      <button className={styles.tool} onClick={removeRow} title="Remove last row">− Row</button>
      <div className={styles.divider} />
      <div className={styles.sectionLabel}>Cols</div>
      <button className={styles.tool} onClick={addCol} title="Add column">+ Col</button>
      <button className={styles.tool} onClick={removeCol} title="Remove last column">− Col</button>
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
    const items = [
      ...card.content.items,
      { id: nanoid(), text: 'New task', done: false },
    ]
    updateCard(card.id, { content: { ...card.content, items } })
  }

  function clearDone() {
    const items = card.content.items.filter(i => !i.done)
    updateCard(card.id, { content: { ...card.content, items } })
  }

  function sortByDone() {
    const items = [...card.content.items].sort((a, b) =>
      Number(a.done) - Number(b.done)
    )
    updateCard(card.id, { content: { ...card.content, items } })
  }

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Tasks</div>
        <button className={styles.tool} onClick={addTask}   title="Add task">+ Task</button>
        <button className={styles.tool} onClick={clearDone} title="Remove completed">✓ Clear</button>
        <button className={styles.tool} onClick={sortByDone} title="Sort: active first">↕ Sort</button>
      </div>
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Checkbox</div>
        {([['square','□'],['circle','○'],['star','☆']] as [CheckboxStyle, string][]).map(([id, icon]) => (
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

// ── Main SideTaskbar ──────────────────────────────────────────
export function SideTaskbar() {
  const selectedIds = useSelectedIds()
  const cards       = useCards()
  const { deleteCard, duplicateCard } = useCanvasStore.getState()

  // Only show if exactly one card is selected
  const selectedArr = [...selectedIds]
  if (selectedArr.length === 0) return null

  const cardId = selectedArr[0]
  const card   = cards.find(c => c.id === cardId)
  if (!card) return null

  const isNote  = card.type === 'note' || card.type === 'document'
  const isTable = card.type === 'table'
  const isTask  = card.type === 'task'

  return (
    <aside className={styles.taskbar}>
      {/* Type label */}
      <div className={styles.typeLabel}>
        {card.type.charAt(0).toUpperCase() + card.type.slice(1)}
      </div>
      <div className={styles.divider} />

      {/* Context-specific tools */}
      {isNote  && <NoteTools />}
      {isTable && <TableTools card={card as TableCard} />}
      {isTask  && <TaskTools  card={card as TaskCard}  />}

      {/* Universal actions */}
      <div className={styles.divider} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Card</div>
        <button
          className={styles.tool}
          onClick={() => duplicateCard(card.id)}
          title="Duplicate card"
        >
          ⧉ Dup
        </button>
        <button
          className={`${styles.tool} ${styles.toolDanger}`}
          onClick={() => deleteCard(card.id)}
          title="Delete card"
        >
          ✕ Del
        </button>
      </div>
    </aside>
  )
}
