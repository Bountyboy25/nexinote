import { useCallback, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import type { SketchCard, SketchStroke } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// SKETCH CARD — freehand drawing surface
//
// Strokes are vectors (see SketchCard in types), rendered as SVG
// paths, so a sketch stays crisp at 400% zoom and costs a fraction
// of the storage a rasterized canvas would.
//
// Two things matter for it to feel right:
//
//   1. The in-progress stroke lives in LOCAL state and is only
//      committed to the store on pointerup. Writing every sampled
//      point to the store would re-render (and re-persist) the whole
//      board dozens of times per second.
//   2. Pointer positions are screen-space; the canvas scales the
//      world by camera.zoom, so deltas are divided by the live zoom
//      to get card-local coordinates. Without that, drawing at 200%
//      zoom would put the ink at half speed under the cursor.
// ─────────────────────────────────────────────────────────────

// Theme vars, not hex — the ink re-colors with the reactor core when
// the theme swaps, exactly like every other surface in the app.
const PENS = [
  { id: 'core',   value: 'var(--nx-core)' },
  { id: 'hot',    value: 'var(--nx-core-hot)' },
  { id: 'hazard', value: 'var(--nx-hazard)' },
  { id: 'danger', value: 'var(--nx-danger)' },
  { id: 'ink',    value: 'var(--nx-ink)' },
  { id: 'dim',    value: 'var(--nx-ink-dim)' },
]

const WIDTHS = [2, 4, 8]

// Skip samples closer than this (card-local px) — raw pointer streams
// are noisy and every kept point is bytes in localStorage.
const MIN_SAMPLE_DIST = 1.6

const MIN_HEIGHT = 120
const MAX_HEIGHT = 900

// Chaikin-style smoothing: run a quadratic through each sampled point,
// ending at the midpoint to the next one. Cheap, and it turns a jagged
// polyline into something that reads as a pen stroke.
function strokePath(pts: number[]): string {
  if (pts.length < 4) {
    // Single tap — emit a degenerate segment so round linecaps draw a dot.
    return `M ${pts[0]} ${pts[1]} l 0.01 0`
  }
  let d = `M ${pts[0]} ${pts[1]}`
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2
    const my = (pts[i + 1] + pts[i + 3]) / 2
    d += ` Q ${pts[i]} ${pts[i + 1]} ${mx} ${my}`
  }
  return `${d} L ${pts[pts.length - 2]} ${pts[pts.length - 1]}`
}

interface Props { card: SketchCard }

