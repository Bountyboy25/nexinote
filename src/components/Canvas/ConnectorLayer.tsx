import { useCallback, useMemo, useRef, useState } from 'react'
import {
  useCanvasStore, useCards, useCamera, useConnectors,
  useDraggingCardId, useSettings,
} from '@/store'
import { worldToScreen, rectEdgePoint } from '@/utils/canvas'
import { useCardHeights, DEFAULT_CARD_H } from '@/hooks/useCardHeights'
import type { ConnectorStyle } from '@/types'
import styles from './ConnectorLayer.module.css'

// ─────────────────────────────────────────────────────────────
// CONNECTOR LAYER — Full-screen SVG arrows
//
//   • z-index 1 → cards (z-index 2) render above arrows, which is
//     what buries the tail under the source card
//   • GEOMETRY — an arrow is the straight segment between the two
//     card CENTERS, clipped to the target's border:
//       tail  = source center. It sits under the card, so the line
//               appears to emerge from beneath whichever side faces
//               the target — no visible base, ever.
//       head  = the point where that segment crosses the TARGET's
//               real rectangle (rectEdgePoint), minus a small gap.
//     Because the exit point is a true ray/rect intersection it
//     slides continuously along the edge and around the corners as
//     either card moves, so the head sweeps a full 360° instead of
//     snapping between 6 fixed anchors like it used to.
//   • Heights come from the DOM (useCardHeights), not a hardcoded
//     160px — the head only lands on the real edge if we know where
//     the real edge is.
//   • orient="auto" on every marker + a straight segment means the
//     head's rotation is exactly the source→target angle.
//   • 5 nuclear-themed connector styles (see STYLES below)
//   • Clicking a connector opens a popup to restyle / sever it
//   • Flowing-dash animation with drag-speed boost. Each style
//     declares a --dash-cycle that is an EXACT multiple of its
//     dash period, so the loop wraps seamlessly (no stutter).
//     Animated paths use a cheap halo underlay instead of a
//     per-frame drop-shadow blur.
// ─────────────────────────────────────────────────────────────

const MENU_W = 200
const MENU_H = 236

// Screen-space breathing room between the arrow tip and the card border,
// so the head reads as pointing AT the card rather than buried in it.
// Applied after the world→screen conversion so it stays constant at
// every zoom level.
const HEAD_GAP = 3

// ── Nuclear style catalogue ───────────────────────────────────
interface StyleDef {
  name: string
  hint: string
  stroke: string        // CSS var
  glow: string          // drop-shadow / halo color var
  width: number
  opacity: number
  dash?: string
  linecap?: 'round' | 'butt'
  marker: string        // marker id (without url())
  outer?: { stroke: string; width: number; opacity: number }  // containment wall
  // Flow animation timing. `cycle` MUST be an exact multiple of the
  // dash period (dash + gap) or the looping offset visibly snaps.
  // Durations are tuned so all styles flow at ≈22px/s (slow) / ≈75px/s (fast).
  flow?: { cycle: number; slow: number; fast: number }
}

const STYLES: Record<ConnectorStyle, StyleDef> = {
  beam: {
    name: 'Particle Beam', hint: 'solid Cherenkov line',
    stroke: 'var(--nx-core)', glow: 'var(--nx-core-glow)',
    width: 1.5, opacity: 0.75, marker: 'nxArrowBeam',
  },
  pulse: {
    name: 'Reactor Pulse', hint: 'flowing energy dashes',
    stroke: 'var(--nx-core-hot)', glow: 'var(--nx-core-glow)',
    width: 2, opacity: 0.9, dash: '6 5', marker: 'nxArrowPulse',
    flow: { cycle: 33, slow: 1.5, fast: 0.45 },          // period 11 × 3
  },
  hazard: {
    name: 'Hazard Tape', hint: 'amber warning stripes',
    stroke: 'var(--nx-hazard)', glow: 'color-mix(in srgb, var(--nx-hazard) 40%, transparent)',
    width: 2.5, opacity: 0.85, dash: '12 6', marker: 'nxArrowHazard',
    flow: { cycle: 36, slow: 1.65, fast: 0.5 },          // period 18 × 2
  },
  decay: {
    name: 'Decay Trail', hint: 'radiation trefoil head',
    stroke: 'var(--nx-danger)', glow: 'color-mix(in srgb, var(--nx-danger) 45%, transparent)',
    width: 2, opacity: 0.8, dash: '0.5 8', linecap: 'round', marker: 'nxArrowDecay',
    flow: { cycle: 34, slow: 1.55, fast: 0.47 },         // period 8.5 × 4
  },
  containment: {
    name: 'Containment', hint: 'double-walled, sealed cap',
    stroke: 'var(--nx-core)', glow: 'var(--nx-core-glow)',
    width: 1.5, opacity: 0.9, marker: 'nxArrowSeal',
    outer: { stroke: 'var(--nx-core)', width: 7, opacity: 0.15 },
  },
}

