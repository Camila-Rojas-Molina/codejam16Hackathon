# Static assets

Shared images, icons and other files for the app. Committed to git, so everyone sees the same files.

Use them in code with an absolute path: `/assets/your-file.png`.

Prefer lowercase names with dashes (`map-pin.png`), and keep images small (compress before adding).

## Mascot (`mascot/`)

Migo the walking globe: ten poses cut out of the official high-resolution character sheets. The art
is never redrawn or retouched: only the cream background is removed, with soft anti-aliased edges
and no light fringe, so the poses sit cleanly on dark backgrounds too.

| File | Size | Use |
| --- | --- | --- |
| `<pose>.webp` | the sheet's full resolution, 445–686 px wide, 497–779 px tall | about 3x the largest size in the app (`h-52`) |
| `<pose>-sm.webp` | 360 px tall | small spots and 2x phones |
| `nav-icon.webp` | 192 × 192, transparent | Migo's face (from `cheer`), for the MAP nav icon |

Poses: `hello`, `glide`, `leap`, `read`, `goodies`, `play`, `curious`, `cheer`, `search` (loading)
and `ponder` (empty and error states). Use them through `<Mascot pose="…" />`
(`src/components/illustrations/Mascot.tsx`), which lists the pose for each moment and lets the
browser pick the full or `-sm` file from the rendered size (`srcset`). If you re-cut a pose, keep
the file names and update the pixel sizes in `Mascot.tsx` (`SIZES`).

## Avatars (`avatars/`)

Profile pictures. Accounts store the id (`strawberry`), never the path. The catalogue is
`src/lib/avatars.ts`: picker order, alt text, framing and where shop accessories sit on each one.

The set is 12 pictures: 9 new ones plus the 3 kept from the first set (`yellowheart.png`,
`strawberry.png`, `banana.png`). The other first-set pictures (`star`, `redheart`, `sun`, `flower`,
`disco`) are marked `legacy`: they stay in the folder so accounts that chose them still show them,
but pickers hide them once the new set is live. Don't delete them.

### Adding the 9 new avatars

1. **Files.** One PNG per character, **500 × 500 px, transparent background**, lowercase name with
   dashes (`hot-air-balloon.png`). Put them in `public/assets/avatars/`.
2. **Framing.** Same as the existing pictures: the character centred in the square, about 300–360 px
   wide or tall (the existing ones leave 45–110 px of clear space on each side), nothing touching
   the edges, no background colour, no shadow under the character. Open
   `strawberry.png` next to yours to compare. Every picture is shown at the same size in a square
   stamp, so a character drawn much smaller or bigger than the others will look it.
3. **Catalogue.** In `src/lib/avatars.ts`, add one entry per file to `NEW_AVATARS`, in picker order:

   ```ts
   { id: 'hot-air-balloon', src: '/assets/avatars/hot-air-balloon.png', alt: 'Hot-air balloon with a big grin', newSet: true },
   ```

   The `id` is saved in accounts: pick it once and never change it. The `alt` names the character
   for screen readers.
4. **Accessory anchors** (optional but recommended). If the face isn't centred in the square, add
   `anchors` so shop items sit right: `head` = centre of where a hat brim rests, `face` = centre of the
   eye line, `neck` = centre of the collar line, each as `{ x, y, w, r? }` in the picture's 0–1 square
   (`w` = width of the head / eye span / collar, `r` = tilt in degrees). Without them the defaults
   assume a front-facing character centred in the square. Check in the Shop: try on a hat, glasses
   and a scarf.
5. **Go live.** Set `NEW_AVATAR_SET_READY = true` in `src/lib/avatars.ts`. Pickers then offer the
   9 new + 3 kept pictures; legacy ones are hidden (someone still using one sees it first in their
   picker, so their choice never disappears).

Unknown ids (old emoji avatars, typos) always fall back to the default picture (the yellow heart).
