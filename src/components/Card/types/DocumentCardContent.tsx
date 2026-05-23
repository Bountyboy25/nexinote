import { useRef, useCallback, useEffect } from 'react'
import { useCanvasStore } from '@/store'
import type { DocumentCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// DOCUMENT CARD — Paper-like full-document card
//
// Visually resembles a sheet of paper:
//   • White/off-white background
//   • Horizontal rule lines (decorative, behind text)
//   • Internal scrolling when content overflows
//   • Uses contentEditable for rich text (same as Note card)
//
// This card is designed for long-form writing.
// ─────────────────────────────────────────────────────────────

interface Props { card: DocumentCard }

export function DocumentCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const editorRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = card.content.html
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(() => {
    if (editorRef.current) {
      updateCard(card.id, { content: { html: editorRef.current.innerHTML } })
    }
  }, [card.id, updateCard])

  return (
    <div className={styles.documentCard}>
      {/* Decorative horizontal lines — simulate ruled paper */}
      <div className={styles.documentLines} aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={styles.documentLine} />
        ))}
      </div>

      {/* Editable area sits above the lines */}
      <div
        ref={editorRef}
        className={styles.documentEditor}
        contentEditable
        suppressContentEditableWarning
        onBlur={save}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        data-placeholder="Start writing your document…"
      />
    </div>
  )
}
