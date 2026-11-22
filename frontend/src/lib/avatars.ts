// The avatar catalogue: the character pictures in public/assets/avatars/. Accounts store the id
// ("strawberry"), never the path, so ids are permanent: never rename or delete an entry that real
// accounts may use (mark it `legacy` instead). How to add pictures: public/assets/README.md.
//
// Every picture is a 500×500 PNG with a transparent background and the character centred with
// roughly 15% clear space around it, so they all frame the same in the square avatar stamp.
// `landmarks` record where the character's features are, measured on the picture (see
// AvatarLandmarks). Shop accessories don't compute their placement from them at runtime: every
// accessory carries an explicit, visually checked placement per avatar
// (features/rewards/catalog/accessories.ts `fits`), and these landmarks are the reference those
// placements were derived from. A new avatar needs its landmarks here plus a fit on each accessory
// it can wear (anything without a fit shows "doesn't fit your avatar").

/** A point in the picture's own 0–1 square (x right, y down). */
export type Pt = { x: number; y: number }

/**
 * Measured features of one character picture, in its 0–1 square. These are objects with faces, so
 * "head", "ears" and "neck" are the sensible equivalents on each shape (documented per avatar).
 */
export type AvatarLandmarks = {
  /** Bounding box of the drawn character: [left, top, right, bottom]. */
  bounds: [number, number, number, number]
  /** Highest point of the head shape (where a floating halo centres). */
  headTop: Pt
  /** Where a hat rests: centre of the hat line, the head's width along it, and its tilt (° clockwise). */
  hat: Pt & { w: number; r: number }
  /** Eye centres (for sunglasses: on a character with built-in shades, the lens centres). */
  eyes: { l: Pt; r: Pt }
  /** Centre of the mouth. */
  mouth: Pt
  /** Left and right edge of the head shape at eye level (headphone cups, earrings). */
  sides: { l: Pt; r: Pt }
  /** The neck line: where a necklace or scarf sits, with the shape's width there. */
  neck: Pt & { w: number }
  /** Closed fists that can hold something, if the character has hands. */
  hands?: { l?: Pt; r?: Pt }
  /** Already wearing sunglasses in the picture. */
  builtInShades?: boolean
  /** How the shape maps to a head/neck, in words. */
  notes: string
}

export type AvatarArt = {
  id: string
  src: string
  /** Names the character for screen readers ("Strawberry in sunglasses"). */
  alt: string
  /** Old picture kept so accounts that chose it still show it. Hidden from pickers once the new set is live. */
  legacy?: boolean
  /** Part of the new avatar set: only offered once NEW_AVATAR_SET_READY is true. */
  newSet?: boolean
  /** Visual size correction inside the stamp (1 = as drawn). Keep the art itself consistently framed. */
  scale?: number
  /** Measured features (reference for accessory fits). */
  landmarks?: AvatarLandmarks
}

/**
 * Flip to true once the 9 new avatar pictures are in public/assets/avatars/ and listed in
 * NEW_AVATARS below. Pickers then offer the 9 new + 3 kept pictures and hide the legacy ones
 * (accounts already using a legacy picture keep seeing it).
 */
export const NEW_AVATAR_SET_READY = false

/** The 3 pictures that stay in the new set. */
const KEPT_AVATARS: AvatarArt[] = [
  {
    id: 'running-heart',
    src: '/assets/avatars/yellowheart.png',
    alt: 'Yellow heart, running',
    anchors: { head: { x: 0.54, y: 0.22, w: 0.44, r: -4 }, face: { x: 0.53, y: 0.37, w: 0.3 }, neck: { x: 0.52, y: 0.55, w: 0.3 } },
  },
  {
    id: 'strawberry',
    src: '/assets/avatars/strawberry.png',
    alt: 'Strawberry in sunglasses',
    anchors: { head: { x: 0.51, y: 0.215, w: 0.4 }, face: { x: 0.5, y: 0.4, w: 0.34 }, neck: { x: 0.51, y: 0.58, w: 0.32 } },
  },
  {
    id: 'banana',
    src: '/assets/avatars/banana.png',
    alt: 'Banana pointing and grinning',
    anchors: { head: { x: 0.66, y: 0.33, w: 0.28, r: 10 }, face: { x: 0.625, y: 0.43, w: 0.2, r: -8 }, neck: { x: 0.6, y: 0.58, w: 0.3, r: -10 } },
  },
]

