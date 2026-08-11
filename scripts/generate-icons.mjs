// ─────────────────────────────────────────────────────────────
// APP ICON GENERATOR
//
// Writes the PWA icon set into public/ from a single description of the
// artwork below. Run it whenever the mark changes:
//
//     node scripts/generate-icons.mjs
//
// Why hand-rolled: the icons need to be real PNGs (Chrome's install
// criteria want 192px and 512px raster icons), but a rasterizer like
// sharp or node-canvas is a heavy native dependency to carry for a
// once-in-a-while build step. Node ships zlib, and a PNG is just zlib
// over raw scanlines plus four chunks — so the encoder is ~40 lines and
// the project keeps its dependency list short.
//
// The artwork is drawn analytically (signed distance per pixel, 3×3
// supersampled) rather than from a bitmap, so it stays crisp at any
// size: a Cherenkov-blue atom on the reactor-dark panel, matching
// --nx-core / --nx-bg from the default theme.
// ─────────────────────────────────────────────────────────────

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public')

// ── Palette (default "Cherenkov" theme) ──
const BG = [6, 11, 20]        // --nx-bg
const PANEL = [16, 28, 48]    // --nx-bg-panel
const CORE = [62, 198, 255]   // --nx-core
const HOT = [143, 227, 255]   // --nx-core-hot

// ── Minimal PNG encoder ───────────────────────────────────────
function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** rgba: Uint8Array of size*size*4 */
function encodePng(size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.subarray(y * size * 4, (y + 1) * size * 4)
      .forEach((v, i) => { raw[y * (size * 4 + 1) + 1 + i] = v })
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Drawing helpers (all in 0..1 unit space) ──
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

// Distance from point to an axis-aligned ellipse outline, rotated by `rot`.
function ellipseRingDist(x, y, rx, ry, rot) {
  const c = Math.cos(-rot), s = Math.sin(-rot)
  const px = x * c - y * s
  const py = x * s + y * c
  // Approximate: normalized radius error scaled back to unit space.
  const r = Math.hypot(px / rx, py / ry)
  return Math.abs(r - 1) * Math.min(rx, ry)
}

function roundedBoxDist(x, y, half, radius) {
  const qx = Math.abs(x) - (half - radius)
  const qy = Math.abs(y) - (half - radius)
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius
}

/**
 * Colour at a unit-space point.
 * @param padded  maskable icons keep art inside the safe zone (~80%)
 */
function sample(x, y, padded) {
  // Artwork scale. The widest ring has rx 0.86 in art space, so the
  // scale has to keep 0.86 * k inside the 0.5 half-tile or the ellipses
  // clip against the edges and read as an accident. 0.50 leaves a small
  // margin; the maskable variant tucks further in because Android crops
  // it to an arbitrary shape and only the inner ~80% is guaranteed.
  const k = padded ? 0.40 : 0.50
  const ax = x / k
  const ay = y / k

  let col = null

  // Atom nucleus
  const nucleus = Math.hypot(ax, ay) - 0.17
  if (nucleus < 0) col = HOT

  // Three orbital rings at 0°, 60°, 120°
  if (!col) {
    const w = 0.06
    for (const rot of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const d = ellipseRingDist(ax, ay, 0.86, 0.36, rot)
      if (d < w) {
        // Fade the ring toward its thin edge for a drawn-line feel
        col = mix(CORE, HOT, Math.max(0, 1 - d / w) * 0.5)
        break
      }
    }
  }

  return col
}

function render(size, { padded = false, circle = false } = {}) {
  const rgba = new Uint8Array(size * size * 4)
  const SS = 3           // supersampling grid per axis
  const half = 0.5

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // unit space: -0.5 .. 0.5
          const x = (px + (sx + 0.5) / SS) / size - half
          const y = (py + (sy + 0.5) / SS) / size - half

          // Tile shape
          let inside
          if (circle) {
            inside = Math.hypot(x, y) <= half
          } else if (padded) {
            inside = true                       // maskable: fill the canvas
          } else {
            inside = roundedBoxDist(x, y, half, 0.22) <= 0
          }
          if (!inside) continue

          // Background: subtle radial lift from bg to panel
          const rad = Math.min(1, Math.hypot(x, y) / half)
          let c = mix(PANEL, BG, rad * 0.9)

          const art = sample(x, y, padded)
          if (art) c = art

          r += c[0]; g += c[1]; b += c[2]; a += 255
        }
      }

      const n = SS * SS
      const i = (py * size + px) * 4
      // Divide colour by the covered-sample count so edge pixels keep
      // their hue instead of being dragged toward black.
      const cov = a / 255
      if (cov > 0) {
        rgba[i]     = Math.round(r / cov)
        rgba[i + 1] = Math.round(g / cov)
        rgba[i + 2] = Math.round(b / cov)
      }
      rgba[i + 3] = Math.round(a / n)
    }
  }
  return encodePng(size, rgba)
}

mkdirSync(OUT, { recursive: true })

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  // Maskable: art inside the safe zone, full-bleed background, because
  // Android crops this one to whatever shape the launcher wants.
  ['icon-maskable-512.png', 512, { padded: true }],
  // Apple touch icons are composited on an opaque square with the
  // system's own rounding, so no transparent corners.
  ['apple-touch-icon.png', 180, { padded: true }],
  ['favicon-32.png', 32, { circle: true }],
]

for (const [name, size, opts] of targets) {
  const png = render(size, opts)
  writeFileSync(join(OUT, name), png)
  console.log(`  ${name.padEnd(26)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} kB`)
}
console.log('\nIcons written to public/')
