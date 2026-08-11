import { useRef, useState } from 'react'
import { useCanvasStore, useBoards } from '@/store'
import { Icon } from '@/UI/Icon'
import { GlyphIcon } from '@/UI/glyphs'
import { IconPicker } from '@/UI/IconPicker'
import type { BoardCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// BOARD CARD — a nested board living inside this one
//
// The card owns a real child Board (Board.parentId points back at
// the board this card sits on). Child boards are hidden from the
// gallery, which is the point: a project can hold a dozen sub-boards
// without the landing screen turning into a wall of tiles.
//
// Clicking descends into the child; TopBar renders the breadcrumb
// trail back out. Renaming here renames the board itself, so the two
// never drift apart.
// ─────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 5   // px — past this a click was really a drag

interface Props { card: BoardCard }

export function BoardCardContent({ card }: Props) {
  const boards = useBoards()
  const { openBoard, renameBoard, updateCard, setBoardIcon } = useCanvasStore.getState()
  const downPos    = useRef<{ x: number; y: number } | null>(null)
  const iconBtnRef = useRef<HTMLButtonElement>(null)
  const [picking, setPicking] = useState(false)

  const child = boards.find(b => b.id === card.content.boardId)

  // Only reachable if a board was deleted out from under the card.
  if (!child) {
    return (
      <div className={styles.boardCard}>
        <p className={styles.boardMissing}>
          This sub-board no longer exists.
        </p>
      </div>
    )
  }

  const open = () => openBoard(child.id)

  const onMouseDown = (e: React.MouseEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY }
  }

  const onClick = (e: React.MouseEvent) => {
    const d = downPos.current
    downPos.current = null
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_THRESHOLD) return
    e.stopPropagation()
    open()
  }

  function rename(name: string) {
    const clean = name.trim() || 'Sub-board'
    renameBoard(child!.id, clean)
    updateCard(card.id, { title: clean })
  }

  const cardCount = child.cards.length
  const subCount  = boards.filter(b => b.parentId === child.id).length

  // One pass, no Math.max(...spread) — a big board would blow the
  // argument limit. Seeded at 1 so an empty board can't produce a
  // zero-sized viewBox.
  const bounds = { w: 1, h: 1 }
  for (const c of child.cards) {
    if (c.x + c.width > bounds.w) bounds.w = c.x + c.width
    if (c.y + 160     > bounds.h) bounds.h = c.y + 160
  }

  return (
    <div
      className={styles.boardCard}
      onMouseDown={onMouseDown}
      onClick={onClick}
      title="Click to open this board"
    >
      {/* Mini preview of the child board's layout */}
      <div className={styles.boardPreview} aria-hidden="true">
        {cardCount > 0 ? (
          <svg
            className={styles.boardThumb}
            viewBox={`0 0 ${bounds.w} ${bounds.h}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {child.cards.map(c => (
              <rect
                key={c.id}
                x={c.x} y={c.y} width={c.width} height={120} rx={10}
                fill="var(--nx-core-soft)"
                stroke="color-mix(in srgb, var(--nx-core) 45%, transparent)"
                strokeWidth={4}
              />
            ))}
          </svg>
        ) : (
          <span className={styles.boardEmpty}>
            <GlyphIcon name={child.icon} accent={child.accent} size={22} />
            Empty board
          </span>
        )}
      </div>

      <div className={styles.boardNameRow}>
        {/* Icon doubles as the picker trigger */}
        <div className={styles.boardIconWrap}>
          <button
            ref={iconBtnRef}
            className={styles.boardIconBtn}
            onClick={e => { e.stopPropagation(); setPicking(v => !v) }}
            onMouseDown={e => e.stopPropagation()}
            title="Change this board's icon"
            aria-label="Change board icon"
          >
            <GlyphIcon name={child.icon} accent={child.accent} size={17} />
          </button>

          {picking && (
            <IconPicker
              icon={child.icon}
              accent={child.accent}
              anchorRef={iconBtnRef}
              onPick={(icon, accent) => setBoardIcon(child.id, icon, accent)}
              onClose={() => setPicking(false)}
            />
          )}
        </div>

        <input
          className={styles.boardName}
          defaultValue={child.name}
          key={child.name}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onBlur={e => rename(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            e.stopPropagation()
          }}
          spellCheck={false}
        />
      </div>

      <div className={styles.boardFooter}>
        <span className={styles.boardMeta}>
          {cardCount} card{cardCount === 1 ? '' : 's'}
          {subCount > 0 && ` · ${subCount} sub-board${subCount === 1 ? '' : 's'}`}
        </span>
        <button
          className={styles.boardOpen}
          onClick={e => { e.stopPropagation(); open() }}
          onMouseDown={e => e.stopPropagation()}
        >
          Open <Icon name="chevron-right" size={12} />
        </button>
      </div>
    </div>
  )
}
