// Things worn at the sides of the head (slot 'ears') and in the hair (slot 'hair').
//
// 'ears' local space: (0, 0) is the midpoint between the two ear spots, which sit at x = ±46 on the
// line y = 0. Headbands arch over the head up to about y = −50.
// 'hair' local space: (0, 0) is where the clip holds; the piece is about 100 units across.
import { C, line, shine, starPath } from './palette'
import { Band } from './HatArt'

/** A fluffy round muff (scalloped circle) centred on (x, y). */
function Fluff({ x, y, r, fill, sw }: { x: number; y: number; r: number; fill: string; sw: number }) {
  const n = 11
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const px = x + r * Math.cos(a)
    const py = y + r * Math.sin(a)
    if (i === 0) d += `M${px.toFixed(2)} ${py.toFixed(2)}`
    else {
      const am = ((i - 0.5) / n) * Math.PI * 2
      const cx = x + r * 1.28 * Math.cos(am)
      const cy = y + r * 1.28 * Math.sin(am)
      d += ` Q${cx.toFixed(2)} ${cy.toFixed(2)} ${px.toFixed(2)} ${py.toFixed(2)}`
    }
  }
  return <path d={`${d} Z`} fill={fill} {...line(sw)} />
}

export function EarsArt({ art, sw }: { art: string; sw: number }) {
  const s = line(sw)
  switch (art) {
    case 'headphones':
      return (
        <g>
          <Band d="M-45 -10 C-50 -72 50 -72 45 -10" fill={C.ink} sw={sw} k={2.6} />
          <path d="M-41 -44 C-34 -56 -20 -61 -8 -62" fill="none" stroke={C.teal} strokeWidth={sw * 1} strokeLinecap="round" />
          {[-1, 1].map((k) => (
            <g key={k} transform={`scale(${k} 1)`}>
              <rect x="-49" y="-20" width="6" height="12" rx="2" fill={C.sheet} {...s} />
              <rect x="-44" y="-13" width="10" height="30" rx="4" fill={C.ink} {...s} />
              <rect x="-57" y="-16" width="16" height="36" rx="7" fill={C.saffron} {...s} />
              <circle cx="-49" cy="2" r="4" fill={C.sienna} {...line(sw * 0.8)} />
              <path d="M-54 -10 L-54 -4" {...shine(sw)} />
            </g>
          ))}
        </g>
      )
    case 'earmuffs':
      return (
        <g>
          <Band d="M-45 -8 C-50 -66 50 -66 45 -8" fill={C.teal} sw={sw} k={1.8} />
          {[-1, 1].map((k) => (
            <g key={k} transform={`scale(${k} 1)`}>
              <Fluff x={-46} y={2} r={14} fill={C.sheet} sw={sw} />
              <circle cx="-46" cy="2" r="7" fill={C.tealSoft} {...line(sw * 0.7)} />
              <path d="M-52 -6 C-50 -8 -48 -9 -46 -9" fill="none" stroke={C.paper} strokeWidth={sw * 1.2} strokeLinecap="round" />
            </g>
          ))}
        </g>
      )
    case 'hoop-earrings':
      return (
        <g>
          {[-1, 1].map((k) => (
            <g key={k} transform={`scale(${k} 1)`}>
              <circle cx="-46" cy="11" r="9" fill="none" {...line(sw * 3)} />
              <circle cx="-46" cy="11" r="9" fill="none" stroke={C.saffron} strokeWidth={sw * 1.3} />
              <circle cx="-46" cy="0" r="2.6" fill={C.saffron} {...line(sw * 0.7)} />
              <circle cx="-46" cy="20.5" r="3.2" fill={C.sienna} {...line(sw * 0.7)} />
            </g>
          ))}
        </g>
      )
    default:
      return null
  }
}

export function HairArt({ art, sw }: { art: string; sw: number }) {
  const s = line(sw)
  switch (art) {
    case 'hair-bow':
      return (
        <g>
          <path d="M-3 6 C-8 20 -14 32 -20 44 L-9 40 L-5 47 C-1 32 1 20 1 8 Z" fill={C.sienna} {...s} />
          <path d="M3 6 C8 20 14 32 20 44 L9 40 L5 47 C1 32 -1 20 -1 8 Z" fill={C.sienna} {...s} />
          <path d="M-5 0 C-20 -26 -50 -28 -48 -3 C-48 18 -22 20 -5 0 Z" fill={C.sienna} {...s} />
          <path d="M5 0 C20 -26 50 -28 48 -3 C48 18 22 20 5 0 Z" fill={C.sienna} {...s} />
          {[
            [-36, -10],
            [-24, 4],
            [-38, 6],
            [34, -12],
            [24, 4],
            [38, 4],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="2.8" fill={C.sheet} />
          ))}
          <rect x="-8" y="-10" width="16" height="20" rx="5" fill={C.sienna} {...s} />
          <path d="M-3 -6 L-3 -2" {...shine(sw)} />
        </g>
      )
    case 'star-clips':
      return (
        <g>
          <path d="M-44 20 L4 8" fill="none" {...line(sw * 2.6)} />
          <path d="M-44 20 L4 8" fill="none" stroke={C.ink} strokeWidth={sw * 1} strokeLinecap="round" />
          <path d={starPath(12, -4, 30, 0.5, -80)} fill={C.saffron} {...s} />
          <path d="M6 -22 L9 -14" {...shine(sw, 1.1)} />
          <path d={starPath(-32, 16, 15, 0.5, -100)} fill={C.teal} {...s} />
          <path d="M-36 7 L-35 11" {...shine(sw)} />
        </g>
      )
    case 'hibiscus':
      return (
        <g>
          <path d="M-14 14 C-30 10 -46 18 -50 30 C-36 36 -22 30 -14 14 Z" fill={C.teal} {...s} />
          <path d="M14 18 C24 28 40 30 50 22 C42 10 26 8 14 18 Z" fill={C.teal} {...s} />
          <path d="M-46 28 C-36 26 -24 22 -16 16 M46 22 C38 20 26 18 16 19" fill="none" {...line(sw * 0.6)} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-17" rx="14" ry="18" transform={`rotate(${a})`} fill={C.sienna} {...s} />
          ))}
          <circle cx="0" cy="0" r="8" fill={C.siennaDeep} {...line(sw * 0.8)} />
          <path d="M0 0 C6 -8 12 -14 18 -24" fill="none" {...line(sw * 2.4)} />
          <path d="M0 0 C6 -8 12 -14 18 -24" fill="none" stroke={C.saffron} strokeWidth={sw * 1} strokeLinecap="round" />
          {[
            [18, -25],
            [22, -21],
            [14, -27],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={C.saffron} {...line(sw * 0.6)} />
          ))}
          <path d="M-22 -18 C-20 -24 -16 -28 -12 -30" {...shine(sw)} />
        </g>
      )
    default:
      return null
  }
}
