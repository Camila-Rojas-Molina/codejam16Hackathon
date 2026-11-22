// Eyewear and masks (slot 'face').
//
// Local space: (0, 0) is the point between the two eyes, on the eye line. Lens centres sit at
// x = ±25; the frame is about 100 units wide (x −50…50). A positive y goes down the face.
import type { ReactNode } from 'react'
import { C, line, shine, heartPath } from './palette'

/** Ellipse as a path (for cut-outs with fillRule="evenodd"). */
const oval = (x: number, y: number, rx: number, ry: number) => `M${x - rx} ${y} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`

/** Draws `children` for the left side and again mirrored for the right. */
function Pair({ children }: { children: ReactNode }) {
  return (
    <g>
      {children}
      <g transform="scale(-1 1)">{children}</g>
    </g>
  )
}

export function FaceArt({ art, sw }: { art: string; sw: number }) {
  const s = line(sw)
  switch (art) {
    case 'shades':
      return (
        <g>
          <path d="M-6 -5 Q0 -11 6 -5" fill="none" {...s} />
          <rect x="-50" y="-16" width="44" height="33" rx="13" fill={C.ink} {...s} />
          <rect x="6" y="-16" width="44" height="33" rx="13" fill={C.ink} {...s} />
          <path d="M-40 -6 L-29 -10 M16 -6 L27 -10" stroke={C.sheet} strokeWidth={sw * 1.1} strokeLinecap="round" />
        </g>
      )
    case 'round-specs':
      return (
        <g>
          <path d="M-7 -3 Q0 -10 7 -3 M-45 -5 L-52 -8 M45 -5 L52 -8" fill="none" {...s} />
          <circle cx="-26" cy="0" r="19" fill={C.tealSoft} fillOpacity="0.35" {...s} />
          <circle cx="26" cy="0" r="19" fill={C.tealSoft} fillOpacity="0.35" {...s} />
          <path d="M-35 -8 Q-30 -13 -24 -13 M17 -8 Q22 -13 28 -13" fill="none" stroke={C.sheet} strokeWidth={sw * 0.9} strokeLinecap="round" />
        </g>
      )
    case 'aviators':
      return (
        <g>
          <path d="M-9 -15 Q0 -17.5 9 -15 M-6 -9 Q0 -12 6 -9" fill="none" {...s} />
          <Pair>
            <path d="M-50 -15 L-46 -14" fill="none" {...s} />
            <path d="M-47 -12 C-45 -18 -11 -19 -7 -12 C-3 -4 -8 16 -24 17 C-40 18 -49 3 -47 -12 Z" fill={C.sandy} {...s} />
            <path d="M-43 -10 C-38 -14 -18 -15 -11 -11 C-11 -6 -12 -3 -14 0 C-24 -4 -36 -4 -44 -2 C-45 -5 -45 -8 -43 -10 Z" fill={C.saffron} />
            <path d="M-38 -7 L-30 -9" {...shine(sw, 1.1)} />
          </Pair>
        </g>
      )
    case 'heart-shades':
      return (
        <g>
          <path d="M-6 -4 Q0 -9 6 -4" fill="none" {...s} />
          <Pair>
            <path d="M-46 -8 L-51 -10" fill="none" {...s} />
            <path d={heartPath(-26, 1, 42)} fill={C.sienna} {...s} />
            <path d="M-38 -9 C-36 -12 -32 -13 -29 -12" {...shine(sw, 1.1)} />
          </Pair>
        </g>
      )
    case 'cat-eye-shades':
      return (
        <g>
          <path d="M-8 -6 Q0 -11 8 -6" fill="none" {...s} />
          <Pair>
            <path d="M-52 -20 C-44 -14 -30 -13 -9 -11 C-4 -2 -8 13 -23 14 C-39 15 -47 4 -52 -20 Z" fill={C.sienna} {...s} />
            <path d="M-41 -8 C-34 -8 -24 -7 -12 -6 C-10 1 -13 8 -23 8 C-33 8 -39 2 -41 -8 Z" fill={C.ink} {...line(sw * 0.8)} />
            <path d="M-34 -3 L-28 -4" {...shine(sw, 1)} />
            <circle cx="-46" cy="-14" r="1.9" fill={C.sheet} />
            <circle cx="-41.5" cy="-12" r="1.4" fill={C.sheet} />
          </Pair>
        </g>
      )
    case 'masquerade-mask':
      return (
        <g>
          <path d="M42 -16 C46 -38 58 -56 68 -64 C66 -46 58 -28 48 -14 Z" fill={C.sienna} {...s} />
          <path d="M50 -16 C58 -32 70 -42 78 -44 C72 -32 64 -20 54 -10 Z" fill={C.saffron} {...s} />
          <path d="M45 -18 C50 -32 56 -46 64 -58 M52 -14 C58 -24 66 -34 74 -40" fill="none" {...line(sw * 0.6)} />
          <path
            d={`M-52 -14 C-40 -24 -16 -21 0 -12 C16 -21 40 -24 52 -14 C55 1 45 17 30 18 C18 19 8 12 0 7 C-8 12 -18 19 -30 18 C-45 17 -55 1 -52 -14 Z ${oval(-25, -1, 14, 10)} ${oval(25, -1, 14, 10)}`}
            fill={C.teal}
            fillRule="evenodd"
            {...s}
          />
          <path d={`${oval(-25, -1, 16.5, 12.5)} ${oval(25, -1, 16.5, 12.5)}`} fill="none" stroke={C.saffron} strokeWidth={sw * 1.4} />
          <path d="M-46 -12 C-38 -18 -26 -18 -18 -15 M46 -12 C38 -18 26 -18 18 -15" {...shine(sw, 0.9)} />
          {[-44, 44].map((x) => (
            <circle key={x} cx={x} cy="4" r="2.4" fill={C.saffron} {...line(sw * 0.6)} />
          ))}
          <path d="M0 -6 L3 -2 L0 2 L-3 -2 Z" fill={C.saffron} {...line(sw * 0.6)} />
        </g>
      )
    case 'snorkel-mask':
      return (
        <g>
          <path d="M-46 -6 L-53 -7 M46 -6 L53 -7" fill="none" stroke={C.teal} strokeWidth={sw * 3} strokeLinecap="round" />
          <path d="M51 6 C58 6 59 0 59 -8 L59 -46" fill="none" {...line(sw * 6)} />
          <path d="M51 6 C58 6 59 0 59 -8 L59 -46" fill="none" stroke={C.saffron} strokeWidth={sw * 4} strokeLinecap="round" />
          <rect x="54" y="-56" width="10" height="11" rx="3" fill={C.teal} {...s} />
          <path d="M-46 -14 C-46 -26 46 -26 46 -14 L44 9 C42 22 13 21 0 15 C-13 21 -42 22 -44 9 Z" fill={C.sienna} {...s} />
          <path d="M-39 -11 C-39 -19 39 -19 39 -11 L37 6 C36 14 12 14 0 9 C-12 14 -36 14 -37 6 Z" fill={C.tealSoft} fillOpacity="0.55" {...line(sw * 0.8)} />
          <path d="M-32 -12 L-22 -14 M22 -13 L28 -13" {...shine(sw, 1.2)} />
        </g>
      )
    default:
      return null
  }
}
