import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/store'
import { Icon } from '@/UI/Icon'
import type { MapCard } from '@/types'
import styles from './CardTypes.module.css'

// ─────────────────────────────────────────────────────────────
// MAP CARD — Leaflet slippy map with saved pins
//
// Three things make an interactive map behave inside this canvas:
//
//   1. EVENT ISOLATION. The canvas has native (non-React) wheel and
//      mousedown listeners for zoom and card-drag. React's
//      stopPropagation can't stop a native listener on an ancestor,
//      so Leaflet's own DomEvent helpers are used — they stop the
//      NATIVE event, which is what actually works here.
//   2. CSS SCALE. The world is rendered with a scale() transform.
//      Leaflet ≥1.7 reads the container's bounding rect vs its offset
//      size to recover the scale factor, so clicks land where you
//      expect at any zoom level.
//   3. STORE ECHO. Map moves write center/zoom back to the card, but
//      only when they actually changed — otherwise Leaflet's own
//      init-time moveend would fire a persist on every mount.
//
// Only the map view and the pins are stored — tiles stream from
// OpenStreetMap, so a board with maps still opens offline, just with
// blank tiles.
// ─────────────────────────────────────────────────────────────

const MIN_HEIGHT = 160
const MAX_HEIGHT = 900

interface Props { card: MapCard }

export function MapCardContent({ card }: Props) {
  const updateCard = useCanvasStore(s => s.updateCard)

  const hostRef  = useRef<HTMLDivElement>(null)
  const mapRef   = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  // Handlers are registered once on mount, so they read live content
  // through a ref rather than closing over a stale render.
  const contentRef = useRef(card.content)
  contentRef.current = card.content

  const [arming, setArming]       = useState(false)
  const armingRef                 = useRef(false)
  const [query, setQuery]         = useState('')
  const [searching, setSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState('')

  const { pins, height } = card.content

  const patch = (next: Partial<MapCard['content']>) =>
    updateCard(card.id, { content: { ...contentRef.current, ...next } })

  // ── Create the map once ──
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const { center, zoom } = contentRef.current
    const map = L.map(host, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      // Leaflet's own attribution control is kept — OSM tile usage
      // requires visible attribution.
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // Keep wheel-zoom and drags inside the map instead of zooming or
    // dragging the whole canvas.
    L.DomEvent.disableScrollPropagation(host)
    L.DomEvent.disableClickPropagation(host)

    map.on('moveend zoomend', () => {
      const c = map.getCenter()
      const z = map.getZoom()
      const prev = contentRef.current
      const same =
        Math.abs(prev.center.lat - c.lat) < 1e-9 &&
        Math.abs(prev.center.lng - c.lng) < 1e-9 &&
        prev.zoom === z
      if (same) return
      updateCard(card.id, {
        content: { ...prev, center: { lat: c.lat, lng: c.lng }, zoom: z },
      })
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!armingRef.current) return
      armingRef.current = false
      setArming(false)
      const prev = contentRef.current
      updateCard(card.id, {
        content: {
          ...prev,
          pins: [...prev.pins, {
            id: nanoid(),
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            label: '',
          }],
        },
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Mirror pins into the marker layer ──
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    for (const pin of pins) {
      L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
          className: styles.mapPinIcon,
          html: '<i></i>',
          iconSize: [16, 16],
          iconAnchor: [8, 16],
        }),
        title: pin.label || undefined,
        keyboard: false,
      }).addTo(layer)
    }
  }, [pins])

  // Leaflet caches its container size; tell it when the card resizes.
  useEffect(() => {
    mapRef.current?.invalidateSize()
  }, [height, card.width])

  // ── Place search (Nominatim) ──
  // One request per explicit Enter/press — never per keystroke — which
  // keeps this inside OSM's usage policy.
  async function search() {
    const q = query.trim()
    if (!q || searching) return
    setSearching(true)
    setSearchMsg('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
      )
      if (!res.ok) throw new Error('bad response')
      const hits: Array<{ lat: string; lon: string; display_name: string }> = await res.json()
      if (hits.length === 0) {
        setSearchMsg(`No match for “${q}”`)
        return
      }
      const { lat, lon, display_name } = hits[0]
      const point: [number, number] = [parseFloat(lat), parseFloat(lon)]
      mapRef.current?.setView(point, 12)
      const prev = contentRef.current
      updateCard(card.id, {
        content: {
          ...prev,
          pins: [...prev.pins, {
            id: nanoid(),
            lat: point[0],
            lng: point[1],
            label: display_name.split(',')[0],
          }],
        },
      })
      setQuery('')
    } catch {
      setSearchMsg('Search is unavailable offline.')
    } finally {
      setSearching(false)
    }
  }

  const toggleArm = () => {
    const next = !armingRef.current
    armingRef.current = next
    setArming(next)
  }

  const removePin = (id: string) => patch({ pins: pins.filter(p => p.id !== id) })

  const labelPin = (id: string, label: string) =>
    patch({ pins: pins.map(p => (p.id === id ? { ...p, label } : p)) })

  const flyTo = (lat: number, lng: number) =>
    mapRef.current?.setView([lat, lng], Math.max(mapRef.current.getZoom(), 10))

  // ── Height grip ──
  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (card.locked) return
    const startY = e.clientY
    const startH = height
    const { zoom } = useCanvasStore.getState().camera

    const move = (ev: PointerEvent) => {
      const next = Math.round(
        Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + (ev.clientY - startY) / zoom))
      )
      patch({ height: next })
    }
    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      mapRef.current?.invalidateSize()
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  return (
    <div className={styles.map} onMouseDown={e => e.stopPropagation()}>
      <div className={styles.mapBar}>
        <input
          className={styles.mapSearch}
          placeholder="Search a place…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') search()
            e.stopPropagation()
          }}
        />
        <button
          className={styles.mapBtn}
          onClick={search}
          disabled={searching || !query.trim()}
          title="Find this place and pin it"
        >{searching ? '…' : 'Find'}</button>
        <button
          className={`${styles.mapBtn} ${arming ? styles.mapBtnOn : ''}`}
          onClick={toggleArm}
          title={arming ? 'Click the map to drop a pin' : 'Drop a pin by clicking the map'}
        >
          <Icon name="pin" size={13} />
        </button>
      </div>

      <div
        ref={hostRef}
        className={`${styles.mapHost} ${arming ? styles.mapHostArmed : ''}`}
        style={{ height }}
      />

      {searchMsg && <p className={styles.mapMsg}>{searchMsg}</p>}

      {pins.length > 0 && (
        <ul className={styles.mapPins}>
          {pins.map(pin => (
            <li key={pin.id} className={styles.mapPinRow}>
              <button
                className={styles.mapPinGo}
                onClick={() => flyTo(pin.lat, pin.lng)}
                title="Center on this pin"
              ><Icon name="pin" size={12} /></button>
              <input
                className={styles.mapPinLabel}
                placeholder={`${pin.lat.toFixed(3)}, ${pin.lng.toFixed(3)}`}
                value={pin.label}
                onChange={e => labelPin(pin.id, e.target.value)}
                onKeyDown={e => e.stopPropagation()}
              />
              <button
                className={styles.mapPinDel}
                onClick={() => removePin(pin.id)}
                title="Remove pin"
                aria-label="Remove pin"
              ><Icon name="close" size={11} /></button>
            </li>
          ))}
        </ul>
      )}

      {!card.locked && (
        <div
          className={styles.mapResize}
          onPointerDown={onResizeDown}
          title="Drag to resize"
        />
      )}
    </div>
  )
}
