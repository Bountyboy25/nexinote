import { useEffect } from 'react'
import { useCanvasStore } from '@/store'
import { clampZoom } from '@/utils/canvas'
import { CANCEL_DRAG_EVENT } from './useCardDrag'

// ─────────────────────────────────────────────────────────────
// CUSTOM HOOK: useCanvasTouch
//
// The touch counterpart to useCanvasPan (space/middle-drag) and
// useCanvasZoom (wheel). Neither of those can work on a phone: there is
// no space bar, no middle button and no wheel, so without this the
// canvas is a fixed window you cannot move.
//
//   one finger on empty canvas  → pan
//   two fingers, anywhere       → pinch to zoom, and pan by the
//                                 midpoint so the gesture also drags
//
// ── Why native touch events, not pointer events ──────────────
// Pointer events are per-pointer; reconstructing a pinch from them means
// keeping a map of live pointers and pairing them up. TouchEvent hands
// over `touches` as a set, which is precisely what a pinch needs. Card
// dragging uses pointer events (one pointer, mouse and touch alike) —
// each gesture uses the API that fits it.
//
// ── Interaction with card drags ──────────────────────────────
// A one-finger press that lands on a card belongs to that card, so pan
// ignores it. A pinch always wins, even starting on a card: zooming
// while your fingers happen to be over a card is normal.
//
// Handing the card back is explicit. Because cards set touch-action:
// none, the browser does NOT fire its own pointercancel when the second
// finger arrives — so a drag already in flight would keep tracking
// finger one for the whole pinch and fling the card. startPinch
// broadcasts CANCEL_DRAG_EVENT instead, which useCardDrag treats as a
// release.
//
// Every handler is registered { passive: false } so preventDefault()
// works — otherwise the browser scrolls and rubber-bands the page
// underneath the canvas.
// ─────────────────────────────────────────────────────────────

type Mode = 'none' | 'pan' | 'pinch'

function distance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function midpoint(a: Touch, b: Touch): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

export function useCanvasTouch(canvasRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    let mode: Mode = 'none'
    let lastX = 0
    let lastY = 0
    let lastDist = 0

    const startPan = (t: Touch) => {
      mode = 'pan'
      lastX = t.clientX
      lastY = t.clientY
    }

    const startPinch = (a: Touch, b: Touch) => {
      // The first finger may already have a card in hand. A pinch is a
      // zoom, not a drag, so let go of it before taking over.
      window.dispatchEvent(new Event(CANCEL_DRAG_EVENT))
      mode = 'pinch'
      lastDist = distance(a, b)
      const m = midpoint(a, b)
      lastX = m.x
      lastY = m.y
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        startPinch(e.touches[0], e.touches[1])
        e.preventDefault()
        return
      }
      // A single finger on a card is that card's business.
      const onCard = (e.target as HTMLElement).closest?.('[data-card]')
      if (e.touches.length === 1 && !onCard) {
        startPan(e.touches[0])
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (mode === 'pinch' && e.touches.length >= 2) {
        const a = e.touches[0]
        const b = e.touches[1]
        const dist = distance(a, b)
        const m = midpoint(a, b)

        // Guard against the degenerate first frame where both touches
        // report the same point — dividing by it would send zoom to
        // Infinity and lose the board off-screen.
        if (lastDist > 0 && dist > 0) {
          const state = useCanvasStore.getState()
          const next = clampZoom(state.camera.zoom * (dist / lastDist))

          // Zoom about the midpoint, then translate by how far the
          // midpoint itself moved, so a two-finger drag pans as well.
          const dx = m.x - lastX
          const dy = m.y - lastY
          state.zoomTo(next, m.x, m.y)
          useCanvasStore.setState(s => ({
            camera: { ...s.camera, x: s.camera.x + dx, y: s.camera.y + dy },
          }))
        }

        lastDist = dist
        lastX = m.x
        lastY = m.y
        e.preventDefault()
        return
      }

      if (mode === 'pan' && e.touches.length === 1) {
        const t = e.touches[0]
        const dx = t.clientX - lastX
        const dy = t.clientY - lastY
        lastX = t.clientX
        lastY = t.clientY
        useCanvasStore.setState(s => ({
          camera: { ...s.camera, x: s.camera.x + dx, y: s.camera.y + dy },
        }))
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        mode = 'none'
        return
      }
      // Lifting one finger out of a pinch shouldn't end the gesture —
      // hand the remaining finger to pan, re-seeded from where it is now
      // so the canvas doesn't jump by the midpoint offset.
      if (e.touches.length === 1) {
        startPan(e.touches[0])
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [canvasRef])
}
