// The wearable drawings (catalogue: features/rewards/catalog/accessories.ts).
//
// Every drawing lives in its own local space, in "drawing units":
//   * 100 units = `Fit.w` of the avatar square (so a fit's `w` is the drawing's nominal width).
//   * (0, 0) is the drawing's ANCHOR, which `Fit.x` / `Fit.y` put on the avatar:
//       head  – centre of the line where the hat meets the head (hats grow upwards, −y);
//               floating pieces (halo, rain cloud) hover above that point
//       face  – the point between the eyes, lens centres at x = ±25
//       ears  – midpoint between the two ear spots, which sit at x = ±46
//       hair  – where the clip holds
//       neck  – centre of the neck line; strings start near x = ±50 and hang down (+y)
//       back  – centre of the piece (drawn behind the character)
//       hand  – the grip point, middle of a closed fist (drawn for a right-hand fist)
//   * `sw` is the outline width in drawing units; the renderer sets it so the outline matches the
//     characters' own line at any scale.
// Files: HatArt (head), FaceArt (face), SideArt (ears, hair), NeckArt (neck), CarryArt (back, hand).
import type { WearSlot } from '../../../features/economy/types'
import { BackArt, HandArt } from './CarryArt'
import { FaceArt } from './FaceArt'
import { HatArt } from './HatArt'
import { NeckArt } from './NeckArt'
import { EarsArt, HairArt } from './SideArt'

/** One wearable drawing, in its local space (see above). */
export function WearableArt({ slot, art, sw = 3 }: { slot: WearSlot; art: string; sw?: number }) {
  switch (slot) {
    case 'head':
      return <HatArt art={art} sw={sw} />
    case 'face':
      return <FaceArt art={art} sw={sw} />
    case 'ears':
      return <EarsArt art={art} sw={sw} />
    case 'hair':
      return <HairArt art={art} sw={sw} />
    case 'neck':
      return <NeckArt art={art} sw={sw} />
    case 'back':
      return <BackArt art={art} sw={sw} />
    case 'hand':
      return <HandArt art={art} sw={sw} />
    default:
      return null
  }
}
