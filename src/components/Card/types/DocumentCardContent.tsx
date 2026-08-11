import { useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import { GlyphIcon } from '@/UI/glyphs'
import { IconPicker } from '@/UI/IconPicker'
import type { DocumentCard } from '@/types'
import { wordCount } from '@/utils/text'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// DOCUMENT CARD — a file tile, not a preview pane
//
// On the board a document is reduced to an icon and a word count, and
// the card itself is the smallest type on the canvas. It used to show
// a 280-character excerpt in a little paper sheet, which on a busy
// board meant every document was a wall of unreadable 12px text
// competing with the notes around it. A document's job on the canvas
// is to be FOUND; its job in the editor is to be READ.
//
// That makes the icon the only thing distinguishing one document from
// another at a glance, so it is customizable — same glyph set, custom
// image upload and accent colors as boards use (UI/glyphs.tsx).
//
// The tile is the click target and opens the editor. The picker hangs
// off a small button that only appears on hover, so customizing never
// competes with opening and costs no space at rest.
// ─────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 5 // px — moves beyond this count as a drag, not a click

interface Props { card: DocumentCard }

export function DocumentCardContent({ card }: Props) {
  const { openDocument, updateCard } = useCanvasStore.getState()
  const downPos    = useRef<{ x: number; y: number } | null>(null)
  const iconBtnRef = useRef<HTMLButtonElement>(null)
  const [picking, setPicking] = useState(false)

  // wordCount strips the HTML itself — don't pre-flatten it, or text
  // containing a literal "<" gets swallowed as a tag on the second pass.
  const words = wordCount(card.content.html)
  const isEmpty = words === 0
  const open = () => openDocument(card.id)

  // Single click opens the editor — but only if the pointer didn't
  // move far between mousedown and click (i.e. it wasn't a drag).
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

  const pickIcon = (icon: string, accent: string) =>
    updateCard(card.id, { content: { ...card.content, icon, accent } })

  return (
    <div
      className={styles.docTile}
      onMouseDown={onMouseDown}
      onClick={onClick}
      title="Click to open"
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
        e.stopPropagation()
      }}
    >
      {/* Customize — hover-only so the resting tile stays minimal */}
      <button
        ref={iconBtnRef}
        className={styles.docTileEdit}
        onClick={e => { e.stopPropagation(); setPicking(v => !v) }}
        onMouseDown={e => e.stopPropagation()}
        title="Change this document's icon"
        aria-label="Change document icon"
      ><Icon name="color" size={11} /></button>

      {picking && (
        <IconPicker
          icon={card.content.icon}
          accent={card.content.accent}
          anchorRef={iconBtnRef}
          onPick={pickIcon}
          onClose={() => setPicking(false)}
        />
      )}

      <span className={`${styles.docTileIcon} ${isEmpty ? styles.docTileIconEmpty : ''}`}>
        <GlyphIcon
          name={card.content.icon ?? 'document'}
          accent={card.content.accent ?? 'var(--nx-core-hot)'}
          size={26}
        />
      </span>

      <span className={styles.docTileCount}>
        {isEmpty ? 'Empty' : `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`}
      </span>
    </div>
  )
}
