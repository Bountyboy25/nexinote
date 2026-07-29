import { useCallback, useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store'
import { clampCardToWorld } from '@/utils/canvas'
import type { Card } from '@/types'

// ─────────────────────────────────────────────────────────────
// CUSTOM HOOK: useCardDrag
//
// Handles dragging an individual card around the canvas.
//
// ── Coordinate conversion ────────────────────────────────────
// Card positions are in WORLD space, but the mouse moves in SCREEN
// space, so every delta is divided by zoom:
//
//   At 200% zoom, dragging 100px must move the card 50 world px,
//   which reads as 100px on screen. Without the division the card
//   moves 100 world px and visibly overshoots the cursor.
//
// ── Grab anywhere: press-and-hold ────────────────────────────
// Most of a card's surface belongs to something that wants the click
// for itself — the title input, a note's contentEditable body, table
// cells, a map. Aiming at a card and missing the few pixels of chrome
// used to drop you into editing instead of moving the card.
//
// So there are two ways in, and the hook exposes a handler for each:
//
//   onMouseDown        (bubble)  — plain card surface. Drags at once,
//                                  exactly as it always has.
//   onMouseDownCapture (capture) — arms a press-and-hold. Capture
//                                  phase is essential: sixteen content
//                                  components call stopPropagation() on
//                                  mousedown to protect their editors,
//                                  so a bubble-phase listener on the
//                                  card root never sees those presses.
//
// The capture handler never calls preventDefault or stopPropagation, so
// it is purely additive — a short click still focuses and places a caret
// exactly as before. Only holding still for HOLD_MS converts the press
// into a drag. Moving more than HOLD_SLOP first cancels it, which is
// what keeps click-and-drag text selection inside an input working.
//
// ── Bounds ───────────────────────────────────────────────────
// Positions are clamped to WORLD_BOUNDS so a fast drag can't fling a
// card into empty space where it is effectively lost.
// ─────────────────────────────────────────────────────────────

interface DragState {
  active: boolean
  startMouseX: number
  startMouseY: number
  startCardX: number
  startCardY: number
  cardH: number      // measured once at drag start, for bounds clamping
}

// Native tags that own a plain click. A press-and-hold on these still
// starts a drag — see HOLD_MS.
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

// Controls, not content. Holding one is far more likely to be hesitation
// than an attempt to drag, and hijacking it would make buttons feel
// unreliable — so these never arm the hold.
const CONTROL_TAGS = new Set(['BUTTON', 'A'])

// Opt-out marker for elements that run their own drag gesture (resize
// grips, the column row grip). Two drags competing for one pointer would
// fight each other.
const NO_DRAG_ATTR = 'data-no-card-drag'

// How long to hold before a press over content becomes a drag. Long
// enough not to fire on a normal click, short enough not to feel like
// waiting.
const HOLD_MS = 220

// Movement (screen px) that cancels a pending hold. Below this the press
// counts as stationary — fingers and mice both jitter. Above it, the
// gesture is a text selection, not a grab.
const HOLD_SLOP = 5

// Fallback height if the card element can't be measured.
const DEFAULT_CARD_H = 160

// A column accepts every card type EXCEPT another column — nesting
// containers has no sensible layout and no obvious way back out.
function isAbsorbable(type: Card['type']): boolean {
  return type !== 'column'
}

// Which column card (if any) is under the pointer right now?
// Screen-space hit-test against the columns' rendered DOM rects — this
// respects each column's real height (they grow with their items).
function columnUnderPointer(clientX: number, clientY: number, draggedId: string): string | null {
  const { cards } = useCanvasStore.getState()
  for (const c of cards) {
    if (c.type !== 'column' || c.id === draggedId) continue
    const el = document.querySelector(`[data-card="${c.id}"]`)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return c.id
    }
  }
  return null
}

