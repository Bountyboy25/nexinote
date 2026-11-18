import { useEffect, useRef, useState } from 'react'
import { useCards, useCamera, useDraggingCardId } from '@/store'
import styles from './MiniMap.module.css'

// ─────────────────────────────────────────────────────────────
// MINIMAP — A bird's-eye view of the entire canvas
//
// Uses the HTML5 Canvas 2D API (not our infinite canvas div!)
// to draw a scaled-down overview of all card positions.
//
// Two behaviours beyond plain drawing:
//
//   • The card being dragged is drawn hot and filled, with a halo, so
//     you can see where it is heading even when it is far outside the
//     viewport rectangle.
//   • The whole minimap fades out after IDLE_MS without a drag, and
//     returns the moment one starts. It sits over the canvas, and a
//     permanent overlay you have stopped consulting is just clutter.
//     Hovering it also counts as activity, so it never fades while
//     being read.
// ─────────────────────────────────────────────────────────────

const W = 140  // Minimap display width
const H = 90   // Minimap display height
const PAD = 8

const IDLE_MS = 30_000

/* Nuclear Nexus (spec §7 Minimap): blips are core-soft rects with core
   borders; the viewport rectangle strokes in core-hot. Canvas 2D can't
   resolve var(--nx-*), so we read the computed values at draw time. */
function nxToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function MiniMap() {
  const cards          = useCards()
  const camera         = useCamera()
  const draggingCardId = useDraggingCardId()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Bump a counter when the theme core swaps so the canvas redraws
  const [themeTick, setThemeTick] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick(t => t + 1))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-nx-theme', 'style'],
    })
    return () => observer.disconnect()
  }, [])

  // ── Idle fade ──
  // Restart the countdown on every drag. The timer is deliberately keyed
  // on dragging rather than on `cards` — card content changes constantly
  // while typing, and a minimap that never fades while you write a note
  // defeats the point.
  useEffect(() => {
    const wake = () => {
      setIdle(false)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS)
    }
    wake()
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current) }
  }, [draggingCardId])

  // Keep it awake while the pointer is on it — you're clearly using it.
  const onEnter = () => {
    setIdle(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
  }
  const onLeave = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS)
  }

  // Redraw whenever cards, camera, drag target, or theme changes. Pan/zoom
  // fires this on every mousemove, so the draw is coalesced into one rAF
  // per frame instead of running back-to-back for intermediate values.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      // Scale for retina/HiDPI displays — only touch the bitmap when the
      // size actually changed (resizing clears + reallocates the canvas).
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width  = W * dpr
        canvas.height = H * dpr
        canvas.style.width  = W + 'px'
        canvas.style.height = H + 'px'
      }

      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const core    = nxToken('--nx-core')
      const coreHot = nxToken('--nx-core-hot')
      const hazard  = nxToken('--nx-hazard')

      // Background — inset panel surface
      ctx.fillStyle = nxToken('--nx-bg-panel')
      ctx.fillRect(0, 0, W, H)

      if (cards.length === 0) return

      // Find bounding box of all cards. We do this in one pass instead of
      // four Math.min/max(...spread) calls — those allocate intermediate
      // arrays and risk a stack overflow when there are tens of thousands
      // of cards (spread args become individual function arguments).
      const CARD_HEIGHT_ESTIMATE = 140
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const c of cards) {
        if (c.x < minX) minX = c.x
        if (c.y < minY) minY = c.y
        const right  = c.x + c.width
        const bottom = c.y + CARD_HEIGHT_ESTIMATE
        if (right  > maxX) maxX = right
        if (bottom > maxY) maxY = bottom
      }

      const contentW = maxX - minX || 1
      const contentH = maxY - minY || 1

      // Scale to fit all cards in minimap
      const scaleX = (W - PAD * 2) / contentW
      const scaleY = (H - PAD * 2) / contentH
      const scale  = Math.min(scaleX, scaleY)

      // Center the content in the minimap
      const offX = PAD + (W - PAD * 2 - contentW * scale) / 2 - minX * scale
      const offY = PAD + (H - PAD * 2 - contentH * scale) / 2 - minY * scale

      // Draw each card as a core-soft blip with a core border. The
      // dragged one is drawn last (below) so nothing can cover it.
      cards.forEach(card => {
        if (card.id === draggingCardId) return
        ctx.beginPath()
        // roundRect draws a rectangle with rounded corners
        ctx.roundRect(
          card.x * scale + offX,
          card.y * scale + offY,
          Math.max(card.width * scale, 4),
          Math.max(CARD_HEIGHT_ESTIMATE * scale, 3),
          2
        )
        ctx.globalAlpha = 0.14
        ctx.fillStyle = core
        ctx.fill()
        ctx.globalAlpha = 0.7
        ctx.strokeStyle = core
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // Draw the viewport indicator (where the user is currently looking)
      ctx.globalAlpha = 1
      ctx.strokeStyle = coreHot
      ctx.lineWidth = 1

      // The viewport in world space starts at (-camera.x / zoom, -camera.y / zoom)
      // and has size (screenW / zoom, screenH / zoom)
      const vpX = (-camera.x / camera.zoom) * scale + offX
      const vpY = (-camera.y / camera.zoom) * scale + offY
      const vpW = (window.innerWidth  / camera.zoom) * scale
      const vpH = (window.innerHeight / camera.zoom) * scale

      ctx.strokeRect(vpX, vpY, vpW, vpH)

      // ── The dragged card, on top of everything ──
      // Solid hazard fill plus a glow: at 140×90 a blip can be 4px wide,
      // so a border-only highlight would be invisible against the others.
      const dragged = draggingCardId
        ? cards.find(c => c.id === draggingCardId)
        : undefined
      if (!dragged) return

      const dx = dragged.x * scale + offX
      const dy = dragged.y * scale + offY
      const dw = Math.max(dragged.width * scale, 4)
      const dh = Math.max(CARD_HEIGHT_ESTIMATE * scale, 3)

      ctx.globalAlpha = 1
      ctx.shadowColor = hazard
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.roundRect(dx, dy, dw, dh, 2)
      ctx.fillStyle = hazard
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.strokeStyle = hazard
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    const raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [cards, camera, draggingCardId, themeTick])

  return (
    <div
      className={`${styles.minimap} ${idle ? styles.idle : ''}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