export function SketchCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)

  const [pen, setPen]       = useState(PENS[0].value)
  const [width, setWidth]   = useState(WIDTHS[1])
  const [erasing, setErasing] = useState(false)
  const [live, setLive]     = useState<number[] | null>(null)

  const svgRef   = useRef<SVGSVGElement>(null)
  const livePts  = useRef<number[]>([])
  const erasingDown = useRef(false)

  const { strokes, height } = card.content

  const setStrokes = useCallback((next: SketchStroke[]) => {
    updateCard(card.id, { content: { ...card.content, strokes: next } })
  }, [card.id, card.content, updateCard])

  // Screen point → card-local point. getBoundingClientRect() gives the
  // SCALED box, so the offset within it must be un-scaled by the same
  // zoom the canvas applies to the world.
  const toLocal = (e: React.PointerEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect()
    const { zoom } = useCanvasStore.getState().camera
    return [(e.clientX - rect.left) / zoom, (e.clientY - rect.top) / zoom]
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // Never let a drawing gesture also drag the card.
    e.stopPropagation()
    if (e.button !== 0) return

    if (erasing) {
      erasingDown.current = true
      return
    }

    const [x, y] = toLocal(e)
    livePts.current = [x, y]
    setLive([x, y])
    svgRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (erasing || livePts.current.length === 0) return
    const [x, y] = toLocal(e)
    const pts = livePts.current
    const dx = x - pts[pts.length - 2]
    const dy = y - pts[pts.length - 1]
    if (Math.hypot(dx, dy) < MIN_SAMPLE_DIST) return
    pts.push(x, y)
    setLive([...pts])
  }

  const finishStroke = (e: React.PointerEvent) => {
    erasingDown.current = false
    if (livePts.current.length === 0) return
    svgRef.current?.releasePointerCapture?.(e.pointerId)

    const points = livePts.current
    livePts.current = []
    setLive(null)
    setStrokes([...strokes, { id: nanoid(), color: pen, width, points }])
  }

  const eraseStroke = (id: string) => setStrokes(strokes.filter(s => s.id !== id))

  const undo  = () => setStrokes(strokes.slice(0, -1))
  const clear = () => setStrokes([])

  // ── Bottom edge drag → taller/shorter drawing surface ──
  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (card.locked) return
    const startY = e.clientY
    const startH = height
    const { zoom } = useCanvasStore.getState().camera

    const move = (ev: PointerEvent) => {
      const next = Math.round(
        Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + (ev.clientY - startY) / zoom))
      )
      updateCard(card.id, { content: { ...card.content, height: next } })
    }
    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  return (
    <div className={styles.sketch} onMouseDown={e => e.stopPropagation()}>
      {/* ── Pen tray ── */}
      <div className={styles.sketchTools}>
        <div className={styles.sketchPens}>
          {PENS.map(p => (
            <button
              key={p.id}
              className={`${styles.sketchPen} ${!erasing && pen === p.value ? styles.sketchPenOn : ''}`}
              style={{ background: p.value }}
              onClick={() => { setPen(p.value); setErasing(false) }}
              title={`Pen — ${p.id}`}
              aria-label={`Pen ${p.id}`}
            />
          ))}
        </div>

        <div className={styles.sketchWidths}>
          {WIDTHS.map(w => (
            <button
              key={w}
              className={`${styles.sketchWidth} ${!erasing && width === w ? styles.sketchWidthOn : ''}`}
              onClick={() => { setWidth(w); setErasing(false) }}
              title={`${w}px nib`}
              aria-label={`${w} pixel nib`}
            >
              <span style={{ width: w + 4, height: w + 4 }} />
            </button>
          ))}
        </div>

        <div className={styles.sketchActions}>
          <button
            className={`${styles.sketchBtn} ${erasing ? styles.sketchBtnOn : ''}`}
            onClick={() => setErasing(v => !v)}
            title="Eraser — click a stroke to remove it"
            aria-label="Eraser"
          ><Icon name="eraser" size={13} /></button>
          <button
            className={styles.sketchBtn}
            onClick={undo}
            disabled={strokes.length === 0}
            title="Undo last stroke"
            aria-label="Undo"
          ><Icon name="undo" size={13} /></button>
          <button
            className={styles.sketchBtn}
            onClick={clear}
            disabled={strokes.length === 0}
            title="Clear sketch"
            aria-label="Clear"
          ><Icon name="trash" size={13} /></button>
        </div>
      </div>

      {/* ── Drawing surface ── */}
      <svg
        ref={svgRef}
        className={`${styles.sketchSurface} ${erasing ? styles.sketchErasing : ''}`}
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      >
        {strokes.map(s => (
          <path
            key={s.id}
            d={strokePath(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Only the eraser needs hit-testing; while drawing, strokes
            // must not swallow the pointer stream.
            style={{ pointerEvents: erasing ? 'stroke' : 'none' }}
            onPointerDown={() => erasing && eraseStroke(s.id)}
            onPointerEnter={() => erasing && erasingDown.current && eraseStroke(s.id)}
          />
        ))}

        {live && (
          <path
            d={strokePath(live)}
            fill="none"
            stroke={pen}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {strokes.length === 0 && !live && (
        <span className={styles.sketchHint}>Draw here</span>
      )}

      {/* Height grip — hidden while the card is pinned */}
      {!card.locked && (
        <div
          className={styles.sketchResize}
          onPointerDown={onResizeDown}
          title="Drag to resize"
        />
      )}
    </div>
  )
}
