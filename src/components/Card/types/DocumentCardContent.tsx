import { useRef } from 'react'
import { useCanvasStore } from '@/store'
import type { DocumentCard } from '@/types'
import { htmlToText } from '@/utils/text'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// DOCUMENT CARD — Milanote-style document tile
//
// On the board the document is a compact "page" tile showing a
// short excerpt + word count. Writing happens in a dedicated
// full-page editor (DocumentEditorModal), opened by:
//   • a single click on the tile (unless the card was dragged), or
//   • clicking the "Open" button.
// ─────────────────────────────────────────────────────────────

const PREVIEW_CHARS = 280
const DRAG_THRESHOLD = 5 // px — moves beyond this count as a drag, not a click

interface Props { card: DocumentCard }

export function DocumentCardContent({ card }: Props) {
  const openDocument = useCanvasStore(s => s.openDocument)
  const downPos = useRef<{ x: number; y: number } | null>(null)

  const text  = htmlToText(card.content.html)
  const words = text ? text.split(/\s+/).length : 0
  const open  = () => openDocument(card.id)

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
      className={styles.docPreview}
      onMouseDown={onMouseDown}
      onClick={onClick}
      title="Click to open"
    >
      <div className={styles.docPreviewPage} aria-hidden="true">
        {text ? (
          <p className={styles.docPreviewText}>
            {text.slice(0, PREVIEW_CHARS)}{text.length > PREVIEW_CHARS ? '…' : ''}
          </p>
        ) : (
          <p className={styles.docPreviewEmpty}>Empty document</p>
        )}
      </div>

      <div className={styles.docPreviewFooter}>
        <span className={styles.docPreviewMeta}>
          {words} {words === 1 ? 'word' : 'words'}
        </span>
        <button
          className={styles.docOpenBtn}
          onClick={e => { e.stopPropagation(); open() }}
          onMouseDown={e => e.stopPropagation()}
        >
          Open ↗
        </button>
      </div>
    </div>
  )
}
