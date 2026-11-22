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
    landmarks: {
      bounds: [0.164, 0.172, 0.838, 0.83],
      headTop: { x: 0.545, y: 0.2 },
      hat: { x: 0.545, y: 0.235, w: 0.42, r: 3 },
      eyes: { l: { x: 0.464, y: 0.37 }, r: { x: 0.592, y: 0.368 } },
      mouth: { x: 0.525, y: 0.51 },
      sides: { l: { x: 0.325, y: 0.37 }, r: { x: 0.765, y: 0.37 } },
      neck: { x: 0.53, y: 0.555, w: 0.3 },
      hands: { l: { x: 0.255, y: 0.405 }, r: { x: 0.585, y: 0.585 } },
      notes: 'Heart-shaped head and body in one. Hat line across both lobes (left lobe a little higher). Neck = the narrowing below the mouth, above the point.',
    },
  },
  {
    id: 'strawberry',
    src: '/assets/avatars/strawberry.png',
    alt: 'Strawberry in sunglasses',
    landmarks: {
      bounds: [0.144, 0.12, 0.844, 0.89],
      headTop: { x: 0.54, y: 0.13 },
      hat: { x: 0.54, y: 0.2, w: 0.38, r: 4 },
      eyes: { l: { x: 0.368, y: 0.404 }, r: { x: 0.535, y: 0.408 } },
      mouth: { x: 0.45, y: 0.49 },
      sides: { l: { x: 0.31, y: 0.42 }, r: { x: 0.725, y: 0.42 } },
      neck: { x: 0.5, y: 0.545, w: 0.3 },
      hands: { l: { x: 0.245, y: 0.36 }, r: { x: 0.775, y: 0.55 } },
      builtInShades: true,
      notes: 'Berry is head and body; the leafy top is its hair, so hats sit on the leaves. Face turned a little to its right (picture left). Neck = below the mouth where the berry tapers.',
    },
  },
  {
    id: 'banana',
    src: '/assets/avatars/banana.png',
    alt: 'Banana pointing and grinning',
    landmarks: {
      bounds: [0.2, 0.088, 0.8, 0.912],
      headTop: { x: 0.67, y: 0.1 },
      hat: { x: 0.69, y: 0.33, w: 0.18, r: 4 },
      eyes: { l: { x: 0.585, y: 0.432 }, r: { x: 0.66, y: 0.426 } },
      mouth: { x: 0.62, y: 0.52 },
      sides: { l: { x: 0.56, y: 0.43 }, r: { x: 0.785, y: 0.43 } },
      neck: { x: 0.66, y: 0.585, w: 0.24 },
      hands: { l: { x: 0.37, y: 0.48 }, r: { x: 0.58, y: 0.6 } },
      notes: 'Tall curved banana; the face is on the upper third, the stalk is the very top. Hats sit just above the eyes where the fruit is ~0.17 wide. Neck = below the grin, behind the lower hand.',
    },
  },
]

/**
 * The 9 new pictures, in picker order. Empty until the files arrive: add one entry per file
 * (id, src, alt, newSet: true, plus measured landmarks), then flip NEW_AVATAR_SET_READY.
 */
const NEW_AVATARS: AvatarArt[] = []