const STYLE_ORDER: ConnectorStyle[] = ['beam', 'pulse', 'hazard', 'decay', 'containment']

// Mini line preview drawn in each menu option
function StylePreview({ def }: { def: StyleDef }) {
  return (
    <svg width="46" height="12" aria-hidden="true">
      {def.outer && (
        <line x1="2" y1="6" x2="44" y2="6"
          stroke={def.outer.stroke} strokeWidth={def.outer.width} strokeOpacity={def.outer.opacity} />
      )}
      <line x1="2" y1="6" x2="44" y2="6"
        stroke={def.stroke} strokeWidth={def.width}
        strokeOpacity={def.opacity}
        strokeDasharray={def.dash}
        strokeLinecap={def.linecap ?? 'butt'}
      />
    </svg>
  )
}

interface MenuState { id: string; style: ConnectorStyle; x: number; y: number }

export function ConnectorLayer() {
  const cards           = useCards()
  const camera          = useCamera()
  const connectors      = useConnectors()
  const draggingCardId  = useDraggingCardId()
  const settings        = useSettings()
  const updateConnector = useCanvasStore(s => s.updateConnector)
  const deleteConnector = useCanvasStore(s => s.deleteConnector)

  const svgRef = useRef<SVGSVGElement>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)

  const cardMap = useMemo(
    () => new Map(cards.map(c => [c.id, c])),
    [cards],
  )

  // Measure only the cards an arrow actually touches. Sorted so the id
  // list is stable regardless of connector ordering.
  const connectedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const c of connectors) { ids.add(c.fromId); ids.add(c.toId) }
    return [...ids].sort()
  }, [connectors])

  const cardHeights = useCardHeights(connectedIds)

  // Clicking a connector opens the style/sever popup at the cursor.
  const openMenu = useCallback(
    (id: string, style: ConnectorStyle, e: React.MouseEvent) => {
      e.stopPropagation()
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenu({
        id, style,
        x: Math.min(e.clientX - rect.left, rect.width  - MENU_W - 8),
        y: Math.min(e.clientY - rect.top,  rect.height - MENU_H - 8),
      })
    },
    [],
  )

  const pickStyle = useCallback((style: ConnectorStyle) => {
    if (menu) updateConnector(menu.id, { style })
    setMenu(null)
  }, [menu, updateConnector])

  const sever = useCallback(() => {
    if (menu) deleteConnector(menu.id)
    setMenu(null)
  }, [menu, deleteConnector])

  return (
    <>
      <svg ref={svgRef} className={styles.layer} style={{ pointerEvents: 'none' }}>
        <defs>
          {/* Particle Beam — classic triangle */}
          <marker id="nxArrowBeam" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="var(--nx-core)" />
          </marker>

          {/* Reactor Pulse — double chevron (energy surge) */}
          <marker id="nxArrowPulse" markerWidth="11" markerHeight="8" refX="9" refY="3" orient="auto">
            <path d="M0,0 L4,3 L0,6" fill="none" stroke="var(--nx-core-hot)" strokeWidth="1.6" />
            <path d="M5,0 L9,3 L5,6" fill="none" stroke="var(--nx-core-hot)" strokeWidth="1.6" />
          </marker>

          {/* Hazard Tape — heavy warning triangle */}
          <marker id="nxArrowHazard" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill="var(--nx-hazard)" />
          </marker>

          {/* Decay Trail — radiation trefoil ☢ */}
          <marker id="nxArrowDecay" markerWidth="14" markerHeight="14" refX="7" refY="7" orient="auto" markerUnits="userSpaceOnUse">
            <g fill="var(--nx-danger)">
              <path d="M7 7 L7 1.8 A5.2 5.2 0 0 1 11.5 4.4 Z" />
              <path d="M7 7 L7 1.8 A5.2 5.2 0 0 1 11.5 4.4 Z" transform="rotate(120 7 7)" />
              <path d="M7 7 L7 1.8 A5.2 5.2 0 0 1 11.5 4.4 Z" transform="rotate(240 7 7)" />
              <circle cx="7" cy="7" r="1.4" />
            </g>
          </marker>

          {/* Containment — sealed end-cap ‖ */}
          <marker id="nxArrowSeal" markerWidth="7" markerHeight="12" refX="5.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <rect x="0.5" y="1" width="2" height="10" fill="var(--nx-core)" opacity="0.55" />
            <rect x="4"   y="0" width="2.5" height="12" fill="var(--nx-core)" />
          </marker>
        </defs>

        {connectors.map(conn => {
          const from = cardMap.get(conn.fromId)
          const to   = cardMap.get(conn.toId)
          if (!from || !to) return null

          const def = STYLES[conn.style ?? 'beam']

          // ── Geometry ──────────────────────────────────────────
          // Real, measured heights. Falls back to the old estimate for
          // the single frame before the ResizeObserver reports in.
          const fromH = cardHeights.get(from.id) ?? DEFAULT_CARD_H
          const toH   = cardHeights.get(to.id)   ?? DEFAULT_CARD_H

          const srcC = { x: from.x + from.width / 2, y: from.y + fromH / 2 }
          const tgtC = { x: to.x   + to.width   / 2, y: to.y   + toH   / 2 }

          // Direction target→source. Feeding it to rectEdgePoint gives the
          // point on the target's border that faces the source — the side
          // the arrow comes in from, computed fresh every frame so it
          // tracks continuously instead of snapping.
          const bx = srcC.x - tgtC.x
          const by = srcC.y - tgtC.y
          if (bx === 0 && by === 0) return null

          const tgtW = rectEdgePoint(tgtC.x, tgtC.y, to.width / 2, toH / 2, bx, by)

          // Tail stays at the source CENTER — under the card, which paints
          // over it — so the line has no visible base.
          const src  = worldToScreen(srcC.x, srcC.y, camera)
          const edge = worldToScreen(tgtW.x, tgtW.y, camera)

          const vx  = edge.x - src.x
          const vy  = edge.y - src.y
          const len = Math.hypot(vx, vy)
          // Cards overlapping so hard there is no room to draw an arrow.
          if (len <= HEAD_GAP + 1) return null

          const tgt = {
            x: edge.x - (vx / len) * HEAD_GAP,
            y: edge.y - (vy / len) * HEAD_GAP,
          }

          // A straight segment makes the end tangent exactly the
          // source→target angle, so orient="auto" rotates the head through
          // all 360° smoothly as the cards move around each other.
          const d = `M ${src.x.toFixed(2)} ${src.y.toFixed(2)} L ${tgt.x.toFixed(2)} ${tgt.y.toFixed(2)}`

          const fast    = draggingCardId === conn.fromId || draggingCardId === conn.toId
          const animate = settings.animateArrows && !!def.dash && !!def.flow

          const lineWidth   = fast ? def.width + 0.75 : def.width
          const lineOpacity = fast ? 1 : def.opacity

          // Seamless loop: offset travels exactly --dash-cycle (a whole
          // number of dash periods) per iteration. Speed changes swap the
          // duration var on the SAME animation, so no restart snap.
          const flowVars = animate
            ? {
                '--dash-cycle': `${def.flow!.cycle}px`,
                '--dash-dur':   `${fast ? def.flow!.fast : def.flow!.slow}s`,
              } as React.CSSProperties
            : undefined

          return (
            <g key={conn.id} style={{ pointerEvents: 'auto' }}>
              {/* Fat invisible hit area — click opens the style menu */}
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth="14"
                style={{ cursor: 'pointer' }}
                onClick={e => openMenu(conn.id, conn.style ?? 'beam', e)}
              />

              {/* Containment outer wall */}
              {def.outer && (
                <path
                  d={d}
                  fill="none"
                  stroke={def.outer.stroke}
                  strokeWidth={def.outer.width}
                  strokeOpacity={def.outer.opacity}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Static halo under animated dashes — reads as the same
                  Cherenkov glow but costs nothing per frame, unlike a
                  drop-shadow blur re-rendered on every dash step. */}
              {animate && (
                <path
                  d={d}
                  fill="none"
                  stroke={def.glow}
                  strokeWidth={lineWidth + 4}
                  strokeOpacity={0.5}
                  strokeLinecap="round"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              <path
                d={d}
                fill="none"
                stroke={def.stroke}
                strokeWidth={lineWidth}
                strokeOpacity={lineOpacity}
                strokeDasharray={def.dash ?? ''}
                strokeLinecap={def.linecap ?? 'butt'}
                className={`${styles.conPath} ${animate ? styles.dashFlow : ''}`}
                markerEnd={`url(#${def.marker})`}
                style={{
                  pointerEvents: 'none',
                  // Cherenkov glow for non-animated styles — dropped while
                  // dragging so the browser never blurs a moving path.
                  filter: !animate && !fast ? `drop-shadow(0 0 4px ${def.glow})` : undefined,
                  ...flowVars,
                }}
              />
            </g>
          )
        })}
      </svg>

      {/* ── Connector popup — restyle or sever ── */}
      {menu && (
        <>
          <div className={styles.menuOverlay} onMouseDown={() => setMenu(null)} />
          <div
            className={styles.menu}
            style={{ left: Math.max(8, menu.x), top: Math.max(8, menu.y) }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className={styles.menuTitle}>⚛ LINK TYPE</div>
            {STYLE_ORDER.map(key => {
              const def = STYLES[key]
              return (
                <button
                  key={key}
                  className={`${styles.menuItem} ${menu.style === key ? styles.menuItemActive : ''}`}
                  onClick={() => pickStyle(key)}
                  title={def.hint}
                >
                  <StylePreview def={def} />
                  <span>{def.name}</span>
                </button>
              )
            })}
            <button className={styles.menuSever} onClick={sever}>
              ☢ Sever Link
            </button>
          </div>
        </>
      )}
    </>
  )
}
