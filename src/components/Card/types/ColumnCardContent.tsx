import { useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import { nanoid } from 'nanoid'
import type { ColumnCard, ColumnItem } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// COLUMN CARD CONTENT — Vertical list container
//
// Each column item is a mini card (note / task / link).
// Items are stored embedded in the column card's content —
// they don't exist on the main canvas.
// ─────────────────────────────────────────────────────────────

interface Props { card: ColumnCard }

const ITEM_ICONS: Record<ColumnItem['type'], string> = {
  note: '📝',
  task: '✅',
  link: '🔗',
}

const ITEM_PLACEHOLDER: Record<ColumnItem['type'], string> = {
  note: 'Write a note…',
  task: 'Describe the task…',
  link: 'https://',
}

// ── Single item row ───────────────────────────────────────────
interface ItemRowProps {
  item:     ColumnItem
  onUpdate: (patch: Partial<ColumnItem>) => void
  onDelete: () => void
}

function ItemRow({ item, onUpdate, onDelete }: ItemRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={styles.colItem}>
      <div className={styles.colItemHeader}>
        <span className={styles.colItemIcon}>{ITEM_ICONS[item.type]}</span>
        <input
          className={styles.colItemTitle}
          value={item.title}
          placeholder="Title…"
          onChange={e => onUpdate({ title: e.target.value })}
          onMouseDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        />
        <button
          className={styles.colItemExpand}
          onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button
          className={styles.colItemDelete}
          onClick={onDelete}
          title="Remove item"
        >✕</button>
      </div>

      {expanded && (
        <div className={styles.colItemBody}>
          {item.type === 'task' ? (
            <label className={styles.colItemTaskRow}>
              <input
                type="checkbox"
                checked={!!item.done}
                onChange={e => onUpdate({ done: e.target.checked })}
                onMouseDown={e => e.stopPropagation()}
              />
              <textarea
                className={`${styles.colItemText} ${item.done ? styles.colItemDone : ''}`}
                value={item.text}
                placeholder={ITEM_PLACEHOLDER[item.type]}
                rows={2}
                onChange={e => onUpdate({ text: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
              />
            </label>
          ) : (
            <textarea
              className={styles.colItemText}
              value={item.text}
              placeholder={ITEM_PLACEHOLDER[item.type]}
              rows={item.type === 'link' ? 1 : 3}
              onChange={e => onUpdate({ text: e.target.value })}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
            />
          )}
          {item.type === 'link' && item.text.startsWith('http') && (
            <a
              className={styles.colItemLink}
              href={item.text}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
            >
              Open ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export function ColumnCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const items = card.content.items
  const addBtnRef = useRef<HTMLDivElement>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  function setItems(next: ColumnItem[]) {
    updateCard(card.id, { content: { ...card.content, items: next } })
  }

  function addItem(type: ColumnItem['type']) {
    const label = type === 'note' ? 'Note' : type === 'task' ? 'Task' : 'Link'
    setItems([...items, { id: nanoid(), type, title: label, text: '', done: false }])
    setShowAddMenu(false)
  }

  function updateItem(id: string, patch: Partial<ColumnItem>) {
    setItems(items.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  function deleteItem(id: string) {
    setItems(items.filter(it => it.id !== id))
  }

  // One pass to compute both progress counters — used to be two filters
  // building intermediate arrays.
  let completedCount = 0
  let taskCount = 0
  for (const it of items) {
    if (it.type === 'task') {
      taskCount++
      if (it.done) completedCount++
    }
  }

  return (
    <div className={styles.column} onMouseDown={e => e.stopPropagation()}>
      {/* ── Item count / progress ── */}
      <div className={styles.colMeta}>
        <span className={styles.colCount}>{items.length} {items.length === 1 ? 'card' : 'cards'}</span>
        {taskCount > 0 && (
          <span className={styles.colProgress}>
            {completedCount}/{taskCount} done
          </span>
        )}
      </div>

      {/* ── Item list ── */}
      <div className={styles.colList}>
        {items.length === 0 && (
          <div className={styles.colEmpty}>
            No cards yet — add one below
          </div>
        )}
        {items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            onUpdate={patch => updateItem(item.id, patch)}
            onDelete={() => deleteItem(item.id)}
          />
        ))}
      </div>

      {/* ── Add button ── */}
      <div className={styles.colAddWrap} ref={addBtnRef}>
        <button
          className={styles.colAddBtn}
          onClick={() => setShowAddMenu(v => !v)}
          onMouseDown={e => e.stopPropagation()}
        >
          + Add card
        </button>
        {showAddMenu && (
          <div className={styles.colAddMenu}>
            {(['note', 'task', 'link'] as ColumnItem['type'][]).map(type => (
              <button
                key={type}
                className={styles.colAddOption}
                onClick={() => addItem(type)}
                onMouseDown={e => e.stopPropagation()}
              >
                {ITEM_ICONS[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
