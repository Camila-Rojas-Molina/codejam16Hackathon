import { avatarFor } from '../../lib/avatars'
import { cn } from '../../lib/cn'

type AvatarSize = 'sm' | 'md' | 'lg'

type AvatarProps = {
  id: string | null | undefined
  size?: AvatarSize
  /** Paper circle with a navy outline around the image. */
  framed?: boolean
  /** Hide from screen readers when the name is shown right next to it. */
  decorative?: boolean
  className?: string
}

const sizes: Record<AvatarSize, string> = { sm: 'size-10', md: 'size-14', lg: 'size-20' }

// Renders the image for an avatar id. Unknown ids fall back to the default avatar.
export default function Avatar({ id, size = 'md', framed = false, decorative = false, className }: AvatarProps) {
  const avatar = avatarFor(id)
  const img = (
    <img
      src={avatar.src}
      alt={decorative ? '' : avatar.alt}
      aria-hidden={decorative || undefined}
      className={cn('object-contain', framed ? 'size-[85%]' : cn(sizes[size], className))}
    />
  )
  if (!framed) return img
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full border-4 border-navy bg-paper', sizes[size], className)}
    >
      {img}
    </span>
  )
}
