import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  GLYPH_KEYS, ACCENTS, GlyphIcon, isCustomIcon,
  DEFAULT_GLYPH, DEFAULT_ACCENT,
} from './glyphs'
import { Icon } from './Icon'
import { fileToImageDataURL, ICON_MAX_DIM } from '@/utils/image'
import styles from './IconPicker.module.css'

// ─────────────────────────────────────────────────────────────
// BOARD ICON PICKER — glyph grid + accent row
//
// Used from both places a board shows up: the gallery tile and the
// board card on a canvas. Choosing applies immediately (no Save
// button) — every change is one store call and instantly reversible.
//
// PORTALED to <body> with fixed positioning, for two reasons:
//   • Both hosts set overflow: hidden (card radius clipping, tile
//     thumbnails), which would slice the popover in half.
//   • Inside a canvas card the popover would inherit the world's
//     scale() transform and shrink with the zoom level.
// Position is measured from the trigger and clamped to the viewport.
//
// The grid is driven by GLYPH_KEYS, so adding a glyph to
// glyphs.tsx makes it appear here with no edit to this file.
// ─────────────────────────────────────────────────────────────

const WIDTH  = 214
const GAP    = 6
const MARGIN = 8

interface Props {
  icon?: string
  accent?: string
  onPick: (icon: string, accent: string) => void
  onClose: () => void
  /** The element the popover should sit under. */
  anchorRef: RefObject<HTMLElement | null>
}

export function IconPicker({ icon, accent, onPick, onClose, anchorRef }: Props) {
  const ref     = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pos, setPos]     = useState<{ top: number; left: number } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  const currentIcon   = icon   ?? DEFAULT_GLYPH
  const currentAccent = accent ?? DEFAULT_ACCENT
  const custom        = isCustomIcon(icon)

  // Upload a custom image icon. Downscaled to ICON_MAX_DIM before it is
  // stored, so a 4MB photo becomes a couple of KB — boards share one
  // ~5MB localStorage budget with every card on them.
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''            // let the same file be re-picked later
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Pick an image file.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onPick(await fileToImageDataURL(file, ICON_MAX_DIM), currentAccent)
    } catch {
      setError('Could not read that image.')
    } finally {
      setBusy(false)
    }
  }

  // Measure before paint so the popover never flashes in the wrong spot.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const height = ref.current?.offsetHeight ?? 220

    // Flip above the trigger when there isn't room below.
    const below = rect.bottom + GAP
    const top = below + height > window.innerHeight - MARGIN
      ? Math.max(MARGIN, rect.top - GAP - height)
      : below

    setPos({
      top,
      left: Math.min(Math.max(MARGIN, rect.left), window.innerWidth - WIDTH - MARGIN),
    })
  }, [anchorRef])

  // Close on outside press, Escape, or anything that would move the
  // anchor out from under the popover.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      className={styles.popover}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div className={styles.title}>Icon</div>
      <div className={styles.grid}>
        {GLYPH_KEYS.map(key => (
          <button
            key={key}
            className={`${styles.cell} ${!custom && key === currentIcon ? styles.cellOn : ''}`}
            onClick={() => onPick(key, currentAccent)}
            title={key}
            aria-label={key}
          >
            <GlyphIcon name={key} accent={currentAccent} size={17} />
          </button>
        ))}

        {/* Upload tile — sits in the grid so a custom image reads as
            just another icon choice, and shows the current one when set. */}
        <button
          className={`${styles.cell} ${styles.upload} ${custom ? styles.cellOn : ''}`}
          onClick={() => fileRef.current?.click()}
          title="Upload a custom image"
          aria-label="Upload a custom image"
          disabled={busy}
        >
          {custom
            ? <GlyphIcon name={icon} size={18} />
            : <Icon name={busy ? 'reset-view' : 'plus'} size={15} />}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.file}
        onChange={onFile}
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.title}>Color</div>
      <div className={styles.accents}>
        {ACCENTS.map(color => (
          <button
            key={color}
            className={`${styles.accent} ${color === currentAccent ? styles.accentOn : ''}`}
            style={{ background: color }}
            onClick={() => onPick(currentIcon, color)}
            title={color}
            aria-label={`Accent ${color}`}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}
