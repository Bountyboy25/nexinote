import { useRef, useCallback, useEffect } from 'react'
import { useCanvasStore } from '@/store'
import type { NoteCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// RICH TEXT CARD — Phase 3
//
// Inline formatting toolbar removed; formatting is now handled
// by the global SideTaskbar. The card only renders a
// contentEditable area. Formatting still works via
// document.execCommand() triggered from the SideTaskbar, which
// uses onMouseDown + e.preventDefault() to preserve selection.
// ─────────────────────────────────────────────────────────────

interface Props { card: NoteCard }

export function RichTextCard({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const editorRef  = useRef<HTMLDivElement>(null)

  // Set initial HTML once on mount — after that the user owns the DOM
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
    <div className={styles.richText}>
      <div
        ref={editorRef}
        className={styles.richEditor}
        contentEditable
        suppressContentEditableWarning
        onBlur={save}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        data-placeholder="Start writing…"
      />
    </div>
  )
}
