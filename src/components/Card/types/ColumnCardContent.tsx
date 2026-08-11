import { useState } from 'react'
import { useCanvasStore } from '@/store'
import { Icon, type IconName } from '@/UI/Icon'
import { GlyphIcon } from '@/UI/glyphs'
import { CardContent } from '../CardContent'
import type { Card, ColumnCard, CardType } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// COLUMN CARD CONTENT — a container for whole cards
//
// A column holds REAL cards, not flattened text stubs. Every card
// type is allowed except another column: nesting containers has no
// sensible layout and no obvious way back out, so it's refused at
// each entry point (drop, add menu, and defensively when rendering).
//
// Because embedded cards are ordinary Card objects rendered by the
// shared CardContent factory, they behave exactly as they do on the
// canvas — a table is still editable, a map still pans, a sketch is
// still drawable. Their edits reach the store through updateCard(),
// which knows to look inside columns (see store/index.ts).
//
//   • Rows collapse/expand; a card that is collapsed isn't mounted,
//     which keeps a column of maps or videos from costing anything
//     until it's opened
//   • Eject lifts a card back onto the canvas beside the column, so
//     dropping something in is never a one-way trip
//   • Rows reorder via the grip handle (HTML5 drag & drop); canvas
//     cards dropped onto the column are absorbed whole (see
//     useCardDrag + store.absorbCardIntoColumn)
// ─────────────────────────────────────────────────────────────

interface Props { card: ColumnCard }

// Everything a column can contain — i.e. every card type but itself.
// 'table' is absent because it needs the row/column size dialog before
// it can be created; drag an existing table in instead.
const ADDABLE: { type: CardType; icon: IconName; label: string }[] = [
  { type: 'note',     icon: 'note',     label: 'Note' },
  { type: 'task',     icon: 'task',     label: 'Task list' },
  { type: 'link',     icon: 'link',     label: 'Link' },
  { type: 'document', icon: 'document', label: 'Document' },
  { type: 'heading',  icon: 'heading',  label: 'Heading' },
  { type: 'comment',  icon: 'comment',  label: 'Comment' },
  { type: 'media',    icon: 'media',    label: 'Image' },
  { type: 'audio',    icon: 'audio',    label: 'Audio' },
  { type: 'video',    icon: 'video',    label: 'Video' },
  { type: 'sketch',   icon: 'sketch',   label: 'Sketch' },
  { type: 'color',    icon: 'color',    label: 'Color' },
  { type: 'map',      icon: 'map',      label: 'Map' },
  { type: 'board',    icon: 'board',    label: 'Sub-board' },
]

const ROW_ICONS: Record<CardType, IconName> = {
  note: 'note', document: 'document', task: 'task', table: 'table',
  media: 'media', link: 'link', column: 'column', sketch: 'sketch',
  color: 'color', audio: 'audio', video: 'video', heading: 'heading',
  comment: 'comment', map: 'map', board: 'board',
}

// Types that are cheap and usually want to be visible straight away.
// Heavier ones (maps spin up Leaflet, videos load an iframe) start
// collapsed so a long column stays fast to open.
const OPEN_BY_DEFAULT = new Set<CardType>([
  'note', 'task', 'link', 'color', 'heading', 'comment',
])

// ── Single embedded card row ──────────────────────────────────
interface ItemRowProps {
  item:        Card
  index:       number
  dragging:    boolean          // some row in this column is mid-drag
  onTitle:     (title: string) => void
  onDelete:    () => void
  onEject:     () => void
  onDragStart: () => void
  onDragEnd:   () => void
  onHover:     (insertIndex: number) => void
  onDrop:      () => void
  showDropLine: boolean
}

