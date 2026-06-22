import { useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import { fileToImageDataURL, isImageSrc } from '@/utils/image'
import type { MediaCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// MEDIA CARD CONTENT
//
// Three ways to set the image:
//   1. Upload a file — downscaled, then stored as a data URL
//   2. Drag & drop an image file onto the empty card
//   3. Paste / type a URL into the text input
//
// Large uploads are downscaled in fileToImageDataURL() so they
// don't blow the localStorage quota when the board is saved.
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
  const [busy, setBusy]       = useState(false)
  const [dragOver, setDragOver] = useState(false)

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

  async function ingestFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setBusy(true)
    try {
      setSrc(await fileToImageDataURL(file))
    } catch {
      /* ignore — leave the upload zone visible */
    } finally {
      setBusy(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) ingestFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) { ingestFile(file); return }
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (uri && isImageSrc(uri)) setSrc(uri.trim())
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
          <div
            className={`${styles.mediaUploadZone} ${dragOver ? styles.mediaUploadZoneActive : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <span className={styles.mediaUploadIcon}>🖼️</span>
            <span>{busy ? 'Processing…' : 'Click or drop an image'}</span>
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
