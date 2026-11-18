import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────
// BOARD ICON SET
//
// Icons a board (or sub-board) can wear, so a gallery of a dozen
// projects reads at a glance. Same monoline language as UI/Icon.tsx:
// 24×24, stroke: currentColor, no fills and no baked-in colors, so
// each glyph takes the board's accent and re-themes with the app.
//
// ── ADDING YOUR OWN ──────────────────────────────────────────
// Drop one entry into GLYPHS below and it appears in the
// picker automatically — nothing else to touch:
//
//     myIcon: <path d="M4 4 L20 20" />,
//
// Rules for a glyph to fit the set:
//   • draw inside the 24×24 box, roughly 3…21 to leave optical margin
//   • strokes only — no fill="…" and no hardcoded stroke color
//   • the wrapper supplies stroke-width, linecap and linejoin
//
// Board.icon stores the KEY as a plain string (not a union type) so a
// board saved with an icon that a later build renames still loads —
// it just falls back to DEFAULT_GLYPH.
//
// That same loose typing is what lets a board use a CUSTOM IMAGE: if
// the stored value is a data URL instead of a registry key, GlyphIcon
// renders an <img>. Uploads are downscaled to ICON_MAX_DIM first
// (see utils/image.ts) so a custom icon costs a couple of KB, not a
// slice of the shared localStorage budget.
// ─────────────────────────────────────────────────────────────

export const DEFAULT_GLYPH = 'board'

/** True when a board's icon is an uploaded image rather than a glyph. */
export function isCustomIcon(icon?: string): boolean {
  return !!icon && icon.startsWith('data:image/')
}

export const GLYPHS: Record<string, ReactNode> = {
  // Nested frames — the default, matches the board card glyph
  board: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <rect x="7" y="8.5" width="10" height="7" rx="1.5" />
    </>
  ),

  // Page with text lines — the default for document cards
  document: (
    <>
      <path d="M14 2.5H7A2 2 0 0 0 5 4.5v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5l-5-5Z" />
      <path d="M14 2.5v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),

  atom: (
    <>
      <circle cx="12" cy="12" r="2.1" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(120 12 12)" />
    </>
  ),

  rocket: (
    <>
      <path d="M12 2.6c2.8 2.3 4.4 5.6 4.4 9.2 0 2.4-.7 4.6-1.9 6.5H9.5a12 12 0 0 1-1.9-6.5c0-3.6 1.6-6.9 4.4-9.2Z" />
      <circle cx="12" cy="10" r="1.9" />
      <path d="M7.9 13.4 5 15.6v3.9l2.9-1.7" />
      <path d="M16.1 13.4 19 15.6v3.9l-2.9-1.7" />
      <path d="M12 20v2" />
    </>
  ),

  flask: (
    <>
      <path d="M9.5 3v6.2l-4.7 8.5a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3l-4.7-8.5V3" />
      <path d="M8.5 3h7" />
      <path d="M7.6 14.6h8.8" />
    </>
  ),

  bulb: (
    <>
      <path d="M9 17.4a6 6 0 1 1 6 0v1.9H9v-1.9Z" />
      <path d="M9.8 21.6h4.4" />
    </>
  ),

  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),

  star: (
    <path d="m12 3.4 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.8l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8L12 3.4Z" />
  ),

  heart: (
    <path d="M12 20.3S3.8 15.2 3.8 9.5a4.7 4.7 0 0 1 8.2-3.1 4.7 4.7 0 0 1 8.2 3.1c0 5.7-8.2 10.8-8.2 10.8Z" />
  ),

  bolt: (
    <path d="M13.3 2.5 5 13.5h6l-1.3 8 8.3-11h-6l1.3-8Z" />
  ),

  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18Z" />
    </>
  ),

  camera: (
    <>
      <path d="M4 8h3.2l1.6-2.5h6.4L16.8 8H20a1.8 1.8 0 0 1 1.8 1.8v8.4A1.8 1.8 0 0 1 20 20H4a1.8 1.8 0 0 1-1.8-1.8V9.8A1.8 1.8 0 0 1 4 8Z" />
      <circle cx="12" cy="13.4" r="3.5" />
    </>
  ),

  music: (
    <>
      <path d="M9 17.6V5.4l10-2v12.2" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="15.6" r="2.5" />
    </>
  ),

  book: (
    <>
      <path d="M4 4.5h5.5a2.5 2.5 0 0 1 2.5 2.5v13a2.2 2.2 0 0 0-2.2-2H4v-13.5Z" />
      <path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v13a2.2 2.2 0 0 1 2.2-2H20v-13.5Z" />
    </>
  ),

  chart: (
    <>
      <path d="M4 20.2h16" />
      <path d="M7.6 20.2v-6.4" />
      <path d="M12 20.2V7.6" />
      <path d="M16.4 20.2v-9.4" />
    </>
  ),

  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),

  folder: (
    <path d="M3 6.6A1.6 1.6 0 0 1 4.6 5h4.1l2 2.6h8.7A1.6 1.6 0 0 1 21 9.2V18a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 18V6.6Z" />
  ),

  tag: (
    <>
      <path d="M11.6 3.5H20v8.4l-8.8 8.8a1.6 1.6 0 0 1-2.3 0l-6.1-6.1a1.6 1.6 0 0 1 0-2.3l8.8-8.8Z" />
      <circle cx="16.3" cy="7.7" r="1.3" />
    </>
  ),

  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.6 8.4-2.3 5.2-5.2 2.3 2.3-5.2 5.2-2.3Z" />
    </>
  ),
}

export const GLYPH_KEYS = Object.keys(GLYPHS)

// Accents a board icon can take. Theme vars first, so most boards
// re-color with the reactor; the last two are fixed hues for boards
// that should stay recognizable across theme swaps.
export const ACCENTS = [
  'var(--nx-core)',
  'var(--nx-core-hot)',
  'var(--nx-hazard)',
  'var(--nx-danger)',
  'var(--nx-ink)',
  'var(--nx-ink-dim)',
  '#5dfc8d',
  '#a78bfa',
]

export const DEFAULT_ACCENT = ACCENTS[0]

interface BoardIconProps {
  name?: string
  accent?: string
  size?: number
  className?: string
}

export function GlyphIcon({ name, accent, size = 18, className }: BoardIconProps) {
  // Uploaded image — rendered as a rounded tile rather than a glyph.
  // The accent doesn't apply: the image supplies its own color.
  if (isCustomIcon(name)) {
    return (
      <img
        src={name}
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: Math.max(3, size * 0.22), objectFit: 'cover', display: 'block' }}
        alt=""
        aria-hidden="true"
      />
    )
  }

  const glyph = GLYPHS[name ?? ''] ?? GLYPHS[DEFAULT_GLYPH]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ color: accent ?? DEFAULT_ACCENT }}
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  )
}
