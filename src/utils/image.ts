// ─────────────────────────────────────────────────────────────
// IMAGE UTILITIES
//
// Boards are persisted to localStorage as JSON, and images are
// stored inline as base64 data URLs. A few full-resolution photos
// would blow the ~5MB localStorage quota, so we downscale large
// raster images before storing them.
//
//   • Animated / vector formats (gif, svg) are kept untouched —
//     rasterizing them would break animation / lose sharpness.
//   • Everything else is capped at MAX_DIM on its longest edge.
//   • PNGs keep their transparency; other formats become JPEG
//     (much smaller for photos).
// ─────────────────────────────────────────────────────────────

const MAX_DIM = 1600
const KEEP_AS_IS = new Set(['image/gif', 'image/svg+xml'])

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

/**
 * Read an image File and return a (possibly downscaled) data URL.
 * Falls back to the raw data URL if anything about the resize fails.
 */
export async function fileToImageDataURL(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Not an image file')
  }

  const dataUrl = await readAsDataURL(file)
  if (KEEP_AS_IS.has(file.type)) return dataUrl

  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = img
      const scale = Math.min(1, MAX_DIM / Math.max(width, height))

      // Already small enough — store the original bytes.
      if (scale === 1) return resolve(dataUrl)

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      resolve(canvas.toDataURL(outType, 0.85))
    }
    img.onerror = () => resolve(dataUrl) // network/decoding issue — keep raw
    img.src = dataUrl
  })
}

/** True if a string looks like a usable image source (http URL or data URI). */
export function isImageSrc(value: string): boolean {
  const v = value.trim()
  return /^https?:\/\//i.test(v) || v.startsWith('data:image/')
}
