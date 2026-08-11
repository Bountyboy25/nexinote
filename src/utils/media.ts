// ─────────────────────────────────────────────────────────────
// AUDIO / VIDEO SOURCE HELPERS
//
// Boards live in localStorage, which is ~5MB for EVERYTHING — all
// boards, all cards, all embedded images. That budget drives the
// rules here:
//
//   • Audio may be uploaded, but only under AUDIO_MAX_BYTES, and it
//     is stored base64-encoded (which inflates it by ~33%).
//   • Video is URL-only. Even a short clip would blow the entire
//     quota and break saving for every other board.
// ─────────────────────────────────────────────────────────────

// 2MB of file → ~2.7MB of base64. Deliberately generous enough for a
// voice memo and nowhere near enough for a song.
export const AUDIO_MAX_BYTES = 2 * 1024 * 1024

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// ── Video ─────────────────────────────────────────────────────

export type VideoSource =
  | { kind: 'file';    src: string }   // play natively in <video>
  | { kind: 'embed';   src: string }   // third-party iframe player
  | { kind: 'invalid'; src: string }

const FILE_VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i

export function parseVideoUrl(raw: string): VideoSource {
  const url = raw.trim()
  if (!url) return { kind: 'invalid', src: '' }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { kind: 'invalid', src: url }
  }

  const host = parsed.hostname.replace(/^www\./, '')

  // YouTube — watch?v=, youtu.be/, /embed/, /shorts/
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const id =
      parsed.searchParams.get('v') ??
      parsed.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1]
    if (id) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` }
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1)
    if (id) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` }
  }

  // Vimeo — vimeo.com/<id>
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.match(/(\d{6,})/)?.[1]
    if (id) return { kind: 'embed', src: `https://player.vimeo.com/video/${id}` }
  }

  if (FILE_VIDEO_EXT.test(parsed.pathname) || url.startsWith('blob:')) {
    return { kind: 'file', src: url }
  }

  return { kind: 'invalid', src: url }
}

// ── Audio ─────────────────────────────────────────────────────

export type AudioSource =
  | { kind: 'file';    src: string }
  | { kind: 'embed';   src: string }
  | { kind: 'invalid'; src: string }

const FILE_AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)(\?.*)?$/i

export function parseAudioUrl(raw: string): AudioSource {
  const url = raw.trim()
  if (!url) return { kind: 'invalid', src: '' }

  // Uploaded files are already inline and always playable.
  if (url.startsWith('data:audio') || url.startsWith('blob:')) {
    return { kind: 'file', src: url }
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { kind: 'invalid', src: url }
  }

  const host = parsed.hostname.replace(/^www\./, '')

  // SoundCloud's public player takes the track URL directly — no API key
  // and no oEmbed round-trip needed.
  if (host === 'soundcloud.com') {
    return {
      kind: 'embed',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%233ec6ff&visual=false`,
    }
  }

  if (FILE_AUDIO_EXT.test(parsed.pathname)) return { kind: 'file', src: url }

  return { kind: 'invalid', src: url }
}
