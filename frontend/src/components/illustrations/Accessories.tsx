// Shop artwork for avatars (catalogue: features/rewards/shop.ts, anchors: lib/avatars.ts).
//
// Wearables are drawn in their own little space: 100 units wide, centred on x = 0, with y = 0 on the
// anchor line (hats sit on it and grow upwards, eyewear is centred on the eye line, neckwear hangs
// from the collar line). <AvatarWear> moves, scales and tilts each one onto the anchor of the
// avatar being dressed, so the same drawing fits every character. Backdrops fill the 0–100 square.
//
// Colours: this is printed artwork laid over the character pictures, so it keeps its day colours in
// both themes (the --day-* palette values) and the same dark-brown outline as the characters.
import type { ReactNode } from 'react'
import { ACCESSORY_SLOTS } from '../../features/profile/model'
import type { AccessorySlot } from '../../features/profile/types'
import { shopItem, type ItemFit } from '../../features/rewards/shop'
import { avatarAnchors } from '../../lib/avatars'

const LINE = '#42332b'
const C = {
  ink: 'var(--day-ink)',
  sheet: 'var(--day-sheet)',
  saffron: 'var(--day-saffron)',
  saffronSoft: 'var(--day-saffron-soft)',
  teal: 'var(--day-teal)',
  tealSoft: 'var(--day-teal-soft)',
  sandy: 'var(--day-sandy)',
  sandySoft: 'var(--day-sandy-soft)',
  sienna: 'var(--day-sienna)',
  siennaSoft: 'var(--day-sienna-soft)',
}

/** Outline props at stroke width `sw` (local units). */
const line = (sw: number) => ({ stroke: LINE, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })

function Flower({ x, y, fill, sw }: { x: number; y: number; fill: string; sw: number }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={x + 6.5 * Math.cos(((a - 90) * Math.PI) / 180)} cy={y + 6.5 * Math.sin(((a - 90) * Math.PI) / 180)} r="5" fill={fill} {...line(sw * 0.8)} />
      ))}
      <circle cx={x} cy={y} r="3.6" fill={C.saffron} {...line(sw * 0.7)} />
    </g>
  )
}

/** One wearable, in its local 100-unit space. `sw` is the outline width in those units. */
export function WearableArt({ art, sw = 3 }: { art: string; sw?: number }): ReactNode {
  const s = line(sw)
  switch (art) {
    case 'explorer-hat':
      return (
        <g>
          <path d="M-30 -3 C-31 -46 31 -46 30 -3 Z" fill={C.saffron} {...s} />
          <path d="M-30.4 -15 C-10 -10 10 -10 30.4 -15 L30.2 -5 C10 0 -10 0 -30.2 -5 Z" fill={C.sienna} {...s} />
          <path d="M-52 0 C-34 -13 34 -13 52 0 C34 10 -34 10 -52 0 Z" fill={C.saffron} {...s} />
        </g>
      )
    case 'beret':
      return (
        <g>
          <path d="M-46 0 C-54 -24 -12 -40 22 -36 C48 -32 54 -12 44 0 C16 8 -24 8 -46 0 Z" fill={C.sienna} {...s} />
          <path d="M3 -37 L5 -46" fill="none" {...s} />
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
          <Flower x={-44} y={-1} fill={C.sheet} sw={sw} />
          <Flower x={-23} y={-13} fill={C.sienna} sw={sw} />
          <Flower x={0} y={-17} fill={C.sheet} sw={sw} />
          <Flower x={23} y={-13} fill={C.teal} sw={sw} />
          <Flower x={44} y={-1} fill={C.sheet} sw={sw} />
        </g>
      )
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
    case 'scarf':
      return (
        <g>
          <path d="M10 10 L22 48 L5 47 L-3 12 Z" fill={C.sienna} {...s} />
          <path d="M-50 -10 C-20 4 20 4 50 -10 L50 6 C20 22 -20 22 -50 6 Z" fill={C.sienna} {...s} />
          <path d="M-32 1 L-32 11 M-11 5 L-11 15 M11 5 L11 15 M32 1 L32 11 M10 30 L19 29" stroke={C.sheet} strokeWidth={sw * 1.1} strokeLinecap="round" />
        </g>
      )
    case 'bow-tie':
      return (
        <g>
          <path d="M-4 0 L-30 -15 Q-35 0 -30 15 Z" fill={C.sienna} {...s} />
          <path d="M4 0 L30 -15 Q35 0 30 15 Z" fill={C.sienna} {...s} />
          <circle cx="-22" cy="-4" r="2.6" fill={C.sheet} />
          <circle cx="-21" cy="6" r="2.6" fill={C.sheet} />
          <circle cx="22" cy="-4" r="2.6" fill={C.sheet} />
          <circle cx="21" cy="6" r="2.6" fill={C.sheet} />
          <rect x="-7" y="-8" width="14" height="16" rx="4" fill={C.sienna} {...s} />
        </g>
      )
    case 'camera':
      return (
        <g>
          <path d="M-48 -16 C-34 20 34 20 48 -16" fill="none" {...s} />
          <rect x="-16" y="0" width="12" height="8" rx="2" fill={C.ink} {...s} />
          <rect x="-24" y="6" width="48" height="31" rx="4" fill={C.ink} {...s} />
          <circle cx="0" cy="21.5" r="10" fill={C.tealSoft} stroke={C.sheet} strokeWidth={sw} />
          <circle cx="15" cy="13" r="2.6" fill={C.saffron} />
        </g>
      )
    default:
      return null
  }
}

