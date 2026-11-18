import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────
// CUSTOM HOOK: useCardHeights
//
// Card WIDTH is explicit state (card.width), but card HEIGHT is
// content-driven — a note with six lines is far taller than an empty
// one, and a column grows with every item dropped into it.
//
// Connector geometry needs the real height: an arrow pinned to a card's
// edge is only correct if we know where that edge actually is. The old
// code assumed a flat 160px for every card, which is why heads drifted
// off tall cards and floated below short ones.
//
// offsetHeight is LAYOUT height — it ignores the canvas zoom transform,
// so the value is already in world units and needs no /camera.zoom.
// ─────────────────────────────────────────────────────────────

export const DEFAULT_CARD_H = 160

export function useCardHeights(cardIds: string[]): Map<string, number> {
  const [heights, setHeights] = useState<Map<string, number>>(new Map())

  // Only re-attach observers when the SET of cards changes, not on every
  // render (the caller rebuilds the array each time).
  const key = cardIds.join('|')

  useEffect(() => {
    const els = new Map<string, HTMLElement>()
    for (const id of cardIds) {
      const el = document.querySelector<HTMLElement>(`[data-card="${id}"]`)
      if (el) els.set(id, el)
    }

    if (els.size === 0) {
      setHeights(prev => (prev.size === 0 ? prev : new Map()))
      return
    }

    const measure = () => {
      setHeights(prev => {
        const next = new Map<string, number>()
        let changed = prev.size !== els.size
        for (const [id, el] of els) {
          const h = el.offsetHeight || DEFAULT_CARD_H
          next.set(id, h)
          if (prev.get(id) !== h) changed = true
        }
        // Returning the same Map makes React bail out of the re-render.
        return changed ? next : prev
      })
    }

    const ro = new ResizeObserver(measure)
    for (const el of els.values()) ro.observe(el)
    measure()

    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return heights
}
