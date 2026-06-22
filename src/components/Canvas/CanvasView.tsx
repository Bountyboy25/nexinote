import { useRef, useCallback, useEffect, useState } from 'react'
import { useCanvasStore, useCards, useCamera, useSelectedIds } from '@/store'
import { useKeyboard }   from '@/hooks/useKeyboard'
import { useCanvasPan }  from '@/hooks/useCanvasPan'
import { useCanvasZoom } from '@/hooks/useCanvasZoom'
import { CardNode }       from '@/components/Card/CardNode'
import { ConnectorLayer } from './ConnectorLayer'
import { screenToWorld, getViewportCenter }  from '@/utils/canvas'
import { fileToImageDataURL, isImageSrc }    from '@/utils/image'
import styles from './CanvasView.module.css'

const SIDEBAR_W = 56

export function CanvasView() {
  const cards       = useCards()
  const camera      = useCamera()
  const selectedIds = useSelectedIds()
  const { addCard, updateCard, deselectAll } = useCanvasStore.getState()

  const sidebarOpen = selectedIds.size > 0
  const leftOffset  = sidebarOpen ? SIDEBAR_W : 0

  const canvasRef = useRef<HTMLDivElement>(null)
  const [dropActive, setDropActive] = useState(false)

  const { spaceHeld } = useKeyboard(canvasRef)
  useCanvasPan(canvasRef, spaceHeld)
  useCanvasZoom(canvasRef)

  // ── Create an image card and stream the (downscaled) source in ──
  const addImageCard = useCallback((worldX: number, worldY: number, file: File, index = 0) => {
    const card = addCard('media', worldX - 130 + index * 24, worldY - 90 + index * 24)
    const title = file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Image'
    fileToImageDataURL(file)
      .then(src => updateCard(card.id, { title, content: { src, fit: 'cover' } }))
      .catch(() => { /* leave the empty media card so the user can retry */ })
  }, [addCard, updateCard])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-card]')) {
      const worldPos = screenToWorld(e.clientX, e.clientY, camera)
      addCard('note', worldPos.x - 140, worldPos.y - 60)
    }
  }, [camera, addCard])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-card]') && !spaceHeld.current) {
      deselectAll()
    }
  }, [deselectAll, spaceHeld])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // ── Drag & drop images onto the canvas ──
  const onDragOver = useCallback((e: React.DragEvent) => {
    const t = e.dataTransfer.types
    if (t.includes('Files') || t.includes('text/uri-list')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDropActive(true)
    }
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the canvas entirely, not when moving over a child
    if (e.relatedTarget && (e.currentTarget as Node).contains(e.relatedTarget as Node)) return
    setDropActive(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDropActive(false)
    const world = screenToWorld(e.clientX, e.clientY, camera)

    const images = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (images.length) {
      images.forEach((file, i) => addImageCard(world.x, world.y, file, i))
      return
    }

    // Dropped an image URL (e.g. dragged from another browser tab)
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (uri && isImageSrc(uri)) {
      const card = addCard('media', world.x - 130, world.y - 90)
      updateCard(card.id, { content: { src: uri.trim(), fit: 'cover' } })
    }
  }, [camera, addCard, updateCard, addImageCard])

  // ── Paste an image from the clipboard → media card at viewport center ──
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const ae = document.activeElement as HTMLElement | null
      // Don't hijack pastes while editing text
      if (ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return
      const item = Array.from(e.clipboardData?.items ?? []).find(it => it.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (!file) return
      e.preventDefault()
      const center = getViewportCenter(useCanvasStore.getState().camera)
      addImageCard(center.x, center.y, file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [addImageCard])

  const worldTransform = {
    transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
    transformOrigin: '0 0',
    willChange: 'transform' as const,
  }

  const gridSize = 32 * camera.zoom
  const gridStyle = {
    backgroundSize:     `${gridSize}px ${gridSize}px`,
    backgroundPosition: `${camera.x % gridSize}px ${camera.y % gridSize}px`,
  }

  return (
    <div
      ref={canvasRef}
      className={`${styles.canvas} ${dropActive ? styles.dropActive : ''}`}
      style={{ left: leftOffset, transition: 'left 140ms cubic-bezier(0.4,0,0.2,1)' }}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ConnectorLayer />
      <div className={styles.grid} style={gridStyle} />
      <div className={styles.world} style={worldTransform}>
        {cards.map(card => (
          <CardNode key={card.id} card={card} />
        ))}
      </div>
      {dropActive && (
        <div className={styles.dropHint}>
          <span>🖼️ Drop image to add it to the board</span>
        </div>
      )}
    </div>
  )
}
