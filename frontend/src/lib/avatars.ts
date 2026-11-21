// The image avatars in public/assets/avatars/. Accounts store the id ("star"), never the path.
export const AVATAR_LIST = [
  { id: 'star', src: '/assets/avatars/star.png', alt: 'Star avatar' },
  { id: 'heart', src: '/assets/avatars/redheart.png', alt: 'Heart avatar' },
  { id: 'sunburst', src: '/assets/avatars/sun.png', alt: 'Sunburst avatar' },
  { id: 'flower', src: '/assets/avatars/flower.png', alt: 'Flower avatar' },
  { id: 'running-heart', src: '/assets/avatars/yellowheart.png', alt: 'Running heart avatar' },
  { id: 'strawberry', src: '/assets/avatars/strawberry.png', alt: 'Strawberry avatar' },
  { id: 'banana', src: '/assets/avatars/banana.png', alt: 'Banana avatar' },
  { id: 'disco-ball', src: '/assets/avatars/disco.png', alt: 'Disco ball avatar' },
] as const

export type AvatarId = (typeof AVATAR_LIST)[number]['id']

/** The first avatar is the default. */
export const DEFAULT_AVATAR: AvatarId = AVATAR_LIST[0].id

/** The avatar for an id. Unknown ids (e.g. an old emoji avatar) get the default, so nothing breaks. */
export function avatarFor(id: string | null | undefined) {
  return AVATAR_LIST.find((a) => a.id === id) ?? AVATAR_LIST[0]
}

/** A stored avatar value as a valid id. Old emoji avatars become the default. */
export function resolveAvatar(value: string | null | undefined): AvatarId {
  return avatarFor(value).id
}
