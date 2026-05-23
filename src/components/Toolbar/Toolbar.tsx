import { useState, useRef } from 'react'
import { useCanvasStore, useActiveTool, useCamera, useConnectFrom } from '@/store'
import { getViewportCenter } from '@/utils/canvas'
import { TemplatesModal }   from '@/components/UI/TemplatesModal'
import { TableSizeDialog }  from '@/components/UI/TableSizeDialog'
import type { ActiveTool }  from '@/types'
import styles from './Toolbar.module.css'

// ─────────────────────────────────────────────────────────────
// TOOLBAR — Phase 3
//
// Changes:
//   • Note button is a hover-dropdown (Note | Document)
//   • Table click opens TableSizeDialog for row/col selection
//   • Otherwise identical to Phase 2
// ─────────────────────────────────────────────────────────────

export function Toolbar() {
  const activeTool    = useActiveTool()
  const camera        = useCamera()
  const connectFromId = useConnectFrom()

  const [showTemplates, setShowTemplates]   = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showNoteDropdown, setShowNoteDropdown] = useState(false)
  const noteHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    setActiveTool, addCard, selectAll, deleteSelected,
    clearBoard, resetView, setConnectFrom,
  } = useCanvasStore.getState()

  function placeCard(type: ActiveTool & ('note' | 'document' | 'task' | 'media' | 'link' | 'column')) {
    const center = getViewportCenter(camera)
    addCard(type, center.x - 150, center.y - 60)
    setActiveTool('select')
    if (connectFromId) setConnectFrom(null)
  }

  function handleTableConfirm(rows: number, cols: number) {
    setShowTableDialog(false)
    const center = getViewportCenter(camera)
    addCard('table', center.x - 140, center.y - 60, { rows, cols })
    setActiveTool('select')
  }

  function handleConnect() {
    setActiveTool('connect')
    if (connectFromId) setConnectFrom(null)
  }

  const cancelConnect = () => {
    setConnectFrom(null)
    setActiveTool('select')
  }

  // Note hover dropdown
  function onNoteMouseEnter() {
    if (noteHoverTimer.current) clearTimeout(noteHoverTimer.current)
    setShowNoteDropdown(true)
  }
  function onNoteMouseLeave() {
    noteHoverTimer.current = setTimeout(() => setShowNoteDropdown(false), 200)
  }

  return (
    <>
      {/* Connect-mode banner */}
      {connectFromId && (
        <div className={styles.connectBanner}>
          <span>🔗 Click a card to connect — or</span>
          <button className={styles.connectCancel} onClick={cancelConnect}>Cancel</button>
        </div>
      )}

      <div className={styles.toolbar}>
        {/* ── Card type tools ── */}
        <div className={styles.group}>
          {/* Select */}
          <button
            className={`${styles.btn} ${activeTool === 'select' ? styles.active : ''}`}
            onClick={() => setActiveTool('select')}
            title="Select (V)"
          >⬚</button>

          {/* Note (with hover dropdown for Document subtype) */}
          <div
            className={styles.dropdownWrap}
            onMouseEnter={onNoteMouseEnter}
            onMouseLeave={onNoteMouseLeave}
          >
            <button
              className={`${styles.btn} ${activeTool === 'note' || activeTool === 'document' ? styles.active : ''}`}
              onClick={() => placeCard('note')}
              title="Note card (N) — hover for Document"
            >📝</button>

            {showNoteDropdown && (
              <div className={styles.dropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { placeCard('note'); setShowNoteDropdown(false) }}
                >
                  <span className={styles.dropdownIcon}>📝</span>
                  <span>
                    <strong>Note</strong>
                    <small>Short rich-text note</small>
                  </span>
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { placeCard('document'); setShowNoteDropdown(false) }}
                >
                  <span className={styles.dropdownIcon}>📄</span>
                  <span>
                    <strong>Document</strong>
                    <small>Long-form paper document</small>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Task */}
          <button
            className={`${styles.btn} ${activeTool === 'task' ? styles.active : ''}`}
            onClick={() => placeCard('task')}
            title="Task list (T)"
          >✅</button>

          {/* Table — opens size dialog */}
          <button
            className={`${styles.btn} ${activeTool === 'table' ? styles.active : ''}`}
            onClick={() => { setActiveTool('table'); setShowTableDialog(true) }}
            title="Table — pick size"
          >📊</button>

          {/* Media */}
          <button
            className={`${styles.btn} ${activeTool === 'media' ? styles.active : ''}`}
            onClick={() => placeCard('media')}
            title="Image (I)"
          >🖼️</button>

          {/* Link */}
          <button
            className={`${styles.btn} ${activeTool === 'link' ? styles.active : ''}`}
            onClick={() => placeCard('link')}
            title="Link (L)"
          >🔗</button>

          {/* Column */}
          <button
            className={`${styles.btn} ${activeTool === 'column' ? styles.active : ''}`}
            onClick={() => placeCard('column')}
            title="Column — card container"
          >▤</button>

          {/* Connect */}
          <button
            className={`${styles.btn} ${activeTool === 'connect' ? styles.active : ''} ${connectFromId ? styles.connecting : ''}`}
            onClick={handleConnect}
            title="Connect cards (C)"
          >⟶</button>
        </div>

        <div className={styles.sep} />

        {/* ── Actions ── */}
        <div className={styles.group}>
          <button className={styles.btn} onClick={selectAll}      title="Select all (Ctrl+A)">⊞</button>
          <button className={styles.btn} onClick={deleteSelected} title="Delete selected (Del)">✕</button>
          <button
            className={`${styles.btn} ${styles.danger}`}
            onClick={() => { if (confirm('Clear the entire board?')) clearBoard() }}
            title="Clear board"
          >🗑️</button>
        </div>

        <div className={styles.sep} />

        {/* ── View + templates ── */}
        <div className={styles.group}>
          <button className={styles.btn} onClick={resetView}                   title="Reset view (Ctrl+0)">⊙</button>
          <button className={styles.btn} onClick={() => setShowTemplates(true)} title="Templates">⊟</button>
        </div>
      </div>

      {/* Modals */}
      {/* Modals */}
      {showTemplates   && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      {showTableDialog && (
        <TableSizeDialog
          onConfirm={handleTableConfirm}
          onCancel={() => { setShowTableDialog(false); setActiveTool('select') }}
        />
      )}
    </>
  )
}
