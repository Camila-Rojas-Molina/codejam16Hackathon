// Hats & things worn on top of the head (slot 'head').
//
// Local space: (0, 0) is the centre of the line where the hat meets the head (the band / the
// inside of the brim). The hat grows upwards (negative y). The part that touches the head is about
// 64 units wide (x −32…32); brims reach x ±52. Floating pieces (halo, rain cloud) treat (0, 0) as
// the top of the head and hover above it.
import { C, LINE, line, shine, heartPath, starPath } from './palette'

/** A five-petal flower (flower crown, lei). */
export function Flower({ x, y, fill, sw, r = 5 }: { x: number; y: number; fill: string; sw: number; r?: number }) {
  const d = r * 1.3
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={x + d * Math.cos(((a - 90) * Math.PI) / 180)} cy={y + d * Math.sin(((a - 90) * Math.PI) / 180)} r={r} fill={fill} {...line(sw * 0.8)} />
      ))}
      <circle cx={x} cy={y} r={r * 0.72} fill={C.saffron} {...line(sw * 0.7)} />
    </g>
  )
}

/** A four-point sparkle. */
export function Sparkle({ x, y, r, fill = C.saffronSoft, sw }: { x: number; y: number; r: number; fill?: string; sw: number }) {
  const k = r * 0.22
  return <path d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`} fill={fill} {...line(sw * 0.7)} />
}

/** A band drawn as an outlined thick stroke (headbands, straps). */
export function Band({ d, fill, sw, k = 2 }: { d: string; fill: string; sw: number; k?: number }) {
  return (
    <g fill="none">
      <path d={d} stroke={LINE} strokeWidth={sw * (k + 2)} strokeLinecap="round" />
      <path d={d} stroke={fill} strokeWidth={sw * k} strokeLinecap="round" />
    </g>
  )
}

export function HatArt({ art, sw }: { art: string; sw: number }) {
  const s = line(sw)
  switch (art) {
    case 'explorer-hat':
      return (
        <g>
          <path d="M-30 -3 C-31 -46 31 -46 30 -3 Z" fill={C.saffron} {...s} />
          <path d="M-30.4 -15 C-10 -10 10 -10 30.4 -15 L30.2 -5 C10 0 -10 0 -30.2 -5 Z" fill={C.sienna} {...s} />
          <path d="M-52 0 C-34 -13 34 -13 52 0 C34 10 -34 10 -52 0 Z" fill={C.saffron} {...s} />
          <path d="M-18 -30 C-12 -36 -4 -37 2 -37" {...shine(sw)} />
        </g>
      )
    case 'beret':
      return (
        <g>
          <path d="M-46 0 C-54 -24 -12 -40 22 -36 C48 -32 54 -12 44 0 C16 8 -24 8 -46 0 Z" fill={C.sienna} {...s} />
          <path d="M3 -37 L5 -46" fill="none" {...s} />
          <path d="M-34 -14 C-28 -24 -14 -30 -2 -31" {...shine(sw)} />
        </g>
      )
    case 'party-hat':
      return (
        <g>
          <path d="M-21 0 L0 -54 L21 0 Q0 6 -21 0 Z" fill={C.teal} {...s} />
          <circle cx="-7" cy="-13" r="3.4" fill={C.saffron} />
          <circle cx="8" cy="-24" r="3.4" fill={C.sheet} />
          <circle cx="-2" cy="-36" r="3" fill={C.saffron} />
          <circle cx="9" cy="-7" r="3" fill={C.sheet} />
          <circle cx="0" cy="-57" r="6" fill={C.sienna} {...s} />
        </g>
      )
    case 'flower-crown':
      return (
        <g>
          <path d="M-50 2 C-34 -20 34 -20 50 2" fill="none" {...s} />
          <path d="M-34 -8 C-36 -14 -32 -18 -28 -18 M30 -10 C36 -14 38 -10 36 -6" fill="none" {...s} />
          <Flower x={-44} y={-1} fill={C.sheet} sw={sw} />
          <Flower x={-23} y={-13} fill={C.sienna} sw={sw} />
          <Flower x={0} y={-17} fill={C.sheet} sw={sw} />
          <Flower x={23} y={-13} fill={C.teal} sw={sw} />
          <Flower x={44} y={-1} fill={C.sheet} sw={sw} />
        </g>
      )
    case 'baseball-cap':
      return (
        <g>
          <path d="M-32 1 C-34 -34 30 -37 33 1 C12 4 -12 4 -32 1 Z" fill={C.teal} {...s} />
          <path d="M-11 2 C-12 -18 -6 -30 1 -34 C8 -30 14 -18 14 2" fill={C.sheet} {...s} />
          <path d="M-24 -20 C-19 -27 -14 -30 -10 -31" {...shine(sw)} />
          <path d={starPath(1.5, -15, 7.5, 0.48)} fill={C.sienna} {...line(sw * 0.7)} />
          <circle cx="1" cy="-35" r="3.6" fill={C.saffron} {...s} />
          <path d="M10 0 C28 -9 52 -7 61 3 C49 12 26 11 8 6 Z" fill={C.saffron} {...s} />
          <path d="M22 3 C34 1 46 2 54 4" fill="none" {...line(sw * 0.6)} />
        </g>
      )
    case 'beanie':
      return (
        <g>
          <circle cx="0" cy="-50" r="10" fill={C.sheet} {...s} />
          <path d="M-5 -55 L-2 -52 M3 -57 L4 -53 M6 -49 L3 -47 M-6 -47 L-3 -45" fill="none" {...line(sw * 0.6)} />
          <path d="M-33 -8 C-35 -52 33 -52 33 -8 Z" fill={C.sienna} {...s} />
          <path d="M-17 -12 C-19 -24 -15 -36 -9 -42 M0 -12 L0 -45 M17 -12 C19 -24 15 -36 9 -42" fill="none" {...line(sw * 0.6)} />
          <path d="M-26 -24 C-24 -32 -20 -37 -15 -40" {...shine(sw)} />
          <rect x="-37" y="-16" width="74" height="18" rx="7" fill={C.sandy} {...s} />
          {[-28, -20, -12, -4, 4, 12, 20, 28].map((x) => (
            <path key={x} d={`M${x} -12 L${x} -2`} fill="none" {...line(sw * 0.55)} />
          ))}
        </g>
      )
    case 'sun-hat':
      return (
        <g>
          <path d="M-58 4 C-52 -12 -30 -17 0 -17 C30 -17 52 -12 58 4 C46 1 34 8 18 6 C8 10 -8 10 -18 6 C-34 8 -46 1 -58 4 Z" fill={C.saffronSoft} {...s} />
          <path d="M-46 -2 L-40 -4 M-30 -8 L-24 -9 M24 -9 L30 -8 M40 -4 L46 -2 M-36 2 L-30 1 M30 1 L36 2" fill="none" stroke={C.sandy} strokeWidth={sw * 0.9} strokeLinecap="round" />
          <path d="M-26 -10 C-28 -46 26 -46 26 -10 C10 -6 -10 -6 -26 -10 Z" fill={C.saffron} {...s} />
          <path d="M-26.6 -20 C-10 -15 10 -15 26.6 -20 L26.3 -11 C10 -6.5 -10 -6.5 -26.3 -11 Z" fill={C.teal} {...s} />
          <path d="M22 -16 C30 -26 40 -22 34 -14 C40 -8 30 -2 22 -12 Z" fill={C.teal} {...s} />
          <path d="M23 -13 L30 2 M24 -12 L36 -2" fill="none" {...line(sw * 1.1)} />
          <path d="M-16 -32 C-10 -38 -2 -39 4 -39" {...shine(sw)} />
        </g>
      )
    case 'bucket-hat':
      return (
        <g>
          <path d="M-25 -6 C-24 -16 -23 -24 -20 -28 C-8 -33 8 -33 20 -28 C23 -24 24 -16 25 -6 Z" fill={C.tealSoft} {...s} />
          <path d="M-11 -31 L-12 -7 M0 -32 L0 -6 M11 -31 L12 -7" fill="none" stroke={C.teal} strokeWidth={sw * 1.6} strokeLinecap="round" />
          <path d="M-25 -6 C-24 -16 -23 -24 -20 -28 C-8 -33 8 -33 20 -28 C23 -24 24 -16 25 -6" fill="none" {...s} />
          <path d="M-27 -8 C-12 -4 12 -4 27 -8 L42 7 C16 15 -16 15 -42 7 Z" fill={C.teal} {...s} />
          <path d="M-33 5 C-12 10 12 10 33 5" fill="none" stroke={C.sheet} strokeWidth={sw * 0.8} strokeDasharray={`${sw * 2} ${sw * 1.6}`} strokeLinecap="round" />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d="M-30 -12 L-36 -42 L-17 -25 L0 -48 L17 -25 L36 -42 L30 -12 Z" fill={C.saffron} {...s} />
          <path d="M-30 1 L-30 -13 L30 -13 L30 1 C10 4 -10 4 -30 1 Z" fill={C.saffron} {...s} />
          <circle cx="-36" cy="-43" r="4.4" fill={C.sheet} {...s} />
          <circle cx="0" cy="-49" r="4.8" fill={C.sheet} {...s} />
          <circle cx="36" cy="-43" r="4.4" fill={C.sheet} {...s} />
          <path d={heartPath(0, -27, 12)} fill={C.sienna} {...line(sw * 0.8)} />
          <circle cx="-18" cy="-6" r="3.6" fill={C.teal} {...line(sw * 0.8)} />
          <path d="M0 -10.5 L4 -6 L0 -1.5 L-4 -6 Z" fill={C.sienna} {...line(sw * 0.8)} />
          <circle cx="18" cy="-6" r="3.6" fill={C.teal} {...line(sw * 0.8)} />
          <path d="M-26 -16 L-29 -32 M-12 -16 L-6 -30" {...shine(sw)} />
        </g>
      )
    case 'tiara':
      return (
        <g>
          <path d="M-34 2 C-28 -8 -18 -8 -12 -14 C-6 -20 -4 -30 0 -38 C4 -30 6 -20 12 -14 C18 -8 28 -8 34 2 C20 -5 -20 -5 -34 2 Z" fill={C.sheet} {...s} />
          <path d="M-22 -4 C-20 -10 -16 -12 -12 -11 M22 -4 C20 -10 16 -12 12 -11" fill="none" {...line(sw * 0.7)} />
          <path d="M0 -30 C4 -26 5 -21 0 -16 C-5 -21 -4 -26 0 -30 Z" fill={C.teal} {...line(sw * 0.8)} />
          <circle cx="-17" cy="-6" r="2.8" fill={C.sienna} {...line(sw * 0.7)} />
          <circle cx="17" cy="-6" r="2.8" fill={C.sienna} {...line(sw * 0.7)} />
          <circle cx="0" cy="-41" r="3" fill={C.saffron} {...line(sw * 0.7)} />
          <Sparkle x={-30} y={-16} r={5} sw={sw} />
        </g>
      )
    case 'chef-hat':
      return (
        <g>
          <path d="M-24 -14 C-40 -14 -46 -38 -30 -46 C-30 -64 -8 -68 0 -56 C8 -68 30 -64 30 -46 C46 -38 40 -14 24 -14 Z" fill={C.sheet} {...s} />
          <path d="M-12 -18 C-14 -28 -12 -38 -8 -44 M10 -18 C12 -28 12 -36 8 -44" fill="none" {...line(sw * 0.6)} />
          <path d="M-36 -40 C-34 -46 -30 -50 -24 -52" fill="none" stroke={C.paper} strokeWidth={sw * 1.4} strokeLinecap="round" />
          <path d="M-26 -16 L26 -16 L26 0 C10 3 -10 3 -26 0 Z" fill={C.sheet} {...s} />
          <path d="M-16 -14 L-16 0 M-5 -14 L-5 1.5 M6 -14 L6 1.5 M17 -14 L17 0" fill="none" stroke={C.paper} strokeWidth={sw * 1.2} strokeLinecap="round" />
        </g>
      )
    case 'santa-hat':
      return (
        <g>
          <path d="M-31 -8 C-28 -36 -6 -54 14 -52 C30 -50 42 -38 48 -20 C40 -30 30 -35 22 -30 C26 -22 30 -14 31 -8 Z" fill={C.sienna} {...s} />
          <path d="M-16 -30 C-10 -40 -2 -45 6 -47" {...shine(sw)} />
          <circle cx="48" cy="-17" r="8.5" fill={C.sheet} {...s} />
          <path d="M-38 -12 C-38 -20 38 -20 38 -12 L38 -1 C38 6 -38 6 -38 -1 Z" fill={C.sheet} {...s} />
          <path d="M-28 -8 L-26 -6 M-14 -10 L-12 -8 M2 -10 L4 -8 M18 -10 L20 -8 M30 -7 L32 -5 M-22 -2 L-20 0 M10 -2 L12 0" fill="none" stroke={C.paper} strokeWidth={sw * 1.2} strokeLinecap="round" />
        </g>
      )
    case 'pumpkin-hat':
      return (
        <g>
          <path d="M5 -42 C10 -50 20 -54 28 -48 C20 -42 12 -40 5 -42 Z" fill={C.teal} {...s} />
          <path d="M-3 -40 C-4 -46 -2 -52 3 -55 L7 -52 C4 -48 3 -44 4 -40 Z" fill={C.tealDeep} {...s} />
          <ellipse cx="-17" cy="-19" rx="17" ry="20" fill={C.sandy} {...s} />
          <ellipse cx="17" cy="-19" rx="17" ry="20" fill={C.sandy} {...s} />
          <ellipse cx="0" cy="-20" rx="14" ry="22" fill={C.sandy} {...s} />
          <path d="M-26 -30 C-24 -34 -20 -36 -17 -37 M-5 -34 C-4 -37 -2 -39 0 -40" {...shine(sw)} />
          <path d="M-8 -40 C-12 -46 -18 -46 -20 -42" fill="none" {...line(sw * 0.8)} />
        </g>
      )
    case 'halo':
      return (
        <g>
          <path d="M-34 -16 A34 10 0 1 0 34 -16 A34 10 0 1 0 -34 -16 Z M-25 -16 A25 5.5 0 1 1 25 -16 A25 5.5 0 1 1 -25 -16 Z" fill={C.saffron} fillRule="evenodd" {...s} />
          <path d="M-22 -23.5 C-10 -26 10 -26 20 -24" {...shine(sw, 0.8)} />
          <Sparkle x={-42} y={-30} r={6} sw={sw} />
          <Sparkle x={42} y={-8} r={4.5} sw={sw} />
        </g>
      )
    case 'antenna-bopper':
      return (
        <g>
          <path d="M-17 -17 L-22 -23 L-15 -27 L-22 -32 L-17 -36 L-23 -40" fill="none" {...line(sw * 1.1)} />
          <path d="M17 -17 L22 -23 L15 -27 L22 -32 L17 -36 L23 -40" fill="none" {...line(sw * 1.1)} />
          <Band d="M-38 4 C-36 -26 36 -26 38 4" fill={C.sienna} sw={sw} k={1.8} />
          <path d={heartPath(-24, -46, 15)} fill={C.sienna} {...s} />
          <path d={heartPath(24, -46, 15)} fill={C.sienna} {...s} />
          <path d="M-29 -50 L-27 -52 M19 -50 L21 -52" {...shine(sw)} />
        </g>
      )
    case 'rain-cloud':
      return (
        <g>
          {[
            [30, C.sienna],
            [25, C.saffron],
            [20, C.teal],
          ].map(([r, fill]) => {
            const R = r as number
            const cx = 16
            const cy = -44
            return <path key={R} d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} L${cx + R - 5} ${cy} A${R - 5} ${R - 5} 0 0 0 ${cx - R + 5} ${cy} Z`} fill={fill as string} {...line(sw * 0.8)} />
          })}
          <path d="M-36 -30 C-47 -30 -47 -46 -34 -47 C-34 -63 -12 -67 -6 -55 C0 -69 24 -67 24 -53 C36 -57 46 -42 38 -34 C41 -31 38 -30 35 -30 Z" fill={C.sheet} {...s} />
          <path d="M-30 -34 C-14 -32 14 -32 32 -34" fill="none" stroke={C.paper} strokeWidth={sw * 1.6} strokeLinecap="round" />
          <path d="M-28 -50 C-26 -55 -22 -58 -18 -58" {...shine(sw)} />
          {[
            [-22, -20],
            [-2, -14],
            [18, -21],
          ].map(([x, y]) => (
            <path key={x} d={`M${x} ${y - 7} C${x + 4.5} ${y - 1} ${x + 4.5} ${y + 4} ${x} ${y + 4} C${x - 4.5} ${y + 4} ${x - 4.5} ${y - 1} ${x} ${y - 7} Z`} fill={C.teal} {...line(sw * 0.8)} />
          ))}
        </g>
      )
    default:
      return null
  }
}
