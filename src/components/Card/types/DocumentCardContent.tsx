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
//   • double-clicking the tile, or
//   • clicking the "Open" button.
//
// This mirrors Milanote, where a document is a file you open into
// a focused writing view — not an inline box you type into on the
// canvas.
// ─────────────────────────────────────────────────────────────

const PREVIEW_CHARS = 280

interface Props { card: DocumentCard }

export function DocumentCardContent({ card }: Props) {
  const openDocument = useCanvasStore(s => s.openDocument)

  const text  = htmlToText(card.content.html)
  const words = text ? text.split(/\s+/).length : 0
  const open  = () => openDocument(card.id)

  return (
    <div
      className={styles.docPreview}
      onDoubleClick={e => { e.stopPropagation(); open() }}
      title="Double-click to open"
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
