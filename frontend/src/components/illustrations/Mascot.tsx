// The MIGO mascot: a walking globe. Ten official poses live in public/assets/mascot/, cut out of
// the high-resolution character sheets (never redrawn): <pose>.webp at the sheets' full resolution
// (about 3x the largest size used, h-52) and <pose>-sm.webp at 360px tall for small spots; the
// browser picks one from the rendered size. Pick the pose that fits the moment:
//
//   hello    strolling, fist up          welcomes, first steps, questionnaire part 1
//   glide    hang-gliding in shades      travel, Tourist mode, exploration style (part 2)
//   leap     jumping for joy             success, rewards claimed, setup finished
//   read     reading with a backpack     reading, reviewing answers, settings
//   goodies  thumbs up with a sack       the shop
//   play     spinning a ball             quests and challenges
//   curious  cap on, wide-eyed           Local mode, discovering people
//   cheer    big grin, thumbs up         account created, profile
//   search   shading eyes in the sun     loading, searching, waiting
//   ponder   cloud overhead, side-eye    empty states, nothing here yet
import type { ReactNode } from 'react'
import type { AccessorySlot } from '../../features/profile/types'
import { cn } from '../../lib/cn'

export type MascotPose = 'hello' | 'glide' | 'leap' | 'read' | 'goodies' | 'play' | 'curious' | 'cheer' | 'search' | 'ponder'

/** Pixel sizes of each cut-out: [width, height] of <pose>.webp, and the width of <pose>-sm.webp (360px tall). */
const SIZES: Record<MascotPose, [number, number, number]> = {
  hello: [445, 497, 322],
  glide: [590, 611, 348],
  leap: [556, 636, 315],
  read: [464, 502, 333],
  goodies: [448, 501, 322],
  play: [466, 544, 308],
  curious: [510, 651, 282],
  cheer: [656, 704, 335],
  search: [507, 779, 234],
  ponder: [686, 729, 339],
}

const DESCRIPTIONS: Record<MascotPose, string> = {
  hello: 'Migo the globe, strolling and waving hello',
  glide: 'Migo the globe hang-gliding in sunglasses',
  leap: 'Migo the globe leaping for joy',
  read: 'Migo the globe reading a book',
  goodies: 'Migo the globe giving a thumbs up beside a sack of goodies',
  play: 'Migo the globe spinning a ball on one finger',
  curious: 'Migo the globe in a cap, looking curious',
  cheer: 'Migo the globe grinning with a thumbs up',
  search: 'Migo the globe shading their eyes, searching the horizon',
  ponder: 'Migo the globe deep in thought under a cloud',
}

const BREAKPOINTS: Record<string, number> = { sm: 40, md: 48, lg: 64, xl: 80, '2xl': 96 }

/**
 * The `sizes` hint for srcset, read from the height classes the caller passes (h-28, sm:h-36…):
 * the rendered width is that height times the pose's aspect ratio.
 */
function sizesFor(className: string | undefined, aspect: number): string {
  const found: { min: number; px: number }[] = []
  for (const cls of (className ?? '').split(/\s+/)) {
    const m = /^(?:(sm|md|lg|xl|2xl):)?h-(\d+(?:\.\d+)?)$/.exec(cls)
    if (m) found.push({ min: m[1] ? BREAKPOINTS[m[1]] : 0, px: Number(m[2]) * 4 })
  }
  if (found.length === 0) return `${Math.round(240 * aspect)}px`
  found.sort((a, b) => b.min - a.min)
  return found.map((f) => (f.min ? `(min-width: ${f.min}rem) ${Math.round(f.px * aspect)}px` : `${Math.round(f.px * aspect)}px`)).join(', ')
}

type MascotProps = {
  pose?: MascotPose
  /** Size with a height class (h-32, h-48, sm:h-36…). Width follows the image's own proportions. */
  className?: string
  /**
   * @deprecated Shop items are now worn by your avatar (<Avatar accessories>), not by Migo. Ignored;
   * kept only so older callers still compile.
   */
  accessories?: Partial<Record<AccessorySlot, string>>
  /** Describe Migo for screen readers when the picture carries meaning. Decorative otherwise. */
  label?: string | true
  /** Gentle bobbing motion (respects reduced-motion). */
  bob?: boolean
}

export function Mascot({ pose = 'hello', className, label, bob = false }: MascotProps) {
  const [w, h, smW] = SIZES[pose]
  const alt = label === true ? DESCRIPTIONS[pose] : (label ?? '')
  return (
    <img
      src={`/assets/mascot/${pose}.webp`}
      srcSet={`/assets/mascot/${pose}-sm.webp ${smW}w, /assets/mascot/${pose}.webp ${w}w`}
      sizes={sizesFor(className, w / h)}
      width={Math.round(w / 3)}
      height={Math.round(h / 3)}
      alt={alt}
      draggable={false}
      className={cn('w-auto max-w-none object-contain select-none', className, bob && 'motion-safe:animate-bob')}
    />
  )
}

type MascotSaysProps = {
  children: ReactNode
  pose?: MascotPose
  className?: string
  /** Mascot size class. */
  size?: string
}

/**
 * Migo with an outlined speech bubble (the café-poster bubble: serif words, ink outline, a tail
 * towards Migo). The words are real text; the picture is decorative.
 */
export function MascotSays({ children, pose = 'hello', className, size = 'h-32 sm:h-36' }: MascotSaysProps) {
  return (
    <div className={cn('flex items-end gap-2', className)}>
      <Mascot pose={pose} className={cn('shrink-0', size)} bob />
      <div className="relative mb-6 min-w-0 flex-1">
        <svg viewBox="0 0 28 24" className="absolute bottom-4 -left-[25px] h-6 w-7" aria-hidden>
          <path d="M28 3 2 19l26-4z" fill="var(--color-sheet)" />
          <path d="M27 3 2 19l25-4" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <div className="sheet-grain rounded-[1.75rem] border-2 border-ink px-5 py-4 font-serif text-lg leading-snug text-ink sm:text-xl">
          {children}
        </div>
      </div>
    </div>
  )
}
