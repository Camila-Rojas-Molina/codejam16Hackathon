// Paper-cut clouds over the 3D map, driven by Montréal's real weather (Open-Meteo, no key):
// more clouds when it's overcast (always a couple so the sky isn't empty), drifting with the
// real wind, each casting a soft shadow on the city. They pan with the map (a little slower,
// as they sit above it), grow as you zoom in and fade out before street level, so they never
// hide a pin. If the weather call fails, no clouds: the map is unaffected.
// Drawn in the map's canvas container under the markers, with pointer-events off.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { prefersReducedMotion } from './camera'
import { MONTREAL_CENTER } from './geo'

type Weather = { cover: number; windKmh: number; windFromDeg: number }

const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${MONTREAL_CENTER.lat}&longitude=${MONTREAL_CENTER.lng}` +
  '&current=cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto'

let cached: Promise<Weather | null> | null = null
function fetchWeather(): Promise<Weather | null> {
  cached ??= fetch(WEATHER_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const c = j?.current
      if (!c || typeof c.cloud_cover !== 'number') return null
      return { cover: c.cloud_cover, windKmh: c.wind_speed_10m ?? 10, windFromDeg: c.wind_direction_10m ?? 270 }
    })
    .catch(() => null)
  return cached
}

const MIN_CLOUDS = 2
const MAX_CLOUDS = 8
/** Fully visible up to FADE_START, gone by FADE_END. */
const FADE_START = 13.2
const FADE_END = 15.2
/** Clouds sit above the ground, so they pan a bit slower than the map. */
const PARALLAX = 0.75
const MARGIN = 320

type Cloud = { x: number; y: number; scale: number; puffs: [number, number, number][]; speed: number }

function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

function makeClouds(count: number, w: number, h: number): Cloud[] {
  const rnd = seeded(42)
  return Array.from({ length: count }, () => {
    const n = 4 + Math.floor(rnd() * 3)
    const puffs: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const r = 26 + rnd() * 18 + Math.sin(t * Math.PI) * 22
      puffs.push([30 + t * 140, 70 - Math.sin(t * Math.PI) * 22 - rnd() * 10, r])
    }
    return { x: rnd() * (w + 2 * MARGIN), y: rnd() * (h + 2 * MARGIN), scale: 0.7 + rnd() * 0.7, puffs, speed: 0.7 + rnd() * 0.6 }
  })
}

function CloudShape({ puffs, shadow }: { puffs: Cloud['puffs']; shadow?: boolean }) {
  if (shadow) {
    return (
      <svg width="200" height="120" viewBox="0 0 200 120" style={{ overflow: 'visible', filter: 'blur(10px)' }}>
        {puffs.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} style={{ fill: 'var(--color-ink)' }} />)}
        <rect x="30" y="60" width="140" height="30" rx="15" style={{ fill: 'var(--color-ink)' }} />
      </svg>
    )
  }
  // Outline first, fill on top: one inked edge around the whole union of puffs.
  return (
    <svg width="200" height="120" viewBox="0 0 200 120" style={{ overflow: 'visible' }}>
      <g style={{ fill: 'var(--color-ink)', stroke: 'var(--color-ink)', strokeWidth: 5 }}>
        {puffs.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
        <rect x="30" y="60" width="140" height="30" rx="15" />
      </g>
      <g style={{ fill: 'var(--color-sheet)' }}>
        {puffs.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
        <rect x="30" y="60" width="140" height="30" rx="15" />
      </g>
      <g style={{ fill: 'var(--color-paper)', opacity: 0.9 }}>
        {puffs.map(([cx, cy, r], i) => <circle key={i} cx={cx + r * 0.15} cy={cy + r * 0.25} r={r * 0.7} />)}
      </g>
    </svg>
  )
}

export default function WeatherClouds({ map }: { map: MapLibreMap }) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [clouds, setClouds] = useState<Cloud[]>([])
  const layer = useRef<HTMLDivElement>(null)
  const cloudEls = useRef<(HTMLDivElement | null)[]>([])
  const shadowEls = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let alive = true
    fetchWeather().then((w) => {
      if (!alive || !w) return
      const count = Math.max(MIN_CLOUDS, Math.round((w.cover / 100) * MAX_CLOUDS))
      const c = map.getContainer()
      setClouds(makeClouds(count, c.clientWidth, c.clientHeight))
      setWeather(w)
    })
    return () => {
      alive = false
    }
  }, [map])

  useEffect(() => {
    if (!weather || clouds.length === 0) return
    const reduced = prefersReducedMotion()
    // Wind blows FROM windFromDeg; clouds move the other way. Screen speed in px/s, gentle.
    const toward = ((weather.windFromDeg + 180) * Math.PI) / 180
    const pxPerSec = 6 + Math.min(weather.windKmh, 40) * 0.6
    const anchor: [number, number] = [MONTREAL_CENTER.lng, MONTREAL_CENTER.lat]
    const start = map.project(anchor)
    let last = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const el = map.getContainer()
      const w = el.clientWidth + 2 * MARGIN
      const h = el.clientHeight + 2 * MARGIN
      const zoom = map.getZoom()
      const fade = Math.max(0, Math.min(1, (FADE_END - zoom) / (FADE_END - FADE_START)))
      if (layer.current) layer.current.style.opacity = String(fade)
      if (fade > 0) {
        // Wind direction is geographic; turn it by the map's heading for the screen.
        const a = toward - (map.getBearing() * Math.PI) / 180
        const vx = Math.sin(a) * pxPerSec
        const vy = -Math.cos(a) * pxPerSec
        const p = map.project(anchor)
        const panX = (p.x - start.x) * PARALLAX
        const panY = (p.y - start.y) * PARALLAX
        const zoomScale = Math.pow(2, (zoom - 12) * 0.6)
        // Shadows fall further from the cloud when the map is tilted.
        const shadowDy = 50 + map.getPitch() * 1.2
        clouds.forEach((c, i) => {
          if (!reduced) {
            c.x += vx * c.speed * dt
            c.y += vy * c.speed * dt
          }
          const x = (((c.x + panX) % w) + w) % w - MARGIN
          const y = (((c.y + panY) % h) + h) % h - MARGIN
          const s = c.scale * zoomScale
          const cloud = cloudEls.current[i]
          const shadow = shadowEls.current[i]
          if (cloud) cloud.style.transform = `translate(${x}px, ${y}px) scale(${s})`
          if (shadow) shadow.style.transform = `translate(${x + 30 * s}px, ${y + shadowDy * s}px) scale(${s})`
        })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [map, weather, clouds])

  if (!weather || clouds.length === 0) return null

  const cell = { position: 'absolute', left: 0, top: 0, transformOrigin: '100px 60px', willChange: 'transform' } as const
  return createPortal(
    <div
      ref={layer}
      aria-hidden="true"
      title={`Live weather: ${Math.round(weather.cover)}% cloud cover, wind ${Math.round(weather.windKmh)} km/h`}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0, transition: 'opacity 200ms' }}
    >
      {clouds.map((c, i) => (
        <div key={`s${i}`} ref={(el) => void (shadowEls.current[i] = el)} style={{ ...cell, opacity: 0.16 }}>
          <CloudShape puffs={c.puffs} shadow />
        </div>
      ))}
      {clouds.map((c, i) => (
        <div key={`c${i}`} ref={(el) => void (cloudEls.current[i] = el)} style={{ ...cell, opacity: 0.88 }}>
          <CloudShape puffs={c.puffs} />
        </div>
      ))}
    </div>,
    map.getCanvasContainer(),
  )
}
