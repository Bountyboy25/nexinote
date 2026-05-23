import { useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import type { MediaCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// MEDIA CARD CONTENT
//
// Two ways to set the image:
//   1. Upload a file — FileReader converts to base64 data URI
//   2. Paste / type a URL into the text input
//
// Fit toggle: cover (fills card, crops) / contain (letterbox)
// ─────────────────────────────────────────────────────────────

interface Props { card: MediaCard }

export function MediaCardContent({ card }: Props) {
  const updateCard  = useCanvasStore(s => s.updateCard)
  const fileRef     = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState(
    card.content.src.startsWith('http') ? card.content.src : ''
  )

  function setSrc(src: string) {
    updateCard(card.id, { content: { ...card.content, src } })
  }

  function toggleFit() {
    updateCard(card.id, {
      content: {
        ...card.content,
        fit: card.content.fit === 'cover' ? 'contain' : 'cover',
      },
    })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function onUrlBlur() {
    const trimmed = urlInput.trim()
    if (trimmed) setSrc(trimmed)
  }

  const hasImage = !!card.content.src

  return (
    <div className={styles.media} onMouseDown={e => e.stopPropagation()}>
      {hasImage ? (
        <>
          <div className={styles.mediaImgWrap}>
            <img
              src={card.content.src}
              alt={card.title}
              className={styles.mediaImg}
              style={{ objectFit: card.content.fit }}
            />
          </div>
          <div className={styles.mediaControls}>
            <button className={styles.mediaBtn} onClick={toggleFit} title="Toggle fit">
              {card.content.fit === 'cover' ? 'Cover' : 'Contain'}
            </button>
            <button
              className={styles.mediaBtn}
              onClick={() => setSrc('')}
              title="Remove image"
            >
              ✕ Remove
            </button>
          </div>
        </>
      ) : (
        <div className={styles.mediaEmpty}>
          <div className={styles.mediaUploadZone} onClick={() => fileRef.current?.click()}>
            <span className={styles.mediaUploadIcon}>🖼️</span>
            <span>Click to upload</span>
          </div>
          <div className={styles.mediaOr}>— or paste URL —</div>
          <input
            className={styles.mediaUrlInput}
            placeholder="https://…"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onBlur={onUrlBlur}
            onKeyDown={e => {
              if (e.key === 'Enter') onUrlBlur()
              e.stopPropagation()
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.mediaFileInput}
            onChange={onFileChange}
          />
        </div>
      )}
    </div>
  )
}
