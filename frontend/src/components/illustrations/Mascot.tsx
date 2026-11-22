// The MIGO mascot: a walking globe. Ten official poses live in public/assets/mascot/ (cut out
// from the supplied character sheets, never redrawn). Pick the pose that fits the moment:
//
//   hello    strolling, fist up          welcomes, first steps, questionnaire part 1
//   glide    hang-gliding in shades      travel, Tourist mode, exploration style (part 2)
//   leap     jumping for joy             success, rewards claimed, setup finished
//   read     reading with a backpack     reading, reviewing answers, settings
//   goodies  thumbs up with a sack       the shop
//   play     spinning a ball             quests and challenges
//   curious  cap on, wide-eyed           Local mode, discovering people
//   cheer    big grin, thumbs up         account created, profile; also the wardrobe pose
//   search   shading eyes in the sun     loading, searching, waiting
//   ponder   cloud overhead, side-eye    empty states, nothing here yet
import type { ReactNode } from 'react'
import type { AccessorySlot } from '../../features/profile/types'
import { cn } from '../../lib/cn'
import { AccessoryArt, WARDROBE_POSE } from './Accessories'

export type MascotPose = 'hello' | 'glide' | 'leap' | 'read' | 'goodies' | 'play' | 'curious' | 'cheer' | 'search' | 'ponder'

/** Intrinsic size of each cut-out (2x pixels), so the image never stretches or shifts layout. */
const SIZES: Record<MascotPose, [number, number]> = {
  hello: [344, 378],
  glide: [450, 464],
  leap: [420, 484],
  read: [358, 388],
  goodies: [348, 394],
  play: [362, 420],
  curious: [392, 496],
  cheer: [498, 534],
  search: [390, 588],
  ponder: [522, 552],
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

type MascotProps = {
  pose?: MascotPose
  /** Size with a height class (h-32, h-48…). Width follows the image's own proportions. */
  className?: string
  /** Shop items to wear. Only drawn on the wardrobe pose (cheer). */
  accessories?: Partial<Record<AccessorySlot, string>>
  /** Describe Migo for screen readers when the picture carries meaning. Decorative otherwise. */
  label?: string | true
  /** Gentle bobbing motion (respects reduced-motion). */
  bob?: boolean
}

export function Mascot({ pose = 'hello', className, accessories, label, bob = false }: MascotProps) {
  const [w, h] = SIZES[pose]
  const wearing = pose === WARDROBE_POSE && accessories && Object.values(accessories).some(Boolean)
  const alt = label === true ? DESCRIPTIONS[pose] : (label ?? '')
  const img = (
    <img
      src={`/assets/mascot/${pose}.webp`}
      width={w / 2}
      height={h / 2}
      alt={wearing ? '' : alt}
      draggable={false}
      className={cn(
        'w-auto max-w-none object-contain select-none',
        // On its own the image takes the caller's size class; inside the wardrobe wrapper it fills it.
        wearing ? 'size-full' : className,
        !wearing && bob && 'motion-safe:animate-bob',
      )}
    />
  )
  if (!wearing) return img
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn('relative inline-block shrink-0', className, bob && 'motion-safe:animate-bob')}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {img}
      <svg viewBox={`0 0 ${w} ${h}`} className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
        {accessories?.neck && <AccessoryArt id={accessories.neck} />}
        {accessories?.face && <AccessoryArt id={accessories.face} />}
        {accessories?.head && <AccessoryArt id={accessories.head} />}
      </svg>
    </span>
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
