// A person's avatar: character art (lib/avatars.ts), or the emoji used by demo partners.
// Anything else (an unknown id) shows the default avatar, so nothing breaks.
import { AVATAR_LIST, avatarFor } from '../../lib/avatars'
import { cn } from '../../lib/cn'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<AvatarSize, { box: string; emoji: string }> = {
  xs: { box: 'size-8 border-2', emoji: 'text-base' },
  sm: { box: 'size-11 border-[3px]', emoji: 'text-xl' },
  md: { box: 'size-14 border-[3px]', emoji: 'text-3xl' },
  lg: { box: 'size-20 border-4', emoji: 'text-4xl' },
  xl: { box: 'size-28 border-4', emoji: 'text-6xl' },
}

type AvatarProps = {
  avatar: string
  /** Who it is. Omit when the name is right next to it (the image is then decorative). */
  name?: string
  size?: AvatarSize
  className?: string
}

export default function Avatar({ avatar, name, size = 'md', className }: AvatarProps) {
  const known = AVATAR_LIST.find((a) => a.id === avatar)
  // Emoji avatars are short pictographs; plain-text unknown ids fall back to the default art.
  const isEmoji = !known && avatar.length <= 8 && /\p{Extended_Pictographic}/u.test(avatar)
  const art = known ?? (isEmoji ? null : avatarFor(avatar))
  const s = sizes[size]
  return (
    <span
      className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full border-navy bg-paper', s.box, className)}
      role={name ? 'img' : undefined}
      aria-label={name ? `${name}’s avatar` : undefined}
      aria-hidden={name ? undefined : true}
    >
      {art ? (
        <img src={art.src} alt="" draggable={false} className="size-[88%] object-contain" />
      ) : (
        <span className={cn('leading-none', s.emoji)}>{avatar}</span>
      )}
    </span>
  )
}