function ItemRow({
  item, index, dragging, onTitle, onDelete, onEject,
  onDragStart, onDragEnd, onHover, onDrop, showDropLine,
}: ItemRowProps) {
  const [expanded, setExpanded] = useState(OPEN_BY_DEFAULT.has(item.type))
  const [armed, setArmed] = useState(false)   // grip pressed → row draggable

  return (
    <div
      className={[
        styles.colItem,
        showDropLine ? styles.colItemDropBefore : '',
      ].filter(Boolean).join(' ')}
      draggable={armed}
      onDragStart={e => {
        e.stopPropagation()
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={() => { setArmed(false); onDragEnd() }}
      onDragOver={e => {
        if (!dragging) return
        e.preventDefault()
        e.stopPropagation()
        const r = e.currentTarget.getBoundingClientRect()
        onHover(e.clientY < r.top + r.height / 2 ? index : index + 1)
      }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop() }}
      onMouseUp={() => setArmed(false)}
    >
      <div className={styles.colItemHeader}>
        <span
          className={styles.colItemGrip}
          data-no-card-drag=""
          title="Drag to reorder"
          onMouseDown={() => setArmed(true)}
        >
          <Icon name="grip" size={12} />
        </span>

        {/* A card carried into the column keeps its custom icon */}
        <span className={styles.colItemIcon}>
          {item.icon
            ? <GlyphIcon name={item.icon} accent={item.accent} size={13} />
            : <Icon name={ROW_ICONS[item.type]} size={13} />}
        </span>

        <input
          className={styles.colItemTitle}
          value={item.title}
          placeholder="Title…"
          onChange={e => onTitle(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        />

        <button
          className={styles.colItemExpand}
          onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <Icon
            name="chevron-down"
            size={11}
            className={expanded ? styles.colItemChevronOpen : ''}
          />
        </button>
        <button
          className={styles.colItemEject}
          onClick={onEject}
          title="Move back onto the board"
          aria-label="Move card back onto the board"
        ><Icon name="chevron-right" size={11} /></button>
        <button
          className={styles.colItemDelete}
          onClick={onDelete}
          title="Delete this card"
        ><Icon name="close" size={11} /></button>
      </div>

      {/* Collapsed rows don't mount their content at all — that's what
          keeps a column of maps or videos cheap until it's opened. */}
      {expanded && (
        <div className={styles.colItemBody}>
          <CardContent card={item} />
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export function ColumnCardContent({ card }: Props) {
  const { updateCard, ejectFromColumn, addCardToColumn, removeFromColumn } =
    useCanvasStore.getState()
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Row drag & drop (reorder within this column)
  const [dragId, setDragId]   = useState<string | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  // Defensive: a column should never contain another column, but a
  // hand-edited or future-migrated board shouldn't be able to send this
  // component into infinite recursion.
  const items = card.content.items.filter(i => i.type !== 'column')

  function setItems(next: Card[]) {
    updateCard(card.id, { content: { ...card.content, items: next } })
  }

  function setItemTitle(id: string, title: string) {
    setItems(items.map(it => it.id === id ? { ...it, title } as Card : it))
  }

  // Note this goes through the store rather than setItems() — see
  // removeFromColumn: a board card leaving a column has to hand its
  // sub-board back to the gallery.
  function deleteItem(id: string) {
    removeFromColumn(card.id, id)
  }

  function clearDrag() {
    setDragId(null)
    setOverIdx(null)
  }

  function dropRow() {
    if (dragId === null || overIdx === null) { clearDrag(); return }
    const fromIdx = items.findIndex(it => it.id === dragId)
    if (fromIdx === -1) { clearDrag(); return }
    let toIdx = overIdx
    if (fromIdx < toIdx) toIdx--
    if (toIdx !== fromIdx) {
      const next = [...items]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      setItems(next)
    }
    clearDrag()
  }

  // One pass for the progress counters — every checklist inside this
  // column contributes, so the header summarizes the whole stack.
  let completedCount = 0
  let taskCount = 0
  for (const it of items) {
    if (it.type === 'task') {
      for (const t of it.content.items) {
        taskCount++
        if (t.done) completedCount++
      }
    }
  }

  return (
    <div className={styles.column} onMouseDown={e => e.stopPropagation()}>
      {/* ── Item count / progress ── */}
      <div className={styles.colMeta}>
        <span className={styles.colCount}>
          {items.length} {items.length === 1 ? 'card' : 'cards'}
        </span>
        {taskCount > 0 && (
          <span className={styles.colProgress}>
            {completedCount}/{taskCount} done
          </span>
        )}
      </div>

      {/* ── Item list ── */}
      <div
        className={`${styles.colList} ${dragId && overIdx === items.length ? styles.colListDropEnd : ''}`}
        onDragOver={e => {
          if (!dragId) return
          e.preventDefault()
          // Hovering the empty space below the rows → drop at the end
          if (e.target === e.currentTarget) setOverIdx(items.length)
        }}
        onDrop={e => { e.preventDefault(); dropRow() }}
      >
        {items.length === 0 && (
          <div className={styles.colEmpty}>
            No cards yet — add one below, or drop any card from the board
          </div>
        )}
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            index={index}
            dragging={dragId !== null}
            onTitle={title => setItemTitle(item.id, title)}
            onDelete={() => deleteItem(item.id)}
            onEject={() => ejectFromColumn(card.id, item.id)}
            onDragStart={() => setDragId(item.id)}
            onDragEnd={clearDrag}
            onHover={setOverIdx}
            onDrop={dropRow}
            showDropLine={dragId !== null && overIdx === index && dragId !== item.id}
          />
        ))}
      </div>

      {/* ── Add button ── */}
      <div className={styles.colAddWrap}>
        <button
          className={styles.colAddBtn}
          onClick={() => setShowAddMenu(v => !v)}
          onMouseDown={e => e.stopPropagation()}
        >
          + Add card
        </button>
        {showAddMenu && (
          <div className={styles.colAddMenu}>
            {ADDABLE.map(({ type, icon, label }) => (
              <button
                key={type}
                className={styles.colAddOption}
                onClick={() => { addCardToColumn(card.id, type); setShowAddMenu(false) }}
                onMouseDown={e => e.stopPropagation()}
              >
                <Icon name={icon} size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
