import { useCallback, useMemo } from 'react'
import {
  useCanvasStore, useCards, useCamera, useConnectors,
  useDraggingCardId, useSettings,
} from '@/store'
import { worldToScreen } from '@/utils/canvas'
import type { AnchorPoint } from '@/types'
import styles from './ConnectorLayer.module.css'

// ─────────────────────────────────────────────────────────────
// CONNECTOR LAYER — Full-screen SVG bezier arrows
//
// Phase 3:
//   • z-index 1  → cards (z-index 2) render above arrows, so
//     the tail is naturally hidden behind the source card
//   • Arrow-head snaps to the closest of 6 anchor points
//   • Flowing-dash animation with drag-speed boost
//   • "Animate Arrows" settings toggle
// ─────────────────────────────────────────────────────────────

const CARD_H = 160

function anchorPos(
  anchor: AnchorPoint | undefined,
  cx: number, cy: number, cw: number,
): { x: number; y: number } {
  switch (anchor) {
    case 'top-left':  return { x: cx,       y: cy }
    case 'top-right': return { x: cx + cw,  y: cy }
    case 'mid-left':  return { x: cx,       y: cy + CARD_H / 2 }
    case 'mid-right': return { x: cx + cw,  y: cy + CARD_H / 2 }
    case 'bot-left':  return { x: cx,       y: cy + CARD_H }
    case 'bot-right': return { x: cx + cw,  y: cy + CARD_H }
    default:          return { x: cx + cw / 2, y: cy + CARD_H / 2 }
  }
}

export function ConnectorLayer() {
  const cards           = useCards()
  const camera          = useCamera()
  const connectors      = useConnectors()
  const draggingCardId  = useDraggingCardId()
  const settings        = useSettings()
  const deleteConnector = useCanvasStore(s => s.deleteConnector)

  const cardMap = useMemo(
    () => new Map(cards.map(c => [c.id, c])),
    [cards],
  )

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      deleteConnector(id)
    },
    [deleteConnector],
  )

  return (
    <svg className={styles.layer} style={{ pointerEvents: 'none' }}>
      <defs>
        <marker id="arrowNormal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c6af5" />
        </marker>
        <marker id="arrowFast" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b" />
        </marker>
      </defs>

      {connectors.map(conn => {
        const from = cardMap.get(conn.fromId)
        const to   = cardMap.get(conn.toId)
        if (!from || !to) return null

        const srcW = { x: from.x + from.width / 2, y: from.y + CARD_H / 2 }
        const tgtW = anchorPos(conn.toAnchor, to.x, to.y, to.width)

        const src = worldToScreen(srcW.x, srcW.y, camera)
        const tgt = worldToScreen(tgtW.x, tgtW.y, camera)

        const dx    = Math.abs(tgt.x - src.x)
        const cpOff = Math.max(60, dx * 0.5)
        const d     = `M ${src.x} ${src.y} C ${src.x + cpOff} ${src.y} ${tgt.x - cpOff} ${tgt.y} ${tgt.x} ${tgt.y}`

        const fast    = draggingCardId === conn.fromId || draggingCardId === conn.toId
        const animate = settings.animateArrows

        const lineColor  = fast ? '#f59e0b' : '#7c6af5'
        const lineWidth  = fast ? '2' : '1.5'
        const lineOpacity = fast ? '0.9' : '0.7'
        const dashArray  = animate ? '6 4' : ''
        const dashClass  = animate ? (fast ? styles.dashFast : styles.dashSlow) : ''
        const markerRef  = fast ? 'url(#arrowFast)' : 'url(#arrowNormal)'

        return (
          <g key={conn.id} style={{ pointerEvents: 'auto' }}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="12"
              style={{ cursor: 'pointer' }}
              onClick={e => handleDelete(conn.id, e)}
            />
            <path
              d={d}
              fill="none"
              stroke={lineColor}
              strokeWidth={lineWidth}
              strokeOpacity={lineOpacity}
              strokeDasharray={dashArray}
              className={dashClass}
              markerEnd={markerRef}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      })}
    </svg>
  )
}
