import { useEffect, useRef, useState } from 'react'
import { useCanvasStore, useActiveTool, useCamera, useConnectFrom } from '@/store'
import { getViewportCenter } from '@/utils/canvas'
import { Icon, type IconName } from '@/UI/Icon'
import { TemplatesModal }   from '@/components/UI/TemplatesModal'
import { TableSizeDialog }  from '@/components/UI/TableSizeDialog'
import type { CardType } from '@/types'
import styles from './Toolbar.module.css'

// ─────────────────────────────────────────────────────────────
// TOOLBAR — bottom-center tool dock
//
//   • Related card types share one button with a hover dropdown
//     (Note → note/document/heading/comment, Media → image/audio/
//     video) so fifteen card types don't become fifteen buttons
//   • Table click opens TableSizeDialog for row/col selection
//   • Icons are Nuclear Nexus monoline glyphs (see UI/Icon.tsx);
//     tooltips use the global [data-tip] bubble from global.css
// ─────────────────────────────────────────────────────────────

type PlaceableType = Exclude<CardType, 'table'>

interface DropdownItem {
  type: PlaceableType
  icon: IconName
  label: string
  hint: string
}

const NOTE_ITEMS: DropdownItem[] = [
  { type: 'note',     icon: 'note',     label: 'Note',     hint: 'Short rich-text note' },
  { type: 'document', icon: 'document', label: 'Document', hint: 'Long-form paper document' },
  { type: 'heading',  icon: 'heading',  label: 'Heading',  hint: 'Section title for the board' },
  { type: 'comment',  icon: 'comment',  label: 'Comment',  hint: 'Timestamped comment thread' },
]

const MEDIA_ITEMS: DropdownItem[] = [
  { type: 'media', icon: 'media', label: 'Image', hint: 'Upload, drop, or link an image' },
  { type: 'audio', icon: 'audio', label: 'Audio', hint: 'Small upload or a track link' },
  { type: 'video', icon: 'video', label: 'Video', hint: 'YouTube, Vimeo, or a direct link' },
]

