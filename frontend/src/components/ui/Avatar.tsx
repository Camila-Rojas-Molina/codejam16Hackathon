// A person's avatar: always one of the character illustrations in lib/avatars.ts, framed like a
// stamp. Unknown or old values (e.g. emoji from early versions) show the default character, so
// no emoji ever reaches the screen.
import { avatarFor } from '../../lib/avatars'
import { cn } from '../../lib/cn'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<AvatarSize, string> = {
  xs: 'size-8',
  sm: 'size-11',
  md: 'size-14',
  lg: 'size-20',
  xl: 'size-28',
}

type AvatarProps = {
  avatar: string
  /** Who it is. Omit when the name is right next to it (the image is then decorative). */
  name?: string
  size?: AvatarSize
  className?: string
}

export default function Avatar({ avatar, name, size = 'md', className }: AvatarProps) {
  const art = avatarFor(avatar)
  return (
    <span
      className={cn('grid shrink-0 place-items-center overflow-hidden border-2 border-ink bg-saffron-soft', sizes[size], className)}
      role={name ? 'img' : undefined}
      aria-label={name ? `${name}’s avatar` : undefined}
      aria-hidden={name ? undefined : true}
    >
      <img src={art.src} alt="" draggable={false} className="size-[86%] object-contain" />
    </span>
  )
}
