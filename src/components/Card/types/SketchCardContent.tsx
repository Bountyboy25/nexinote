import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import type { SketchCard, SketchStroke } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// SKETCH CARD — freehand drawing surface
//
// Strokes are vectors (see SketchCard in types), rendered as SVG
// paths, so a sketch stays crisp at any magnification and costs a
// fraction of the storage a rasterized canvas would.
//
// Three things matter for it to feel right:
//
//   1. The in-progress stroke lives in LOCAL state and is only
//      committed to the store on pointerup. Writing every sampled
//      point to the store would re-render (and re-persist) the whole
//      board dozens of times per second.
//   2. Pointer positions are screen-space, but strokes are stored in
//      the card's own coordinate space. The conversion divides by
//      whatever scale currently sits between the two — see toLocal().
//   3. FOCUS MODE magnifies the same surface rather than giving it a
//      bigger coordinate space. Scaling the view means existing
//      strokes stay exactly where they were and nothing has to be
//      remapped when you leave — you're zooming a drawing, not
//      resizing a canvas.
// ─────────────────────────────────────────────────────────────

// Preset pens are theme vars, not hex, so the ink re-colors with the
// reactor core when the theme swaps. The picker beside them stores a
// literal hex for when a specific color is wanted instead.
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

// Focus mode leaves a margin so the board stays visible behind it —
// it's a magnifier, not a separate application mode.
const FOCUS_VIEWPORT_FRACTION = 0.86

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

  const [pen, setPen]         = useState(PENS[0].value)
  const [customPen, setCustomPen] = useState('#ffffff')
  const [width, setWidth]     = useState(WIDTHS[1])
  const [erasing, setErasing] = useState(false)
  const [live, setLive]       = useState<number[] | null>(null)
  const [focus, setFocus]     = useState(false)
  const [focusScale, setFocusScale] = useState(1)
  // The surface's true layout width, captured before handing it to the
  // overlay. Strokes were drawn against the card BODY's width (card.width
  // minus borders), so reusing card.width in focus mode would shift every
  // stroke a couple of pixels.
  const [logicalW, setLogicalW] = useState(card.width)

  const surfaceRef  = useRef<HTMLDivElement>(null)
  const livePts     = useRef<number[]>([])
  const erasingDown = useRef(false)

  const { strokes, height } = card.content

  const setStrokes = useCallback((next: SketchStroke[]) => {
    updateCard(card.id, { content: { ...card.content, strokes: next } })
  }, [card.id, card.content, updateCard])

  // How much magnification fits the sketch on screen with a margin.
  // Recomputed on resize so focus mode survives a window change.
  useEffect(() => {
    if (!focus) return
    const fit = () => {
      const k = Math.min(
        (window.innerWidth  * FOCUS_VIEWPORT_FRACTION) / logicalW,
        // Leave room for the panel's header and pen tray.
        (window.innerHeight * FOCUS_VIEWPORT_FRACTION - 110) / height,
      )
      // Never shrink below 1 — focus mode should only ever help.
      setFocusScale(Math.max(1, k))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [focus, logicalW, height])

  // Escape leaves focus mode, matching every other overlay in the app.
  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setFocus(false) }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [focus])

  // Screen point → card-local point.
  //
  // The wrapper is measured two ways: getBoundingClientRect() gives its
  // SCALED size on screen, offsetWidth its unscaled layout size. Their
  // ratio is the total scale between the two spaces, whatever produced
  // it — the canvas camera zoom on the board, or the focus magnifier in
  // the overlay. That keeps one formula correct in both places.
  const toLocal = (e: React.PointerEvent): [number, number] => {
    const el = surfaceRef.current!
    const rect = el.getBoundingClientRect()
    const scale = rect.width / (el.offsetWidth || 1) || 1
    return [(e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale]
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
    surfaceRef.current?.setPointerCapture(e.pointerId)
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
    surfaceRef.current?.releasePointerCapture?.(e.pointerId)

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

  // ── Pen tray ──
  // Rendered once and placed in whichever shell is active, so the tools
  // behave identically on the card and in focus mode.
  const tools = (
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

        {/* Any color at all. The visible swatch is the label; the native
            input sits transparent on top of it so the OS picker (and its
            eyedropper) anchors to the right spot. */}
        <label
          className={`${styles.sketchPen} ${styles.sketchPenCustom} ${!erasing && pen === customPen ? styles.sketchPenOn : ''}`}
          style={{ background: customPen }}
          title="Pick any color"
        >
          <input
            type="color"
            className={styles.sketchPenInput}
            value={customPen}
            onChange={e => {
              setCustomPen(e.target.value)
              setPen(e.target.value)
              setErasing(false)
            }}
            onClick={() => { setPen(customPen); setErasing(false) }}
          />
        </label>
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
        <button
          className={`${styles.sketchBtn} ${focus ? styles.sketchBtnOn : ''}`}
          onClick={() => {
            // Measure before the surface moves into the overlay.
            if (!focus) setLogicalW(surfaceRef.current?.offsetWidth || card.width)
            setFocus(v => !v)
          }}
          title={focus ? 'Close focus view (Esc)' : 'Focus view — draw up close'}
          aria-label="Toggle focus view"
        ><Icon name={focus ? 'close' : 'reset-view'} size={13} /></button>
      </div>
    </div>
  )

  // ── Drawing surface ──
  // The wrapper carries the layout size; the SVG fills it. Only the
  // wrapper is transformed in focus mode, which is what keeps toLocal()
  // able to recover the scale from offsetWidth vs the client rect.
  const surface = (
    <div
      ref={surfaceRef}
      className={`${styles.sketchSurface} ${erasing ? styles.sketchErasing : ''}`}
      style={{ width: focus ? logicalW : undefined, height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    >
      <svg className={styles.sketchSvg}>
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
    </div>
  )

  return (
    <div className={styles.sketch} onMouseDown={e => e.stopPropagation()}>
      {!focus && tools}
      {!focus && surface}

      {/* Placeholder keeps the card from collapsing while its surface is
          on loan to the overlay. */}
      {focus && (
        <div className={styles.sketchAway} style={{ height }}>
          <Icon name="sketch" size={20} />
          <span>Editing in focus view</span>
        </div>
      )}

      {/* Height grip — hidden while the card is pinned */}
      {!card.locked && !focus && (
        <div
          className={styles.sketchResize}
          data-no-card-drag=""
          onPointerDown={onResizeDown}
          title="Drag to resize"
        />
      )}

      {/* Focus view. Portaled to <body> so it escapes the card's
          overflow:hidden AND the canvas world transform — otherwise it
          would be clipped and would inherit the board's zoom. */}
      {focus && createPortal(
        <div
          className={styles.sketchFocusBackdrop}
          onPointerDown={e => { if (e.target === e.currentTarget) setFocus(false) }}
        >
          <div className={styles.sketchFocusPanel} onPointerDown={e => e.stopPropagation()}>
            <div className={styles.sketchFocusHead}>
              <span className={styles.sketchFocusTitle}>{card.title || 'Sketch'}</span>
              <span className={styles.sketchFocusZoom}>{Math.round(focusScale * 100)}%</span>
            </div>

            {tools}

            <div className={styles.sketchFocusStage}>
              {/* Only this wrapper scales — see toLocal(). */}
              <div style={{
                transform: `scale(${focusScale})`,
                transformOrigin: 'center center',
              }}>
                {surface}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
