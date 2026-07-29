import { useRef } from 'react'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import type { DocumentCard } from '@/types'
import { wordCount } from '@/utils/text'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// DOCUMENT CARD — a file tile, not a preview pane
//
// On the board a document is deliberately reduced to an icon and a
// word count. It used to show a 280-character excerpt in a little
// paper sheet, which on a busy board meant every document card was
// a wall of unreadable 12px text competing with the notes around it.
// A document's job on the canvas is to be FOUND; its job in the
// editor is to be READ.
//
// The whole tile is the click target — clicking opens the full-page
// editor (DocumentEditorModal), which is where the contents live.
// ─────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 5 // px — moves beyond this count as a drag, not a click

interface Props { card: DocumentCard }

export function DocumentCardContent({ card }: Props) {
  const openDocument = useCanvasStore(s => s.openDocument)
  const downPos = useRef<{ x: number; y: number } | null>(null)

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
      <span className={`${styles.docTileIcon} ${isEmpty ? styles.docTileIconEmpty : ''}`}>
        <Icon name="document" size={34} />
      </span>

      <span className={styles.docTileCount}>
        {isEmpty ? 'Empty' : `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`}
      </span>

      {/* Reads as an affordance without costing a row of its own —
          the whole tile is already clickable. */}
      <span className={styles.docTileHint}>Open</span>
    </div>
  )
}
