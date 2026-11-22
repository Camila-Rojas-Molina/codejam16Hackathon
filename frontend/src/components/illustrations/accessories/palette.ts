// Shared colours and outline helper for the wearable drawings in this folder.
//
// The drawings are printed artwork laid over the character pictures, so they keep their DAY colours
// in both themes (the --day-* palette values) and use the characters' own near-black outline,
// which is part of the picture, not a theme colour.

/** The characters' outline colour (sampled from the avatar PNGs: #1d1717…#2f2f2f). */
export const LINE = '#262020'

export const C = {
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

/** Outline props at stroke width `sw` (drawing units). */
export const line = (sw: number) => ({ stroke: LINE, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })

/** A light highlight stroke (printed shine), `k` × the outline width. */
export const shine = (sw: number, k = 1) => ({ fill: 'none', stroke: C.sheet, strokeWidth: sw * k, strokeLinecap: 'round' as const })

/** Points of a 5-pointed star centred on (x, y) with outer radius r, as an SVG path. */
export function starPath(x: number, y: number, r: number, inner = 0.45, rot = -90): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180
    const rr = i % 2 ? r * inner : r
    pts.push(`${(x + rr * Math.cos(a)).toFixed(2)} ${(y + rr * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join(' L')} Z`
}

/** A heart centred on (x, y), `w` wide, as an SVG path (point down). */
export function heartPath(x: number, y: number, w: number): string {
  const s = w / 2
  const f = (dx: number, dy: number) => `${(x + dx * s).toFixed(2)} ${(y + dy * s).toFixed(2)}`
  return `M${f(0, 0.95)} C${f(-0.55, 0.55)} ${f(-1, 0.15)} ${f(-1, -0.3)} C${f(-1, -0.8)} ${f(-0.4, -1)} ${f(0, -0.55)} C${f(0.4, -1)} ${f(1, -0.8)} ${f(1, -0.3)} C${f(1, 0.15)} ${f(0.55, 0.55)} ${f(0, 0.95)} Z`
}

/** Points along a cubic Bézier (p0..p3), `n` of them, evenly in t. */
export function alongCubic(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], n: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const u = 1 - t
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    out.push([x, y])
  }
  return out
}
