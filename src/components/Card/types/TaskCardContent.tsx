import { useState, useRef } from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/store'
import type { TaskCard, TaskItem, CheckboxStyle } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// TASK CARD CONTENT — Phase 3
//
// Changes:
//   - Checkbox renders as square / circle / star based on style
//   - Done items: gray text + strikethrough (CSS)
//   - Style selector button strip at the top
//   - Checkbox behavior: click once to check, again to uncheck
// ─────────────────────────────────────────────────────────────

interface Props { card: TaskCard }

const STYLES: { id: CheckboxStyle; label: string }[] = [
  { id: 'square', label: '□' },
  { id: 'circle', label: '○' },
  { id: 'star',   label: '☆' },
]

interface CheckboxProps {
  done: boolean
  style: CheckboxStyle
  onChange: () => void
}

function CustomCheckbox({ done, style, onChange }: CheckboxProps) {
  const base = styles.customCheck
  const doneClass = done ? styles.customCheckDone : ''

  if (style === 'circle') {
    return (
      <span
        className={`${base} ${styles.checkCircle} ${doneClass}`}
        onClick={onChange}
        role="checkbox"
        aria-checked={done}
        tabIndex={0}
        onKeyDown={e => e.key === ' ' && onChange()}
      >
        {done && '✓'}
      </span>
    )
  }

  if (style === 'star') {
    return (
      <span
        className={`${base} ${styles.checkStar} ${doneClass}`}
        onClick={onChange}
        role="checkbox"
        aria-checked={done}
        tabIndex={0}
        onKeyDown={e => e.key === ' ' && onChange()}
      >
        {done ? '★' : '☆'}
      </span>
    )
  }

  // Default: square
  return (
    <span
      className={`${base} ${styles.checkSquare} ${doneClass}`}
      onClick={onChange}
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
      onKeyDown={e => e.key === ' ' && onChange()}
    >
      {done && '✓'}
    </span>
  )
}

export function TaskCardContent({ card }: Props) {
  const updateCard  = useCanvasStore(s => s.updateCard)
  const [newText, setNewText] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  const items        = card.content.items
  const cbStyle: CheckboxStyle = card.content.checkboxStyle ?? 'square'
  const done         = items.filter(i => i.done).length
  const total        = items.length
  const pct          = total === 0 ? 0 : Math.round((done / total) * 100)

  function save(nextItems: TaskItem[]) {
    updateCard(card.id, { content: { ...card.content, items: nextItems } })
  }

  function setStyle(s: CheckboxStyle) {
    updateCard(card.id, { content: { ...card.content, checkboxStyle: s } })
  }

  function toggle(id: string) {
    save(items.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  function editText(id: string, text: string) {
    save(items.map(i => i.id === id ? { ...i, text } : i))
  }

  function remove(id: string) {
    save(items.filter(i => i.id !== id))
  }

  function addItem() {
    const text = newText.trim()
    if (!text) return
    save([...items, { id: nanoid(), text, done: false }])
    setNewText('')
    newInputRef.current?.focus()
  }

  return (
    <div className={styles.task} onMouseDown={e => e.stopPropagation()}>
      {/* Checkbox style selector */}
      <div className={styles.checkStyleRow}>
        {STYLES.map(s => (
          <button
            key={s.id}
            className={`${styles.checkStyleBtn} ${cbStyle === s.id ? styles.checkStyleActive : ''}`}
            onClick={() => setStyle(s.id)}
            title={`${s.id} style`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${pct}%` }} />
          <span className={styles.progressLabel}>{done}/{total}</span>
        </div>
      )}

      {/* Checklist items */}
      <ul className={styles.checklist}>
        {items.map(item => (
          <li key={item.id} className={`${styles.checkItem} ${item.done ? styles.checkDone : ''}`}>
            <CustomCheckbox
              done={item.done}
              style={cbStyle}
              onChange={() => toggle(item.id)}
            />
            <input
              className={`${styles.checkText} ${item.done ? styles.checkTextDone : ''}`}
              value={item.text}
              onChange={e => editText(item.id, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); newInputRef.current?.focus() }
                if (e.key === 'Backspace' && item.text === '') { e.preventDefault(); remove(item.id) }
                e.stopPropagation()
              }}
            />
            <button
              className={styles.checkRemove}
              onClick={() => remove(item.id)}
              title="Remove"
            >×</button>
          </li>
        ))}
      </ul>

      {/* Add new item */}
      <div className={styles.addRow}>
        <input
          ref={newInputRef}
          className={styles.addInput}
          placeholder="Add item…"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addItem() }
            e.stopPropagation()
          }}
        />
        <button className={styles.addBtn} onClick={addItem} title="Add item">+</button>
      </div>
    </div>
  )
}