/** A backdrop, filling the 0–100 square behind the character. */
export function BackdropArt({ art }: { art: string }): ReactNode {
  switch (art) {
    case 'backdrop-sunburst': {
      const rays = Array.from({ length: 16 }, (_, i) => {
        const a0 = (i * 2 * Math.PI) / 16
        const a1 = a0 + Math.PI / 16
        const p = (a: number) => `${50 + 90 * Math.cos(a)} ${55 + 90 * Math.sin(a)}`
        return <path key={i} d={`M50 55 L${p(a0)} L${p(a1)} Z`} fill={C.saffron} />
      })
      return (
        <g>
          <rect width="100" height="100" fill={C.saffronSoft} />
          {rays}
        </g>
      )
    }
    case 'backdrop-tiles':
      return (
        <g>
          <rect width="100" height="100" fill={C.tealSoft} />
          {Array.from({ length: 64 }, (_, i) => {
            const x = i % 8
            const y = Math.floor(i / 8)
            return (x + y) % 2 ? <rect key={i} x={x * 12.5} y={y * 12.5} width="12.5" height="12.5" fill={C.teal} fillOpacity="0.45" /> : null
          })}
        </g>
      )
    case 'backdrop-sunset':
      return (
        <g>
          <rect width="100" height="100" fill={C.sandySoft} />
          <circle cx="50" cy="74" r="30" fill={C.saffron} />
          <rect y="74" width="100" height="26" fill={C.siennaSoft} />
          <rect y="78" width="100" height="4" fill={C.sandy} />
          <rect y="86" width="100" height="3.5" fill={C.sienna} fillOpacity="0.7" />
          <rect y="93" width="100" height="3" fill={C.sienna} />
        </g>
      )
    default:
      return null
  }
}

export type Outfit = Partial<Record<AccessorySlot, string>>

const WORN: AccessorySlot[] = ACCESSORY_SLOTS.filter((s) => s !== 'backdrop')
/** Outline width, as a share of the avatar square (≈ the characters' own line weight). */
const LINE_IN_SQUARE = 1.15

/**
 * The worn pieces of an outfit, placed on one avatar. Renders an <svg> in the picture's 0–100
 * square: lay it exactly over the avatar image.
 */
export function AvatarWear({ avatar, outfit, className }: { avatar: string; outfit: Outfit; className?: string }) {
  const anchors = avatarAnchors(avatar)
  const pieces = WORN.map((slot) => {
    const item = shopItem(outfit[slot])
    if (!item || item.slot !== slot || slot === 'backdrop') return null
    const a = anchors[slot]
    const f: ItemFit = { ...item.fit, ...item.fitFor?.[avatar] }
    const scale = a.w * (f.scale ?? 1)
    const x = (a.x + (f.dx ?? 0) * a.w) * 100
    const y = (a.y + (f.dy ?? 0) * a.w) * 100
    const r = (a.r ?? 0) + (f.r ?? 0)
    return (
      <g key={slot} transform={`translate(${x} ${y}) rotate(${r}) scale(${scale})`}>
        <WearableArt art={item.art ?? item.id} sw={LINE_IN_SQUARE / scale} />
      </g>
    )
  })
  if (!pieces.some(Boolean)) return null
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false" overflow="visible">
      {pieces}
    </svg>
  )
}

/** The backdrop of an outfit, if any, as an <svg> that fills its box. */
export function AvatarBackdrop({ outfit, className }: { outfit: Outfit; className?: string }) {
  const item = shopItem(outfit.backdrop)
  if (!item || item.slot !== 'backdrop') return null
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden focusable="false">
      <BackdropArt art={item.art ?? item.id} />
    </svg>
  )
}
