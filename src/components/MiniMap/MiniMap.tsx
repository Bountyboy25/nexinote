import { useEffect, useRef, useState } from 'react'
import { useCards, useCamera } from '@/store'
import styles from './MiniMap.module.css'

// ─────────────────────────────────────────────────────────────
// MINIMAP — A bird's-eye view of the entire canvas
//
// Uses the HTML5 Canvas 2D API (not our infinite canvas div!)
// to draw a scaled-down overview of all card positions.
//
// Key concept: useEffect with dependencies
// React re-runs the effect whenever [cards, camera] change.
// Inside the effect we redraw the minimap canvas.
//
// This is the right pattern for "imperative" operations
// (like drawing on a canvas) that need to sync with React state.
// ─────────────────────────────────────────────────────────────

const W = 140  // Minimap display width
const H = 90   // Minimap display height
const PAD = 8

/* Nuclear Nexus (spec §7 Minimap): blips are core-soft rects with core
   borders; the viewport rectangle strokes in core-hot. Canvas 2D can't
   resolve var(--nx-*), so we read the computed values at draw time. */
function nxToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function MiniMap() {
  const cards  = useCards()
  const camera = useCamera()
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  // Redraw whenever cards, camera, or theme changes. Pan/zoom fires this
  // on every mousemove, so the draw is coalesced into one rAF per frame
  // instead of running back-to-back for intermediate camera values.
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

      // Draw each card as a core-soft blip with a core border
      cards.forEach(card => {
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
    }

    const raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [cards, camera, themeTick])  // Re-run when cards, camera, or theme changes

  return (
    <div className={styles.minimap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
