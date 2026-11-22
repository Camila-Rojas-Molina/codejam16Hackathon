// Dressing an avatar: places the equipped shop items on a character picture.
//
// Catalogue: features/rewards/catalog/accessories.ts. Every accessory has an explicit placement
// (`fits[avatarId]`) per avatar, checked by eye on the fitting matrix in /styleguide; an avatar
// without a fit simply doesn't wear it. Drawings: ./accessories (each in its own local space, see
// ./accessories/index.tsx). Backdrops: ./backdrops (scenes filling the square).
//
// Layering, back to front: backdrop → wearables with `behind` (backpacks, wings) → the avatar
// picture → the other wearables, each side ordered by `z` (default per slot, SLOT_Z below).
import type { Fit, ShopSlot, WearSlot } from '../../features/economy/types'
import { accessoryById } from '../../features/rewards/catalog/accessories'
import { WearableArt } from './accessories'
import { BackdropArt } from './backdrops'

/** What someone has on, by slot (EconomyState.equipped). Old saves only have head/face/neck/backdrop. */
export type Outfit = Partial<Record<ShopSlot, string>>

/** Every slot something can be worn in. */
const WEAR_SLOTS: readonly WearSlot[] = ['back', 'neck', 'hand', 'face', 'ears', 'hair', 'head']

/** Default stacking per slot (a fit's `z` overrides it). Hats go over headphones, headphones over glasses… */
const SLOT_Z: Record<WearSlot, number> = { back: 0, neck: 10, hand: 20, face: 30, ears: 40, hair: 45, head: 50 }

/** Outline width as a share of the avatar square (≈ the characters' own line, ~5px of 500). */
const LINE_IN_SQUARE = 0.95

type PlacedWearable = { slot: WearSlot; id: string; art: string; fit: Fit; behind: boolean; z: number }

/** The worn items of an outfit that fit this avatar, in drawing order (behind ones first). */
function placeOutfit(avatarId: string, outfit: Outfit): PlacedWearable[] {
  const placed: PlacedWearable[] = []
  for (const slot of WEAR_SLOTS) {
    const item = accessoryById(outfit[slot])
    if (!item || item.slot !== slot) continue
    const fit = item.fits[avatarId]
    if (!fit) continue
    placed.push({ slot, id: item.id, art: item.art ?? item.id, fit, behind: fit.behind ?? slot === 'back', z: fit.z ?? SLOT_Z[slot] })
  }
  return placed.sort((a, b) => Number(b.behind) - Number(a.behind) || a.z - b.z)
}

/** One drawing moved, scaled, tilted and (optionally) mirrored onto its fit, in the 0–100 square. */
export function FittedWearable({ slot, art, fit, debug }: { slot: WearSlot; art: string; fit: Fit; debug?: boolean }) {
  const w = fit.w
  return (
    <g transform={`translate(${fit.x * 100} ${fit.y * 100}) rotate(${fit.r ?? 0}) scale(${fit.flip ? -w : w} ${w})`}>
      <WearableArt slot={slot} art={art} sw={LINE_IN_SQUARE / w} />
      {debug && <path d="M-6 0 L6 0 M0 -6 L0 6" stroke="var(--day-sienna-deep)" strokeWidth={0.6 / w} vectorEffect="non-scaling-stroke" />}
    </g>
  )
}

/**
 * The worn pieces of an outfit on one avatar, one side at a time: `behind` (draw before the
 * picture) or `front` (after it). Renders an <svg> in the picture's 0–100 square: lay it exactly
 * over the avatar image. Nothing to draw → null.
 */
export function AvatarWear({
  avatar,
  outfit,
  side = 'front',
  className,
  debug,
}: {
  avatar: string
  outfit: Outfit
  side?: 'behind' | 'front'
  className?: string
  /** Mark each anchor point (fitting QA). */
  debug?: boolean
}) {
  const pieces = placeOutfit(avatar, outfit).filter((p) => p.behind === (side === 'behind'))
  if (!pieces.length) return null
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false" overflow="visible" data-wear={side}>
      {pieces.map((p) => (
        <FittedWearable key={p.slot} slot={p.slot} art={p.art} fit={p.fit} debug={debug} />
      ))}
    </svg>
  )
}

/** The backdrop of an outfit, if any, as an <svg> that fills its box. */
export function AvatarBackdrop({ outfit, className, still }: { outfit: Outfit; className?: string; still?: boolean }) {
  if (!outfit.backdrop) return null
  return <BackdropArt id={outfit.backdrop} className={className} still={still} />
}
