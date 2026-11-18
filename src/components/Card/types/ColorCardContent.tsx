import { useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import type { ColorCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// COLOR CARD — a swatch you can pin to a board
//
// Holds one color plus an optional name, and shows the hex in a
// click-to-copy chip. The readable-text preview ("Aa") flips between
// black and white using the WCAG relative-luminance formula, so the
// card doubles as a quick contrast check when building a palette.
// ─────────────────────────────────────────────────────────────

interface Props { card: ColorCard }

const PRESETS = [
  '#3ec6ff', '#5dfc8d', '#ff7a3d', '#a78bfa',
  '#ffd23f', '#ff5470', '#dbe9ff', '#0c1524',
]

// sRGB → relative luminance (WCAG 2.x). Returns 0 (black) … 1 (white).
function luminance(hex: string): number {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim())
  if (!m) return 0
  const int = parseInt(m[1], 16)
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function normalizeHex(raw: string): string | null {
  const v = raw.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(v)) {
    return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`.toLowerCase()
  }
  if (/^[\da-f]{6}$/i.test(v)) return `#${v.toLowerCase()}`
  return null
}

export function ColorCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const { hex, label } = card.content

  const [draft, setDraft]   = useState(hex)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The "Copied" flash must not fire setState after the card is deleted.
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const set = (patch: Partial<ColorCard['content']>) =>
    updateCard(card.id, { content: { ...card.content, ...patch } })

  function commitHex(value: string) {
    const next = normalizeHex(value)
    if (next) { set({ hex: next }); setDraft(next) }
    else setDraft(hex)   // reject garbage, snap back to the stored value
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard blocked (insecure context) — the hex is still on screen */
    }
  }

  const onLight = luminance(hex) > 0.35

  return (
    <div className={styles.color} onMouseDown={e => e.stopPropagation()}>
      <button
        className={styles.colorSwatch}
        style={{ background: hex, color: onLight ? '#000' : '#fff' }}
        onClick={copy}
        title="Click to copy the hex"
      >
        <span className={styles.colorAa}>Aa</span>
        <span className={styles.colorCopied} data-on={copied || undefined}>
          {copied ? 'Copied' : 'Copy'}
        </span>
      </button>

      <div className={styles.colorRow}>
        {/* Native picker — free eyedropper + OS palette on most platforms */}
        <label className={styles.colorPickWrap} title="Pick a color">
          <span className={styles.colorPickDot} style={{ background: hex }} />
          <input
            type="color"
            className={styles.colorPick}
            value={hex}
            onChange={e => { set({ hex: e.target.value }); setDraft(e.target.value) }}
          />
        </label>

        <input
          className={styles.colorHex}
          value={draft}
          spellCheck={false}
          onChange={e => setDraft(e.target.value)}
          onBlur={e => commitHex(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            e.stopPropagation()
          }}
        />
      </div>

      <input
        className={styles.colorLabel}
        placeholder="Name this color…"
        value={label}
        onChange={e => set({ label: e.target.value })}
        onKeyDown={e => e.stopPropagation()}
      />

      <div className={styles.colorPresets}>
        {PRESETS.map(p => (
          <button
            key={p}
            className={`${styles.colorPreset} ${p === hex ? styles.colorPresetOn : ''}`}
            style={{ background: p }}
            onClick={() => { set({ hex: p }); setDraft(p) }}
            title={p}
            aria-label={`Use ${p}`}
          />
        ))}
      </div>
    </div>
  )
}