/** Pictures from the first set. Kept so existing accounts (many use "star") still render. */
const LEGACY_AVATARS: AvatarArt[] = [
  {
    id: 'star',
    src: '/assets/avatars/star.png',
    alt: 'Teal star',
    legacy: true,
    landmarks: {
      bounds: [0.138, 0.154, 0.862, 0.846],
      headTop: { x: 0.5, y: 0.18 },
      hat: { x: 0.5, y: 0.31, w: 0.16, r: 0 },
      eyes: { l: { x: 0.433, y: 0.477 }, r: { x: 0.574, y: 0.477 } },
      mouth: { x: 0.5, y: 0.645 },
      sides: { l: { x: 0.36, y: 0.4 }, r: { x: 0.64, y: 0.4 } },
      neck: { x: 0.5, y: 0.7, w: 0.34 },
      notes: 'Five-point star, face in the middle. Head = the top arm (hats sit over its tip). "Ears" = the inner corners beside the top arm. Neck = below the smile, above the bottom notch. No hands.',
    },
  },
  {
    id: 'heart',
    src: '/assets/avatars/redheart.png',
    alt: 'Red heart',
    legacy: true,
    landmarks: {
      bounds: [0.164, 0.224, 0.836, 0.812],
      headTop: { x: 0.5, y: 0.31 },
      hat: { x: 0.5, y: 0.34, w: 0.5, r: 0 },
      eyes: { l: { x: 0.455, y: 0.485 }, r: { x: 0.548, y: 0.485 } },
      mouth: { x: 0.5, y: 0.615 },
      sides: { l: { x: 0.205, y: 0.47 }, r: { x: 0.795, y: 0.47 } },
      neck: { x: 0.5, y: 0.665, w: 0.32 },
      notes: 'Wide symmetric heart. Hats sit over the notch between the lobes. Sides at eye level are the outline edges. Neck = below the smile where the heart narrows.',
    },
  },
  {
    id: 'sunburst',
    src: '/assets/avatars/sun.png',
    alt: 'Smiling sun',
    legacy: true,
    landmarks: {
      bounds: [0.196, 0.182, 0.804, 0.818],
      headTop: { x: 0.5, y: 0.21 },
      hat: { x: 0.5, y: 0.35, w: 0.26, r: 0 },
      eyes: { l: { x: 0.46, y: 0.473 }, r: { x: 0.54, y: 0.473 } },
      mouth: { x: 0.5, y: 0.585 },
      sides: { l: { x: 0.345, y: 0.47 }, r: { x: 0.655, y: 0.47 } },
      neck: { x: 0.5, y: 0.635, w: 0.26 },
      notes: 'Round core with 10 wavy rays. Head = the top of the core (a hat covers the top ray). Sides = the inner ray corners at eye level. Neck = bottom of the core.',
    },
  },
  {
    id: 'flower',
    src: '/assets/avatars/flower.png',
    alt: 'Smiling daisy',
    legacy: true,
    landmarks: {
      bounds: [0.192, 0.164, 0.808, 0.846],
      headTop: { x: 0.5, y: 0.165 },
      hat: { x: 0.5, y: 0.365, w: 0.28, r: 0 },
      eyes: { l: { x: 0.443, y: 0.48 }, r: { x: 0.544, y: 0.48 } },
      mouth: { x: 0.5, y: 0.585 },
      sides: { l: { x: 0.35, y: 0.49 }, r: { x: 0.65, y: 0.49 } },
      neck: { x: 0.5, y: 0.648, w: 0.26 },
      notes: 'Round yellow face (centre 0.5, 0.5, radius 0.15) inside six petals. Head = top of the face disc (petals behind act like hair). Neck = bottom of the disc.',
    },
  },
  {
    id: 'disco-ball',
    src: '/assets/avatars/disco.png',
    alt: 'Disco ball in sunglasses',
    legacy: true,
    landmarks: {
      bounds: [0.18, 0.1, 0.82, 0.9],
      headTop: { x: 0.58, y: 0.205 },
      hat: { x: 0.58, y: 0.235, w: 0.34, r: 6 },
      eyes: { l: { x: 0.43, y: 0.357 }, r: { x: 0.556, y: 0.371 } },
      mouth: { x: 0.465, y: 0.42 },
      sides: { l: { x: 0.385, y: 0.37 }, r: { x: 0.765, y: 0.37 } },
      neck: { x: 0.54, y: 0.55, w: 0.3 },
      hands: { l: { x: 0.25, y: 0.165 }, r: { x: 0.69, y: 0.565 } },
      builtInShades: true,
      notes: 'Ball (centre 0.57, 0.405, radius 0.195) is head and body; face turned to its right (picture left) and tilted ~6°. Neck = lower part of the ball above the legs.',
    },
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
