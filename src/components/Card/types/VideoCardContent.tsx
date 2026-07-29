import { useState } from 'react'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import { parseVideoUrl } from '@/utils/media'
import type { VideoCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// VIDEO CARD — link only, by design
//
// Video is never embedded in the board: the app's entire persistence
// budget is ~5MB of localStorage, and one short clip would consume all
// of it and break saving for every other board. See utils/media.ts.
//
// YouTube and Vimeo links are converted to their player embeds;
// direct .mp4/.webm URLs play in a native <video>.
// ─────────────────────────────────────────────────────────────

interface Props { card: VideoCard }

export function VideoCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const [draft, setDraft] = useState(card.content.url)
  const [error, setError] = useState('')

  const { url } = card.content
  const source = parseVideoUrl(url)

  function commit() {
    const value = draft.trim()
    if (!value) return
    if (parseVideoUrl(value).kind === 'invalid') {
      setError('Paste a YouTube or Vimeo link, or a direct .mp4 / .webm URL.')
      return
    }
    setError('')
    updateCard(card.id, { content: { url: value } })
  }

  function clear() {
    updateCard(card.id, { content: { url: '' } })
    setDraft('')
    setError('')
  }

  return (
    <div className={styles.video} onMouseDown={e => e.stopPropagation()}>
      {source.kind === 'embed' && (
        <div className={styles.videoFrame}>
          <iframe
            src={source.src}
            title={card.title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {source.kind === 'file' && (
        <div className={styles.videoFrame}>
          <video src={source.src} controls preload="metadata" />
        </div>
      )}

      {source.kind === 'invalid' && (
        <div className={styles.videoEmpty}>
          <Icon name="video" size={24} />
          <span>Paste a video link</span>
          <small>YouTube · Vimeo · direct .mp4 / .webm</small>
        </div>
      )}

      <div className={styles.videoBar}>
        <input
          className={styles.videoUrl}
          placeholder="https://…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            e.stopPropagation()
          }}
        />
        {url && (
          <button className={styles.videoBtn} onClick={clear} title="Remove video">
            <Icon name="close" size={12} />
          </button>
        )}
      </div>

      {error && <p className={styles.mediaError}>{error}</p>}
    </div>
  )
}
