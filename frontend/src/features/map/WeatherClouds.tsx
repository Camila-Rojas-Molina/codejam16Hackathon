// Soft, see-through cumulus clouds over the 3D map, driven by Montréal's real weather (Open-Meteo, no key):
// more clouds when it's overcast (always a couple so the sky isn't empty), drifting with the
// real wind, each casting a soft shadow on the city. They pan with the map (a little slower,
// as they sit above it), grow as you zoom in and fade out before street level, so they never
// hide a pin. If the weather call fails, a light default sky is shown instead.
// Drawn in the map's canvas container under the markers, with pointer-events off.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { prefersReducedMotion } from './camera'
import { MONTREAL_CENTER } from './geo'

type Weather = { cover: number; windKmh: number; windFromDeg: number; live: boolean }

/** Used when the weather service is unreachable or rate-limited: a light sky, westerly breeze. */
const FALLBACK: Weather = { cover: 35, windKmh: 12, windFromDeg: 250, live: false }

const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${MONTREAL_CENTER.lat}&longitude=${MONTREAL_CENTER.lng}` +
  '&current=cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto'

let cached: Promise<Weather> | null = null
function fetchWeather(): Promise<Weather> {
  cached ??= fetch(WEATHER_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const c = j?.current
      if (!c || typeof c.cloud_cover !== 'number') return FALLBACK
      return { cover: c.cloud_cover, windKmh: c.wind_speed_10m ?? 10, windFromDeg: c.wind_direction_10m ?? 270, live: true }
    })
    .catch(() => FALLBACK)
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

type Cloud = { x: number; y: number; scale: number; speed: number; src: string; shadow: string }

function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

/** Canvas size of one cloud image (drawn once, then only moved). */
const CW = 360
const CH = 220

type Puff = { x: number; y: number; r: number }

/** A cumulus cluster: a flat-ish base, a towering rounded top, small puffs on the edges. */
function cloudPuffs(rnd: () => number): Puff[] {
  const puffs: Puff[] = []
  const base = CH * 0.68
  const width = CW * (0.42 + rnd() * 0.14)
  const towers = 2 + Math.floor(rnd() * 3)
  for (let t = 0; t < towers; t++) {
    const tx = CW / 2 + (t / Math.max(1, towers - 1) - 0.5) * width * 0.75 + (rnd() - 0.5) * 20
    const th = 45 + rnd() * 55 * (1 - Math.abs(t / Math.max(1, towers - 1) - 0.5))
    for (let i = 0; i < 9; i++) {
      const up = rnd()
      puffs.push({ x: tx + (rnd() - 0.5) * 70, y: base - up * th, r: 26 + (1 - up) * 22 + rnd() * 12 })
    }
  }
  // Base layer and ragged edges.
  for (let i = 0; i < 16; i++) puffs.push({ x: CW / 2 + (rnd() - 0.5) * width, y: base - rnd() * 18, r: 16 + rnd() * 18 })
  for (let i = 0; i < 14; i++) puffs.push({ x: CW / 2 + (rnd() - 0.5) * width * 1.15, y: base - 10 - rnd() * 80, r: 7 + rnd() * 10 })
  // Keep every puff inside the canvas so no cloud gets a cut edge.
  for (const p of puffs) {
    p.r = Math.min(p.r, CH * 0.3)
    p.x = Math.max(p.r + 34, Math.min(CW - p.r - 34, p.x))
    p.y = Math.max(p.r + 30, Math.min(CH - p.r * 1.4 - 30, p.y))
  }
  return puffs
}

function soft(ctx: CanvasRenderingContext2D, p: Puff, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`)
  g.addColorStop(0.55, `rgba(${rgb}, ${alpha * 0.75})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
  ctx.fill()
}

/** Paints a soft, see-through cumulus (grey belly, sunlit top) and its blurred ground shadow. */
function renderCloud(seed: number): { src: string; shadow: string } | null {
  if (typeof document === 'undefined') return null
  const rnd = seeded(seed)
  const puffs = cloudPuffs(rnd)
  const canvas = document.createElement('canvas')
  canvas.width = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // Shaded underside first, then the lit body a little higher, then bright highlights on top.
  for (const p of puffs) soft(ctx, { x: p.x + 4, y: p.y + p.r * 0.35, r: p.r * 1.05 }, '150, 162, 178', 0.5)
  for (const p of puffs) soft(ctx, p, '246, 248, 252', 0.8)
  for (const p of puffs) if (p.r > 22) soft(ctx, { x: p.x - p.r * 0.2, y: p.y - p.r * 0.3, r: p.r * 0.6 }, '255, 255, 255', 0.7)
  const src = canvas.toDataURL()

  ctx.clearRect(0, 0, CW, CH)
  ctx.filter = 'blur(10px)'
  for (const p of puffs) soft(ctx, p, '20, 32, 44', 0.5)
  ctx.filter = 'none'
  return { src, shadow: canvas.toDataURL() }
}

function makeClouds(count: number, w: number, h: number): Cloud[] {
  const rnd = seeded(42)
  const out: Cloud[] = []
  for (let i = 0; i < count; i++) {
    const img = renderCloud(1000 + i * 7919)
    if (!img) continue
    out.push({ x: rnd() * (w + 2 * MARGIN), y: rnd() * (h + 2 * MARGIN), scale: 0.45 + rnd() * 0.45, speed: 0.7 + rnd() * 0.6, ...img })
  }
  return out
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
      if (!alive) return
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

  const cell = { position: 'absolute', left: 0, top: 0, width: CW, height: CH, transformOrigin: `${CW / 2}px ${CH / 2}px`, willChange: 'transform' } as const
  return createPortal(
    <div
      ref={layer}
      aria-hidden="true"
      title={weather.live ? `Live weather: ${Math.round(weather.cover)}% cloud cover, wind ${Math.round(weather.windKmh)} km/h` : 'Weather unavailable: showing a light default sky'}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0, transition: 'opacity 200ms' }}
    >
      {clouds.map((c, i) => (
        <div key={`s${i}`} ref={(el) => void (shadowEls.current[i] = el)} style={{ ...cell, opacity: 0.22 }}>
          <img src={c.shadow} alt="" width={CW} height={CH} draggable={false} />
        </div>
      ))}
      {clouds.map((c, i) => (
        <div key={`c${i}`} ref={(el) => void (cloudEls.current[i] = el)} style={{ ...cell, opacity: 0.9 }}>
          <img src={c.src} alt="" width={CW} height={CH} draggable={false} />
        </div>
      ))}
    </div>,
    map.getCanvasContainer(),
  )
}
