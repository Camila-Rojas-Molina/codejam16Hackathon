// Shared helpers for the backdrop scenes (no React components here, just data and path maths).
import type { ReactNode } from 'react'

/** Makes a document-unique id for a <defs> entry of one rendered backdrop. */
export type Uid = (key: string) => string

export type SceneDef = {
  draw: (u: Uid) => ReactNode
  /** Dark scene: the print grain is light speckles instead of ink ones. */
  dark?: boolean
  /** Uses the subtle CSS motion classes (mbd-*), only played when motion is allowed. */
  motion?: boolean
}

/**
 * The MIGO day palette. Backdrops are printed artwork: they keep their day colours in both themes,
 * so they use the --day-* values rather than the theme tokens.
 */
export const D = {
  ink: 'var(--day-ink)',
  paper: 'var(--day-paper)',
  sheet: 'var(--day-sheet)',
  saffron: 'var(--day-saffron)',
  saffronSoft: 'var(--day-saffron-soft)',
  teal: 'var(--day-teal)',
  tealDeep: 'var(--day-teal-deep)',
  tealSoft: 'var(--day-teal-soft)',
  sandy: 'var(--day-sandy)',
  sandySoft: 'var(--day-sandy-soft)',
  sienna: 'var(--day-sienna)',
  siennaDeep: 'var(--day-sienna-deep)',
  siennaSoft: 'var(--day-sienna-soft)',
} as const

/** Deterministic random numbers (mulberry32), so every render draws the same scene. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Round to 2 decimals (keeps path strings short). */
export const fx = (n: number) => Math.round(n * 100) / 100

type Pt = [number, number]

/** A straight-edged ridge from the bottom-left, through `pts`, down to the bottom-right. */
export function ridge(pts: Pt[], base = 100) {
  const first = pts[0]
  const last = pts[pts.length - 1]
  return `M${first[0]} ${base} ${pts.map(([x, y]) => `L${fx(x)} ${fx(y)}`).join(' ')} L${last[0]} ${base}Z`
}

/** Smooth rolling hills through `pts` (curves through the midpoints), closed at `base`. */
export function hills(pts: Pt[], base = 100) {
  let d = `M${pts[0][0]} ${base} L${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    d += ` Q${x} ${y} ${fx((x + nx) / 2)} ${fx((y + ny) / 2)}`
  }
  const last = pts[pts.length - 1]
  return `${d} L${last[0]} ${last[1]} L${last[0]} ${base}Z`
}

/** An open wavy line along y (for water ripples and grooves). */
export function wave(y: number, amp: number, len: number, x0 = -4, x1 = 104) {
  let d = `M${x0} ${y}`
  for (let x = x0; x < x1; x += len) d += ` q${fx(len / 4)} ${-amp} ${fx(len / 2)} 0 t${fx(len / 2)} 0`
  return d
}

/** A closed blob whose radius wobbles: r(θ) = r + amp·sin(k·θ + phase). */
export function wobble(cx: number, cy: number, r: number, amp: number, k: number, phase = 0, steps = 96) {
  const pts: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const rr = r + amp * Math.sin(k * t + phase)
    pts.push(`${fx(cx + rr * Math.cos(t))} ${fx(cy + rr * Math.sin(t))}`)
  }
  return `M${pts.join(' L')}Z`
}

/** A four-point sparkle centred on (cx, cy). */
export function sparkle(cx: number, cy: number, r: number) {
  return `M${cx} ${fx(cy - r)} Q${cx} ${cy} ${fx(cx + r)} ${cy} Q${cx} ${cy} ${cx} ${fx(cy + r)} Q${cx} ${cy} ${fx(cx - r)} ${cy} Q${cx} ${cy} ${cx} ${fx(cy - r)}Z`
}

/** A five-point star. */
export function star5(cx: number, cy: number, r: number, inner = 0.45) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * inner : r
    pts.push(`${fx(cx + rr * Math.cos(a))} ${fx(cy + rr * Math.sin(a))}`)
  }
  return `M${pts.join(' L')}Z`
}

/** Random points inside a box, skipping a central ellipse (the avatar sits there). */
export function scatter(seed: number, n: number, opts: { x0?: number; x1?: number; y0?: number; y1?: number; hole?: [number, number, number, number] } = {}) {
  const { x0 = 0, x1 = 100, y0 = 0, y1 = 100, hole } = opts
  const rand = rng(seed)
  const out: { x: number; y: number; t: number }[] = []
  let guard = 0
  while (out.length < n && guard++ < n * 40) {
    const x = x0 + rand() * (x1 - x0)
    const y = y0 + rand() * (y1 - y0)
    const t = rand()
    if (hole) {
      const [hx, hy, rx, ry] = hole
      if (((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 < 1) continue
    }
    out.push({ x: fx(x), y: fx(y), t })
  }
  return out
}

/** The print grain: a tile of tiny speckles laid over the whole scene. */
export const GRAIN_SPECKS = (() => {
  const rand = rng(7)
  return Array.from({ length: 22 }, () => ({ x: fx(rand() * 18), y: fx(rand() * 18), r: fx(0.08 + rand() * 0.16), o: fx(0.25 + rand() * 0.6) }))
})()

/**
 * Motion for a few premium scenes. Scoped to `.mbd-live` (the <svg> gets it unless rendered
 * still) and only when the person hasn't asked for reduced motion. In SVG, px = user units.
 */
export const MOTION_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .mbd-live .mbd-tw { animation: mbd-tw 3.8s ease-in-out infinite; }
  .mbd-live .mbd-drift { animation: mbd-drift 26s ease-in-out infinite alternate; }
  .mbd-live .mbd-drift2 { animation: mbd-drift 34s ease-in-out infinite alternate-reverse; }
  .mbd-live .mbd-bob { animation: mbd-bob 7s ease-in-out infinite; }
  .mbd-live .mbd-fall { animation: mbd-fall 30s linear infinite; }
  .mbd-live .mbd-rise { animation: mbd-rise 26s linear infinite; }
  .mbd-live .mbd-glow { animation: mbd-glow 7s ease-in-out infinite alternate; }
  .mbd-live .mbd-flicker { animation: mbd-flicker 9s linear infinite; }
  .mbd-live .mbd-sway { animation: mbd-sway 6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 50% 100%; }
}
@keyframes mbd-tw { 0%, 100% { opacity: 1 } 50% { opacity: 0.2 } }
@keyframes mbd-drift { from { transform: translateX(-4px) } to { transform: translateX(4px) } }
@keyframes mbd-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2.2px) } }
@keyframes mbd-fall { from { transform: translateY(0) } to { transform: translateY(100px) } }
@keyframes mbd-rise { from { transform: translateY(0) } to { transform: translateY(-100px) } }
@keyframes mbd-glow { from { opacity: 0.45 } to { opacity: 1 } }
@keyframes mbd-flicker { 0%, 40%, 44%, 47%, 100% { opacity: 1 } 42%, 45.5% { opacity: 0.35 } }
@keyframes mbd-sway { from { transform: rotate(-3deg) } to { transform: rotate(3deg) } }
`
