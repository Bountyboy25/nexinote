import { useEffect, useRef } from 'react'
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

const CARD_COLORS: Record<string, string> = {
  note:  '#7c6af5',
  task:  '#4dd9ac',
  table: '#f59e0b',
  media: '#fb923c',  // was 'image' — never matched the 'media' card type
  link:  '#3b82f6',
}

export function MiniMap() {
  const cards  = useCards()
  const camera = useCamera()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Redraw whenever cards or camera changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Scale for retina/HiDPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = '#1a1a1f'
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

    // Draw each card as a small colored rectangle
    cards.forEach(card => {
      ctx.fillStyle = CARD_COLORS[card.type] || '#7c6af5'
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      // roundRect draws a rectangle with rounded corners
      ctx.roundRect(
        card.x * scale + offX,
        card.y * scale + offY,
        Math.max(card.width * scale, 4),
        Math.max(CARD_HEIGHT_ESTIMATE * scale, 3),
        2
      )
      ctx.fill()
    })

    // Draw the viewport indicator (where the user is currently looking)
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1

    // The viewport in world space starts at (-camera.x / zoom, -camera.y / zoom)
    // and has size (screenW / zoom, screenH / zoom)
    const vpX = (-camera.x / camera.zoom) * scale + offX
    const vpY = (-camera.y / camera.zoom) * scale + offY
    const vpW = (window.innerWidth  / camera.zoom) * scale
    const vpH = (window.innerHeight / camera.zoom) * scale

    ctx.strokeRect(vpX, vpY, vpW, vpH)

  }, [cards, camera])  // Re-run when cards or camera changes

  return (
    <div className={styles.minimap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
