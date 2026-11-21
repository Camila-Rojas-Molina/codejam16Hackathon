// Profile avatars: the character art in public/assets/avatars. Stored by id on the account.
// Older accounts (and demo partners) may still have an emoji avatar; <Avatar> renders those as-is.
export type AvatarOption = { id: string; label: string; src: string }

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'banana', label: 'Banana', src: '/assets/avatars/banana.png' },
  { id: 'disco', label: 'Disco ball', src: '/assets/avatars/disco.png' },
  { id: 'flower', label: 'Flower', src: '/assets/avatars/flower.png' },
  { id: 'redheart', label: 'Red heart', src: '/assets/avatars/redheart.png' },
  { id: 'star', label: 'Star', src: '/assets/avatars/star.png' },
  { id: 'strawberry', label: 'Strawberry', src: '/assets/avatars/strawberry.png' },
  { id: 'sun', label: 'Sun', src: '/assets/avatars/sun.png' },
  { id: 'yellowheart', label: 'Yellow heart', src: '/assets/avatars/yellowheart.png' },
]

export const avatarOption = (id: string | null | undefined) => AVATAR_OPTIONS.find((a) => a.id === id)