export function Toolbar() {
  const activeTool    = useActiveTool()
  const camera        = useCamera()
  const connectFromId = useConnectFrom()

  const [showTemplates, setShowTemplates]     = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [openMenu, setOpenMenu]               = useState<'note' | 'media' | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    setActiveTool, addCard, selectAll, deleteSelected,
    clearBoard, resetView, setConnectFrom,
  } = useCanvasStore.getState()

  function placeCard(type: PlaceableType) {
    const center = getViewportCenter(camera)
    addCard(type, center.x - 150, center.y - 60)
    setActiveTool('select')
    setOpenMenu(null)
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

  // Shared hover behaviour for the grouped tool buttons. The close is
  // delayed so the pointer can cross the gap into the menu.
  function onMenuEnter(menu: 'note' | 'media') {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setOpenMenu(menu)
  }
  function onMenuLeave() {
    hoverTimer.current = setTimeout(() => setOpenMenu(null), 200)
  }

  // Don't let the close timer fire into a dead component (e.g. the board
  // was closed mid-hover).
  useEffect(() => {
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }
  }, [])

  function ToolMenu({
    menu, icon, items, label,
  }: { menu: 'note' | 'media'; icon: IconName; items: DropdownItem[]; label: string }) {
    const groupActive = items.some(i => i.type === activeTool)
    return (
      <div
        className={styles.dropdownWrap}
        onMouseEnter={() => onMenuEnter(menu)}
        onMouseLeave={onMenuLeave}
      >
        <button
          className={`${styles.btn} ${groupActive ? styles.active : ''}`}
          onClick={() => placeCard(items[0].type)}
          aria-label={label}
        ><Icon name={icon} /></button>

        {openMenu === menu && (
          <div className={styles.dropdown}>
            {items.map(item => (
              <button
                key={item.type}
                className={styles.dropdownItem}
                onClick={() => placeCard(item.type)}
              >
                <span className={styles.dropdownIcon}><Icon name={item.icon} size={16} /></span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Connect-mode banner */}
      {connectFromId && (
        <div className={styles.connectBanner}>
          <Icon name="connect" size={14} />
          <span>Click a card to connect — or</span>
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
            data-tip="Select (V)"
            aria-label="Select"
          ><Icon name="select" /></button>

          {/* Note / Document / Heading / Comment */}
          <ToolMenu menu="note" icon="note" items={NOTE_ITEMS} label="Note card" />

          {/* Task */}
          <button
            className={`${styles.btn} ${activeTool === 'task' ? styles.active : ''}`}
            onClick={() => placeCard('task')}
            data-tip="Task list (T)"
            aria-label="Task list"
          ><Icon name="task" /></button>

          {/* Table — opens size dialog */}
          <button
            className={`${styles.btn} ${activeTool === 'table' ? styles.active : ''}`}
            onClick={() => { setActiveTool('table'); setShowTableDialog(true) }}
            data-tip="Table — pick size"
            aria-label="Table"
          ><Icon name="table" /></button>

          {/* Image / Audio / Video */}
          <ToolMenu menu="media" icon="media" items={MEDIA_ITEMS} label="Media card" />

          {/* Link */}
          <button
            className={`${styles.btn} ${activeTool === 'link' ? styles.active : ''}`}
            onClick={() => placeCard('link')}
            data-tip="Link (L)"
            aria-label="Link"
          ><Icon name="link" /></button>

          {/* Sketch */}
          <button
            className={`${styles.btn} ${activeTool === 'sketch' ? styles.active : ''}`}
            onClick={() => placeCard('sketch')}
            data-tip="Sketch — draw freehand"
            aria-label="Sketch"
          ><Icon name="sketch" /></button>

          {/* Color */}
          <button
            className={`${styles.btn} ${activeTool === 'color' ? styles.active : ''}`}
            onClick={() => placeCard('color')}
            data-tip="Color swatch"
            aria-label="Color swatch"
          ><Icon name="color" /></button>

          {/* Map */}
          <button
            className={`${styles.btn} ${activeTool === 'map' ? styles.active : ''}`}
            onClick={() => placeCard('map')}
            data-tip="Map — pin locations"
            aria-label="Map"
          ><Icon name="map" /></button>

          {/* Column */}
          <button
            className={`${styles.btn} ${activeTool === 'column' ? styles.active : ''}`}
            onClick={() => placeCard('column')}
            data-tip="Column — card container"
            aria-label="Column"
          ><Icon name="column" /></button>

          {/* Sub-board */}
          <button
            className={`${styles.btn} ${activeTool === 'board' ? styles.active : ''}`}
            onClick={() => placeCard('board')}
            data-tip="Sub-board — a board inside this one"
            aria-label="Sub-board"
          ><Icon name="board" /></button>

          {/* Connect */}
          <button
            className={`${styles.btn} ${activeTool === 'connect' ? styles.active : ''} ${connectFromId ? styles.connecting : ''}`}
            onClick={handleConnect}
            data-tip="Connect cards (C)"
            aria-label="Connect cards"
          ><Icon name="connect" /></button>
        </div>

        <div className={styles.sep} />

        {/* ── Actions ── */}
        <div className={styles.group}>
          <button
            className={styles.btn}
            onClick={selectAll}
            data-tip="Select all (Ctrl+A)"
            aria-label="Select all"
          ><Icon name="select-all" /></button>
          <button
            className={styles.btn}
            onClick={deleteSelected}
            data-tip="Delete selected (Del)"
            aria-label="Delete selected"
          ><Icon name="close" /></button>
          <button
            className={`${styles.btn} ${styles.danger}`}
            onClick={() => { if (confirm('Clear the entire board?')) clearBoard() }}
            data-tip="Clear board"
            aria-label="Clear board"
          ><Icon name="trash" /></button>
        </div>

        <div className={styles.sep} />

        {/* ── View + templates ── */}
        <div className={styles.group}>
          <button
            className={styles.btn}
            onClick={resetView}
            data-tip="Reset view (Ctrl+0)"
            aria-label="Reset view"
          ><Icon name="reset-view" /></button>
          <button
            className={styles.btn}
            onClick={() => setShowTemplates(true)}
            data-tip="Templates"
            aria-label="Templates"
          ><Icon name="templates" /></button>
        </div>
      </div>

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
