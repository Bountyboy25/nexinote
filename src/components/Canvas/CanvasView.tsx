import { useRef, useCallback } from 'react'
import { useCanvasStore, useCards, useCamera, useSelectedIds } from '@/store'
import { useKeyboard }   from '@/hooks/useKeyboard'
import { useCanvasPan }  from '@/hooks/useCanvasPan'
import { useCanvasZoom } from '@/hooks/useCanvasZoom'
import { CardNode }       from '@/components/Card/CardNode'
import { ConnectorLayer } from './ConnectorLayer'
import { screenToWorld }  from '@/utils/canvas'
import styles from './CanvasView.module.css'

const SIDEBAR_W = 56

export function CanvasView() {
  const cards       = useCards()
  const camera      = useCamera()
  const selectedIds = useSelectedIds()
  const { addCard, deselectAll } = useCanvasStore.getState()

  const sidebarOpen = selectedIds.size > 0
  const leftOffset  = sidebarOpen ? SIDEBAR_W : 0

  const canvasRef = useRef<HTMLDivElement>(null)

  const { spaceHeld } = useKeyboard(canvasRef)
  useCanvasPan(canvasRef, spaceHeld)
  useCanvasZoom(canvasRef)

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
      className={styles.canvas}
      style={{ left: leftOffset, transition: 'left 140ms cubic-bezier(0.4,0,0.2,1)' }}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      <ConnectorLayer />
      <div className={styles.grid} style={gridStyle} />
      <div className={styles.world} style={worldTransform}>
        {cards.map(card => (
          <CardNode key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
