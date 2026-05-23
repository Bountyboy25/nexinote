import type { Camera } from '@/types'

// ─────────────────────────────────────────────────────────────
// CANVAS MATH UTILITIES
//
// These are "pure functions" — they take inputs and return
// outputs with no side effects. Pure functions are:
//   • Easy to test (same input = same output, always)
//   • Easy to reason about (no hidden state)
//   • Reusable anywhere
//
// We keep all coordinate math here so it's never duplicated.
// ─────────────────────────────────────────────────────────────

// Convert a SCREEN position → WORLD position
// Use this when: user clicks at screen (x,y), where in the world is that?
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  }
}

// Convert a WORLD position → SCREEN position
// Use this when: a card is at world (x,y), where on screen does it appear?
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  }
}

// Get the world position at the center of the viewport
// Use this when: placing a new card in the middle of the current view
export function getViewportCenter(camera: Camera): { x: number; y: number } {
  return screenToWorld(
    window.innerWidth / 2,
    window.innerHeight / 2,
    camera
  )
}

// Clamp a zoom value within the allowed min/max range
export function clampZoom(zoom: number): number {
  return Math.min(4.0, Math.max(0.1, zoom))
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Calculate a camera that fits all cards into the viewport
export function fitCameraToCards(
  cards: Array<{ x: number; y: number; width: number }>,
  viewportW: number,
  viewportH: number,
  padding = 80
): Camera {
  if (cards.length === 0) return { x: 0, y: 52, zoom: 1 }

  const CARD_HEIGHT = 160  // Approximate card height

  const minX = Math.min(...cards.map(c => c.x)) - padding
  const minY = Math.min(...cards.map(c => c.y)) - padding
  const maxX = Math.max(...cards.map(c => c.x + c.width)) + padding
  const maxY = Math.max(...cards.map(c => c.y + CARD_HEIGHT)) + padding

  const contentW = maxX - minX
  const contentH = maxY - minY

  const zoom = clampZoom(Math.min(viewportW / contentW, viewportH / contentH, 1))
  const x = (viewportW - contentW * zoom) / 2 - minX * zoom
  const y = 52 + (viewportH - contentH * zoom) / 2 - minY * zoom

  return { x, y, zoom }
}