/**
 * The 9 new pictures, in picker order. Empty until the files arrive: add one entry per file
 * (id, src, alt, newSet: true, and anchors if the face isn't centred), then flip NEW_AVATAR_SET_READY.
 */
const NEW_AVATARS: AvatarArt[] = []

/** Pictures from the first set. Kept so existing accounts (many use "star") still render. */
const LEGACY_AVATARS: AvatarArt[] = [
  {
    id: 'star',
    src: '/assets/avatars/star.png',
    alt: 'Teal star',
    legacy: true,
    anchors: { head: { x: 0.5, y: 0.28, w: 0.26 }, face: { x: 0.5, y: 0.45, w: 0.32 }, neck: { x: 0.5, y: 0.7, w: 0.36 } },
  },
  {
    id: 'heart',
    src: '/assets/avatars/redheart.png',
    alt: 'Red heart',
    legacy: true,
    anchors: { head: { x: 0.5, y: 0.28, w: 0.46 }, face: { x: 0.5, y: 0.48, w: 0.26 }, neck: { x: 0.5, y: 0.64, w: 0.3 } },
  },
  {
    id: 'sunburst',
    src: '/assets/avatars/sun.png',
    alt: 'Smiling sun',
    legacy: true,
    anchors: { head: { x: 0.5, y: 0.32, w: 0.32 }, face: { x: 0.5, y: 0.47, w: 0.22 }, neck: { x: 0.5, y: 0.63, w: 0.26 } },
  },
  {
    id: 'flower',
    src: '/assets/avatars/flower.png',
    alt: 'Smiling daisy',
    legacy: true,
    anchors: { head: { x: 0.5, y: 0.37, w: 0.3 }, face: { x: 0.5, y: 0.5, w: 0.22 }, neck: { x: 0.5, y: 0.66, w: 0.28 } },
  },
  {
    id: 'disco-ball',
    src: '/assets/avatars/disco.png',
    alt: 'Disco ball in sunglasses',
    legacy: true,
    anchors: { head: { x: 0.56, y: 0.22, w: 0.38 }, face: { x: 0.525, y: 0.37, w: 0.32 }, neck: { x: 0.56, y: 0.61, w: 0.3 } },
  },
]

/** Every known avatar, including legacy and not-yet-offered ones. Used to draw a stored id. */
export const AVATAR_CATALOG: readonly AvatarArt[] = [...NEW_AVATARS, ...KEPT_AVATARS, ...LEGACY_AVATARS]

/** The pictures people can choose, in picker order (9 new + 3 kept once the new set is ready). */
export const AVATAR_LIST: readonly AvatarArt[] = NEW_AVATAR_SET_READY
  ? AVATAR_CATALOG.filter((a) => !a.legacy)
  : AVATAR_CATALOG.filter((a) => !a.newSet)

export type AvatarId = string

/** New accounts start on the first kept picture (the yellow heart). */
export const DEFAULT_AVATAR: AvatarId = KEPT_AVATARS[0].id

const DEFAULT_ART = KEPT_AVATARS[0]

/** The picture for a stored id. Unknown ids (old emoji, a removed picture) get the default, so nothing breaks. */
export function avatarFor(id: string | null | undefined): AvatarArt {
  return AVATAR_CATALOG.find((a) => a.id === id) ?? DEFAULT_ART
}

/** A stored avatar value as a known id (legacy ids stay as they are). Old emoji avatars become the default. */
export function resolveAvatar(value: string | null | undefined): AvatarId {
  return avatarFor(value).id
}

/** Accessory anchors for an avatar, with defaults for pictures that don't define them. */
export function avatarAnchors(id: string | null | undefined): AvatarAnchors {
  return avatarFor(id).anchors ?? DEFAULT_ANCHORS
}
