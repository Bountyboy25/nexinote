import { useRef, useState } from 'react'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import {
  AUDIO_MAX_BYTES, fileToDataURL, formatBytes, parseAudioUrl,
} from '@/utils/media'
import type { AudioCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// AUDIO CARD
//
// Two sources:
//   • A dropped/selected file, stored inline as a data URL. Capped at
//     AUDIO_MAX_BYTES because the whole app shares one ~5MB
//     localStorage budget — see utils/media.ts.
//   • A URL: a direct audio file, or a SoundCloud track (played
//     through SoundCloud's public iframe player).
// ─────────────────────────────────────────────────────────────

interface Props { card: AudioCard }

export function AudioCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)
  const fileRef    = useRef<HTMLInputElement>(null)

  const [urlDraft, setUrlDraft] = useState(
    card.content.src.startsWith('data:') ? '' : card.content.src
  )
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const { src, fileName } = card.content
  const source = parseAudioUrl(src)

  const set = (patch: Partial<AudioCard['content']>) =>
    updateCard(card.id, { content: { ...card.content, ...patch } })

  async function ingestFile(file: File) {
    setError('')
    if (!file.type.startsWith('audio/')) {
      setError('That is not an audio file.')
      return
    }
    if (file.size > AUDIO_MAX_BYTES) {
      setError(
        `${formatBytes(file.size)} is too large — the limit is ${formatBytes(AUDIO_MAX_BYTES)}. ` +
        `Host it somewhere and paste the URL instead.`
      )
      return
    }
    setBusy(true)
    try {
      set({ src: await fileToDataURL(file), fileName: file.name })
      if (card.title === 'Audio') updateCard(card.id, { title: file.name.replace(/\.[^.]+$/, '') })
    } catch {
      setError('Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  function commitUrl() {
    const value = urlDraft.trim()
    if (!value) return
    if (parseAudioUrl(value).kind === 'invalid') {
      setError('Not a recognized audio link (direct file or SoundCloud track).')
      return
    }
    setError('')
    set({ src: value, fileName: '' })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('audio/'))
    if (file) ingestFile(file)
  }

  function clear() {
    set({ src: '', fileName: '' })
    setUrlDraft('')
    setError('')
  }

  return (
    <div className={styles.audio} onMouseDown={e => e.stopPropagation()}>
      {src ? (
        <>
          {source.kind === 'embed' ? (
            <iframe
              className={styles.audioEmbed}
              src={source.src}
              title={card.title}
              allow="autoplay"
              loading="lazy"
            />
          ) : (
            <audio className={styles.audioPlayer} src={source.src} controls preload="metadata" />
          )}

          <div className={styles.audioMeta}>
            <span className={styles.audioName} title={fileName || src}>
              {fileName || (source.kind === 'embed' ? 'SoundCloud track' : src)}
            </span>
            <button className={styles.audioBtn} onClick={clear} title="Remove audio">
              <Icon name="close" size={12} /> Remove
            </button>
          </div>
        </>
      ) : (
        <div className={styles.audioEmpty}>
          <div
            className={`${styles.audioDrop} ${dragOver ? styles.audioDropActive : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <Icon name="audio" size={22} />
            <span>{busy ? 'Reading…' : 'Click or drop an audio file'}</span>
            <small>up to {formatBytes(AUDIO_MAX_BYTES)}</small>
          </div>

          <div className={styles.audioOr}>— or paste a link —</div>
          <input
            className={styles.audioUrl}
            placeholder="https://… or a SoundCloud track"
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            onBlur={commitUrl}
            onKeyDown={e => {
              if (e.key === 'Enter') commitUrl()
              e.stopPropagation()
            }}
          />

          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className={styles.hiddenFile}
            onChange={e => { const f = e.target.files?.[0]; if (f) ingestFile(f) }}
          />
        </div>
      )}

      {error && <p className={styles.mediaError}>{error}</p>}
    </div>
  )
}