function cardElement(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-card="${id}"]`)
}

export function useCardDrag(card: Card) {
  // Keep a ref to the card so listeners always see the latest position
  // without forcing a fresh useCallback every time x/y change. Refs are
  // stable across renders, so the handlers are stable too.
  const cardRef = useRef(card)
  cardRef.current = card

  const drag = useRef<DragState>({
    active: false,
    startMouseX: 0,
    startMouseY: 0,
    startCardX: 0,
    startCardY: 0,
    cardH: DEFAULT_CARD_H,
  })

  // Teardown for whatever is currently attached: a pending hold, or a
  // live drag. Held in refs so unmount can clean up either one.
  const cancelHoldRef = useRef<(() => void) | null>(null)
  const endDragRef    = useRef<(() => void) | null>(null)

  // A card can unmount mid-gesture — dropped into a column, deleted by a
  // shortcut, or the board closed. Leaving a timer or document listeners
  // behind would keep moving a card that no longer exists.
  useEffect(() => () => {
    cancelHoldRef.current?.()
    endDragRef.current?.()
  }, [])

  // ── The drag itself, entered from either path ──
  const beginDrag = useCallback((clientX: number, clientY: number, additive: boolean) => {
    const store = useCanvasStore.getState()
    const { id } = cardRef.current

    if (!additive) store.deselectAll()
    store.selectCard(id, additive)

    // Locked cards still select, focus and edit — they just don't move.
    // Selecting first matters: a lock that also swallowed clicks would
    // read as a broken card rather than a pinned one.
    if (cardRef.current.locked) return

    drag.current = {
      active: true,
      startMouseX: clientX,
      startMouseY: clientY,
      startCardX: cardRef.current.x,
      startCardY: cardRef.current.y,
      cardH: cardElement(id)?.offsetHeight || DEFAULT_CARD_H,
    }

    // Signal drag start so ConnectorLayer speeds up its animation and the
    // minimap highlights this card.
    store.setDraggingCard(id)

    // Suppresses text selection and forces the grabbing cursor for the
    // whole gesture. A drag can now begin on top of an input, which would
    // otherwise smear a selection across the card as the pointer moves.
    document.body.classList.add('nx-dragging')

    const onMouseMove = (ev: MouseEvent) => {
      const d = drag.current
      if (!d.active) return

      // Read zoom freshly — it can change mid-drag if a wheel event fires.
      const s = useCanvasStore.getState()
      const { zoom } = s.camera

      // Screen delta → world delta
      const dx = (ev.clientX - d.startMouseX) / zoom
      const dy = (ev.clientY - d.startMouseY) / zoom

      s.updateCard(cardRef.current.id, clampCardToWorld(
        d.startCardX + dx,
        d.startCardY + dy,
        cardRef.current.width,
        d.cardH,
      ))

      // Track the column under the pointer so it can light up as a drop
      // target. setDropColumn only writes when the value changes.
      if (isAbsorbable(cardRef.current.type)) {
        s.setDropColumn(columnUnderPointer(ev.clientX, ev.clientY, cardRef.current.id))
      }
    }

    const detach = () => {
      endDragRef.current = null
      drag.current.active = false
      document.body.classList.remove('nx-dragging')
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', finish)
      window.removeEventListener('blur', finish)
    }

    function finish() {
      const s = useCanvasStore.getState()
      s.setDraggingCard(null)

      // Released over a column → the column swallows this card
      const targetColumn = s.dropColumnId
      if (targetColumn && isAbsorbable(cardRef.current.type)) {
        s.absorbCardIntoColumn(cardRef.current.id, targetColumn)
      }
      s.setDropColumn(null)
      detach()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', finish)
    // If focus leaves the window mid-drag, the mouseup can land somewhere
    // we never hear about and the card would keep following the cursor on
    // return. Treat losing focus as a release.
    window.addEventListener('blur', finish)
    endDragRef.current = detach
  }, [])

  // ── Path 1 (bubble): plain card surface → drag immediately ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    // Reaching the root means no content component claimed this press,
    // so there is nothing to wait for.
    cancelHoldRef.current?.()
    e.stopPropagation() // Don't let the click bubble to the canvas
    beginDrag(e.clientX, e.clientY, e.shiftKey)
  }, [beginDrag])

  // ── Path 2 (capture): anywhere on the card → hold to drag ──
  const onMouseDownCapture = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (drag.current.active) return

    const target = e.target as HTMLElement
    if (CONTROL_TAGS.has(target.tagName)) return
    if (target.closest(`[${NO_DRAG_ATTR}]`)) return
    if (target.closest('button, a')) return

    // Only content needs the hold. Anything else reaches the bubble
    // handler above and drags immediately.
    const isContent =
      INTERACTIVE_TAGS.has(target.tagName) ||
      target.isContentEditable ||
      !!target.closest('[contenteditable="true"]')
    if (!isContent) return

    const downX = e.clientX
    const downY = e.clientY
    const additive = e.shiftKey
    let lastX = downX
    let lastY = downY
    let timer: ReturnType<typeof setTimeout> | null = null

    const cancel = () => {
      cancelHoldRef.current = null
      if (timer) { clearTimeout(timer); timer = null }
      document.removeEventListener('mousemove', track)
      document.removeEventListener('mouseup', cancel)
    }

    function track(ev: MouseEvent) {
      lastX = ev.clientX
      lastY = ev.clientY
      // Moved before the hold matured → this is a text selection.
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > HOLD_SLOP) cancel()
    }

    timer = setTimeout(() => {
      cancel()
      // Hand the press over to the drag: drop the caret the browser just
      // placed and clear any selection, so the card moves instead of
      // smearing a highlight across its text.
      ;(document.activeElement as HTMLElement | null)?.blur()
      window.getSelection()?.removeAllRanges()
      // Start from where the pointer is NOW so the card doesn't jump by
      // the accumulated slop.
      beginDrag(lastX, lastY, additive)
    }, HOLD_MS)

    document.addEventListener('mousemove', track)
    document.addEventListener('mouseup', cancel)
    cancelHoldRef.current = cancel
  }, [beginDrag])

  return { onMouseDown, onMouseDownCapture }
}
