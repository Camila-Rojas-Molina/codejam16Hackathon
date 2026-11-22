// A person's avatar: always one of the character pictures in lib/avatars.ts, framed like a stamp.
// Unknown or old values (e.g. emoji from early versions) show the default character, so no emoji
// ever reaches the screen. Pass `accessories` (profile.rewards.equipped) to dress it in shop items.
import Icon from '../icons/Icon'
import { AvatarBackdrop, AvatarWear, type Outfit } from '../illustrations/Accessories'
import { AVATAR_CATALOG, AVATAR_LIST, avatarFor } from '../../lib/avatars'
import { cn } from '../../lib/cn'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fill'

const sizes: Record<AvatarSize, string> = {
  xs: 'size-8',
  sm: 'size-11',
  md: 'size-14',
  lg: 'size-20',
  xl: 'size-28',
  // The caller sets the size (e.g. "size-40" or "w-full").
  fill: 'aspect-square',
}

/** Share of the stamp the picture fills: the same framing everywhere (pickers included). */
export const AVATAR_ART_FRAME = 'size-[86%]'

type AvatarProps = {
  avatar: string
  /** Who it is. Omit when the name is right next to it (the image is then decorative). */
  name?: string
  size?: AvatarSize
  className?: string
  /** Shop items to wear, by slot (profile.rewards.equipped). Only for the signed-in person's own avatar. */
  accessories?: Outfit
}

export default function Avatar({ avatar, name, size = 'md', className, accessories }: AvatarProps) {
  const art = avatarFor(avatar)
  const scale = art.scale ?? 1
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center overflow-hidden border-2 border-ink bg-saffron-soft', sizes[size], className)}
      role={name ? 'img' : undefined}
      aria-label={name ? `${name}’s avatar` : undefined}
      aria-hidden={name ? undefined : true}
    >
      {accessories && <AvatarBackdrop outfit={accessories} className="absolute inset-0 size-full" />}
      <span className={cn('relative', AVATAR_ART_FRAME)} style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}>
        <img src={art.src} alt="" draggable={false} className="size-full object-contain" />
        {accessories && <AvatarWear avatar={art.id} outfit={accessories} className="absolute inset-0 size-full overflow-visible" />}
      </span>
    </span>
  )
}

type AvatarPickerProps = {
  /** The selected avatar id. */
  value: string | null
  onChange: (id: string) => void
  /** Radio group name (unique on the page). */
  name?: string
  /** Avatars to offer. Defaults to the current picker list (lib/avatars.ts AVATAR_LIST). */
  options?: readonly { id: string; src: string; alt: string }[]
  className?: string
}

/**
 * The avatar picker: a ruled grid of stamps (4 across; 6 from tablets up when that fills the rows), each framed
 * exactly like <Avatar>. The chosen one turns saffron with an ink corner tick. Real radio buttons,
 * so arrow keys move the choice and screen readers hear "Strawberry in sunglasses, 2 of 8".
 * Put it inside a <fieldset> with a <legend>.
 */
export function AvatarPicker({ value, onChange, name = 'avatar', options = AVATAR_LIST, className }: AvatarPickerProps) {
  // Someone still using a retired (legacy) picture sees it first, so their current choice stays visible.
  const current = AVATAR_CATALOG.find((a) => a.id === value)
  const list = current && !options.some((o) => o.id === current.id) ? [current, ...options] : options
  return (
    <div className={cn('grid grid-cols-4 border-t-2 border-l-2 border-ink', list.length % 6 === 0 && 'sm:grid-cols-6', className)}>
      {list.map((a) => {
        const selected = value === a.id
        return (
          <label
            key={a.id}
            className={cn(
              'relative grid aspect-square min-h-14 cursor-pointer place-items-center border-r-2 border-b-2 border-ink transition-colors',
              'has-focus-visible:outline-3 has-focus-visible:-outline-offset-[6px] has-focus-visible:outline-ink',
              selected ? 'bg-saffron' : 'sheet-grain hover:bg-saffron-soft',
            )}
          >
            <input type="radio" name={name} value={a.id} checked={selected} onChange={() => onChange(a.id)} className="sr-only" />
            <img src={a.src} alt="" draggable={false} className={cn(AVATAR_ART_FRAME, 'object-contain transition-transform', selected && '-rotate-3')} />
            <span className="sr-only">{a.alt}</span>
            {selected && (
              <span className="absolute top-0 right-0 grid size-6 place-items-center border-b-2 border-l-2 border-ink bg-ink text-saffron" aria-hidden>
                <Icon name="check" accent="none" strokeWidth={3.2} className="size-4" />
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
