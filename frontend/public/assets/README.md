# Static assets

Shared images, icons and other files for the app. Committed to git, so everyone sees the same files.

Use them in code with an absolute path: `/assets/your-file.png`.

Prefer lowercase names with dashes (`map-pin.png`), and keep images small (compress before adding).

## Mascot (`mascot/`)

Migo the walking globe: ten poses cut out from the official character sheets (never redrawn),
saved as WebP at 2x. Use them through `<Mascot pose="…" />` (`src/components/illustrations/Mascot.tsx`),
which lists the pose for each moment: `hello`, `glide`, `leap`, `read`, `goodies`, `play`,
`curious`, `cheer` (also the shop wardrobe pose), `search` (loading) and `ponder` (empty and error states).

## Avatars (`avatars/`)

Profile pictures. Accounts store the id (`strawberry`), never the path: see `src/lib/avatars.ts`.
