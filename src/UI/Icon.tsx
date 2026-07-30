import type { ReactNode, SVGProps } from 'react'

// ─────────────────────────────────────────────────────────────
// NUCLEAR NEXUS ICON SET
//
// Monoline 24×24 glyphs drawn with stroke: currentColor, so every
// icon inherits its color from the surrounding text token
// (--nx-ink, --nx-core on hover, --nx-danger, …) and re-colors
// automatically when the theme core swaps. Rule zero compliant —
// no hardcoded colors, unlike the emoji glyphs these replace.
//
//   <Icon name="note" />            → 18px note glyph
//   <Icon name="trash" size={14} /> → 14px trash glyph
// ─────────────────────────────────────────────────────────────

export type IconName =
  | 'select' | 'note' | 'document' | 'task' | 'table' | 'media' | 'link'
  | 'column' | 'connect' | 'select-all' | 'close' | 'trash'
  | 'reset-view' | 'settings'
  | 'chevron-down' | 'chevron-right' | 'grip'
  | 'sketch' | 'color' | 'audio' | 'video' | 'heading' | 'comment'
  | 'map' | 'board' | 'pin' | 'eraser' | 'undo' | 'plus'
  | 'lock' | 'unlock'

const GLYPHS: Record<IconName, ReactNode> = {
  // Arrow cursor
  select: (
    <path d="M4 3.5 11.07 20.47 13.58 13.08 20.97 10.57 4 3.5Z" />
  ),

  // Sticky note with a folded corner
  note: (
    <>
      <path d="M15.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15.5 3Z" />
      <path d="M15 3v5h5" />
    </>
  ),

  // Long-form page with text lines
  document: (
    <>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7L14 2Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),

  // Check square
  task: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
    </>
  ),

  // Grid / spreadsheet
  table: (
    <>
      <rect x="4" y="4.5" width="16" height="15" rx="2" />
      <path d="M4 10h16" />
      <path d="M10.5 4.5v15" />
    </>
  ),

  // Picture — horizon + sun
  media: (
    <>
      <rect x="4" y="4.5" width="16" height="15" rx="2" />
      <circle cx="9.2" cy="9.7" r="1.5" />
      <path d="m20 15.5-3.6-3.6a1.6 1.6 0 0 0-2.26 0L7.5 18.5" />
    </>
  ),

  // Chain links
  link: (
    <>
      <path d="M10 13.5a4.2 4.2 0 0 0 6.3.42l2.5-2.5a4.2 4.2 0 0 0-5.94-5.94L11.5 6.83" />
      <path d="M14 10.5a4.2 4.2 0 0 0-6.3-.42l-2.5 2.5a4.2 4.2 0 0 0 5.94 5.94l1.35-1.35" />
    </>
  ),

  // Vertical container with stacked rows
  column: (
    <>
      <rect x="6.5" y="3.5" width="11" height="17" rx="2" />
      <path d="M6.5 9.2h11" />
      <path d="M6.5 14.9h11" />
    </>
  ),

  // Two nodes joined by a beam
  connect: (
    <>
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <path d="M7.8 16.2 16.2 7.8" />
    </>
  ),

  // Dashed marquee — select everything
  'select-all': (
    <>
      <path d="M5 3.5A1.5 1.5 0 0 0 3.5 5" />
      <path d="M19 3.5A1.5 1.5 0 0 1 20.5 5" />
      <path d="M20.5 19a1.5 1.5 0 0 1-1.5 1.5" />
      <path d="M5 20.5A1.5 1.5 0 0 1 3.5 19" />
      <path d="M9.5 3.5h2" />
      <path d="M14.5 3.5h2" />
      <path d="M9.5 20.5h2" />
      <path d="M14.5 20.5h2" />
      <path d="M3.5 9.5v2" />
      <path d="M3.5 14.5v2" />
      <path d="M20.5 9.5v2" />
      <path d="M20.5 14.5v2" />
    </>
  ),

  // ✕
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),

  // Waste disposal
  trash: (
    <>
      <path d="M4 6.5h16" />
      <path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
      <path d="M18.5 6.5 17.6 19a2 2 0 0 1-2 1.85H8.4a2 2 0 0 1-2-1.85L5.5 6.5" />
      <path d="M10 10.5v6" />
      <path d="M14 10.5v6" />
    </>
  ),

  // Crosshair — re-center the view
  'reset-view': (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2.5v3" />
      <path d="M12 18.5v3" />
      <path d="M2.5 12h3" />
      <path d="M18.5 12h3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),

  // Expand / collapse caret (rotate 180° via CSS for "up")
  'chevron-down': (
    <path d="m6 9.5 6 6 6-6" />
  ),

  // Breadcrumb separator / descend-into
  'chevron-right': (
    <path d="m9.5 6 6 6-6 6" />
  ),

  // Pen nib over a drawn stroke
  sketch: (
    <>
      <path d="M15.6 3.9a2.1 2.1 0 0 1 3 3L9.9 15.6l-3.9.9.9-3.9 8.7-8.7Z" />
      <path d="M3.5 20.5c2-1.4 3.6-1.4 5 0s3 1.4 5 0 3.6-1.4 5 0" />
    </>
  ),

  // Paint swatch — droplet over a chip
  color: (
    <>
      <path d="M12 3.2s5 5.3 5 8.4a5 5 0 0 1-10 0c0-3.1 5-8.4 5-8.4Z" />
      <path d="M4 20.5h16" />
    </>
  ),

  // Speaker with sound arcs
  audio: (
    <>
      <path d="M11 5 6.5 8.8H3.5v6.4h3L11 19V5Z" />
      <path d="M14.8 9.2a4 4 0 0 1 0 5.6" />
      <path d="M17.6 6.4a8 8 0 0 1 0 11.2" />
    </>
  ),

  // Film frame with a play triangle
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M10.2 9.3 14.8 12l-4.6 2.7V9.3Z" />
    </>
  ),

  // Typographic H
  heading: (
    <>
      <path d="M6 4.5v15" />
      <path d="M18 4.5v15" />
      <path d="M6 12h12" />
    </>
  ),

  // Speech bubble with a tail
  comment: (
    <>
      <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 3.5V6a2.5 2.5 0 0 1 2.5-2.5h10.5A2.5 2.5 0 0 1 20 6v8.5Z" />
      <path d="M8.5 8.5h7" />
      <path d="M8.5 12h4.5" />
    </>
  ),

  // Folded paper map with a crease
  map: (
    <>
      <path d="M3.5 6.6 9 4.4l6 2.2 5.5-2.2v13l-5.5 2.2-6-2.2-5.5 2.2v-13Z" />
      <path d="M9 4.4v13" />
      <path d="M15 6.6v13" />
    </>
  ),

  // Board inside a board — nested frames
  board: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <rect x="7" y="8.5" width="10" height="7" rx="1.5" />
    </>
  ),

  // Location marker
  pin: (
    <>
      <path d="M12 21.5s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
      <circle cx="12" cy="10.3" r="2.6" />
    </>
  ),

  // Eraser on an angle
  eraser: (
    <>
      <path d="M8.6 20.5H20" />
      <path d="M13.4 4.9 4.9 13.4a2 2 0 0 0 0 2.83l3.37 3.37a2 2 0 0 0 2.83 0l8.5-8.5a2 2 0 0 0 0-2.83l-3.37-3.37a2 2 0 0 0-2.83 0Z" />
      <path d="m9.5 8.8 5.7 5.7" />
    </>
  ),

  // Curved undo arrow
  undo: (
    <>
      <path d="M4 9.5h9.5a5.5 5.5 0 0 1 0 11H8" />
      <path d="M7.5 5.5 3.5 9.5l4 4" />
    </>
  ),

  // Plus
  plus: (
    <>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </>
  ),

  // Closed padlock — card pinned in place
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M7.8 10.5V7.6a4.2 4.2 0 0 1 8.4 0v2.9" />
      <circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),

  // Open padlock — shackle swung clear of the body
  unlock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M7.8 10.5V7.6a4.2 4.2 0 0 1 8.2-1.3" />
      <circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),

  // Drag handle — two dotted rails
  grip: (
    <>
      <circle cx="9.2" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.2" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.2" cy="18.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="18.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),

  // Control-rod sliders
  settings: (
    <>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <circle cx="15" cy="7" r="2" />
      <path d="M4 17h3" />
      <path d="M11 17h9" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 18, ...rest }: IconProps) {
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
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {GLYPHS[name]}
    </svg>
  )
}
