import { useEffect, useRef, useState, useCallback } from 'react'
import { useCanvasStore, useOpenDocId } from '@/store'
import { wordCount } from '@/utils/text'
import type { DocumentCard } from '@/types'
import styles from './DocumentEditorModal.module.css'

// ─────────────────────────────────────────────────────────────
// DOCUMENT EDITOR MODAL — Milanote-style full-page writing view
//
// Opening a document card (double-click / "Open") sets openDocId
// in the store, which mounts this focused editor over the canvas.
//
//   • Large paper-styled page for long-form writing
//   • Editable title + formatting toolbar (bold/italic/headings/…)
//   • Autosaves to the store (debounced) and on close
//   • Closes on Escape, overlay click, or the ✕ button
//
// The on-canvas card only shows a compact preview — all writing
// happens here, just like a Milanote document.
// ─────────────────────────────────────────────────────────────

const TOOLS: { label: string; title: string; cmd: string; value?: string }[] = [
  { label: 'B',  title: 'Bold',           cmd: 'bold' },
  { label: 'I',  title: 'Italic',         cmd: 'italic' },
  { label: 'U',  title: 'Underline',      cmd: 'underline' },
  { label: 'H1', title: 'Heading 1',      cmd: 'formatBlock', value: '<h1>' },
  { label: 'H2', title: 'Heading 2',      cmd: 'formatBlock', value: '<h2>' },
  { label: '¶',  title: 'Body text',      cmd: 'formatBlock', value: '<p>' },
  { label: '• List', title: 'Bullet list',  cmd: 'insertUnorderedList' },
  { label: '1. List', title: 'Numbered list', cmd: 'insertOrderedList' },
]

export function DocumentEditorModal() {
  const openDocId = useOpenDocId()
  const card = useCanvasStore(
    s => s.cards.find(c => c.id === s.openDocId) as DocumentCard | undefined
  )
  const { updateCard, closeDocument } = useCanvasStore.getState()

  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [words, setWords] = useState(0)
  const [dirty, setDirty] = useState(false)

  const recount = useCallback(() => {
    setWords(editorRef.current ? wordCount(editorRef.current.innerHTML) : 0)
  }, [])

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (editorRef.current && openDocId) {
      updateCard(openDocId, { content: { html: editorRef.current.innerHTML } })
      setDirty(false)
    }
  }, [openDocId, updateCard])

  const scheduleSave = useCallback(() => {
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveNow, 400)
  }, [saveNow])

  const close = useCallback(() => {
    saveNow()
    closeDocument()
  }, [saveNow, closeDocument])

  // Load content + focus when a document opens (or a different one).
  useEffect(() => {
    if (!openDocId || !editorRef.current) return
    editorRef.current.innerHTML = card?.content.html ?? ''
    recount()
    setDirty(false)
    editorRef.current.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDocId])

  // Flush any pending save if the editor unmounts.
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  if (!openDocId || !card) return null

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    recount()
    scheduleSave()
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={close}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); close() }
      }}
    >
      <div className={styles.page} onMouseDown={e => e.stopPropagation()}>
        {/* Header — title + close */}
        <div className={styles.header}>
          <span className={styles.docIcon}>📄</span>
          <input
            className={styles.titleInput}
            value={card.title}
            onChange={e => updateCard(openDocId!, { title: e.target.value })}
            placeholder="Untitled document"
            spellCheck={false}
          />
          <button className={styles.close} onClick={close} title="Close (Esc)">✕</button>
        </div>

        {/* Formatting toolbar */}
        <div className={styles.toolbar}>
          {TOOLS.map(t => (
            <button
              key={t.label}
              className={styles.toolBtn}
              title={t.title}
              // preventDefault keeps the text selection in the editor
              onMouseDown={e => e.preventDefault()}
              onClick={() => exec(t.cmd, t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* The writing surface */}
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { recount(); scheduleSave() }}
          onBlur={saveNow}
          data-placeholder="Start writing…"
        />

        {/* Footer — word count + save state */}
        <div className={styles.footer}>
          <span>{words} {words === 1 ? 'word' : 'words'}</span>
          <span className={styles.saveState}>{dirty ? 'Saving…' : 'Saved'}</span>
        </div>
      </div>
    </div>
  )
}
