# Profile: one person, one account, two ways to explore

Nobody is permanently a tourist or a local. Every account has one universal profile, and
**Tourist** and **Local** are modes the person switches between whenever they like.

## Data model (`types.ts`)

| Piece | What it holds | When it's filled |
|---|---|---|
| `Account` | name, avatar | registration (`/onboarding`) |
| `UniversalProfile` | **home city**, **cities discovered**, personality, interests, companion preferences, budget, pace, attractions, food, transport, group size, languages, accessibility | onboarding questionnaire (`/onboarding/questions`); cities can also be added on the profile |
| `TouristTrip[]` | destination, dates, group, trip budget, trip interests and activities, extra access needs | first time Tourist mode is used, then per trip (`/mode/tourist`, `/trips`) |
| `LocalContext` | hosting city (starts as the home city), neighbourhood, known areas, recommendations, hosting activities, languages, availability, duration, transport (dogs come from the universal profile) | first time Local mode is used (`/mode/local`) |
| `Rewards` | points ledger (balance = sum), owned shop items, what Migo is wearing | quests and the shop |
| `ProfileRecord` | all of the above, plus `activeMode`, `activeTripId`, `likes` and `universalCompletedAt` | |

Home city and cities discovered belong to the universal profile, so no mode can overwrite them.
Local mode's hosting city starts as the home city but is stored separately. Older saved profiles
without these fields still load (`normalizeRecord`); the profile page nudges people to add a home city.

### Cities discovered

Each city is a real place picked from search, never free text:
`{ id, name, country, countryCode, region?, lat, lng, placeId, source, refId?, addedAt }`.
`placeId` is the GeoNames id (`geonames:2267057`), so the same city is never added twice
(`addCity` in `model.ts` also treats the same name in the same country as a duplicate, ignoring
case and accents). `source` is `manual` today; `trip` or `quest` when they're added automatically
later, with `refId` pointing at the trip or quest.

Cities typed in before city search existed are kept with `lat`/`lng`/`placeId` set to `null`. They
show on the profile with a **Find it** button; picking the real place upgrades that entry in place.

Search (`features/places/`): `citySearch.ts` looks in the bundled list first (`src/data/cities.json`,
loaded only when the search opens, so it works offline), then adds smaller towns from Open-Meteo's
free geocoding API (GeoNames ids, no key). If that's unreachable, the bundled list is all you see.
`RetroAtlas.tsx` draws the pins on a pre-projected Natural Earth outline: plain SVG, no map library.

### Ranked exploring-buddy qualities

`companion.qualities` is an **ordered** list (most important first, up to 5), picked and ranked
with `components/ui/RankedChoices.tsx` (tap to pick; drag the handle, or use the up and down
buttons, to reorder). Old saved lists simply count in the order they were saved.

- New trips and the local profile are **pre-filled by copying** from the universal profile. Editing a trip
  or the local profile never changes the universal profile, and editing the universal profile never
  rewrites existing trips.
- Each context (each trip, and Local mode) keeps its own matched teammate in the store, so switching
  modes and switching back restores the match (`store/state.ts`, `contextKey`).

## Rules

- `flow.ts`: where someone belongs (`nextOnboardingStep`). Returning users never repeat onboarding.
- `model.ts`: blank values, validation (what's required) and normalising stored data.
- `privacy.ts`: `publicProfile()` is the only view another person may see. Accessibility is private
  unless `shareWithMatches` is on (notes are never shared). Each summary row's `visibility` tag must
  match this file.
- `matching.ts`: `toMatchProfile()` gives the effective, mode-aware preferences (trip overrides the
  defaults), and `compatibility()` is a simple weighted score per dimension. It's deliberately basic:
  swap it out later without changing what we collect.
- `matchingConfig.ts`: all the tunable numbers in one place.
  - `DIMENSION_WEIGHTS`: how much each dimension counts (qualities count as much as interests and
    languages).
  - `QUALITY_RANK_WEIGHTS = [1, 0.55, 0.3, 0.15, 0.08]`: how much each ranked quality counts. The
    first choice outweighs the second and third together.
  - The qualities score asks "how well does this person fit what I ranked highest?" in both directions
    and averages the two. How strongly someone shows a quality is read from their own answers
    (`QUALITY_SIGNALS`: e.g. *Chatty* from social energy, *On time* from planning style, *Knows their
    stuff* from Local mode). *Funny* and *Respects boundaries* can't be read from answers, so they
    only count when both people ranked them. Unranked means the dimension is skipped, not scored as 0.

## Persistence

Everything goes through `src/lib/api.ts`, which saves accounts and profile records through
`src/lib/profileRepo.ts`: to Supabase (`backend/supabase/migrations/004_migo_profiles.sql`) when
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, otherwise to this device
(`src/lib/profileDb.ts`). Settings shows which one is in use.

## Not built yet (isolated so it can be swapped in)

| What | Today | Where to plug it in |
|---|---|---|
| 3D map | MAP shows an empty workspace with a mount point | `features/map/MapWorkspace.tsx` |
| Live people discovery | Discover shows the demo partner pool, labelled "Sample" | `getPeopleToDiscover` in `api.ts` |
| Message delivery | Messages you send are saved on the device; nothing arrives from others | `getThreads` / `sendMessage` / `markThreadRead` in `api.ts` |
| Connecting | A tourist taps Connect on a local in Discover; the local says Connect or Not now. Accepted connections open in Messages and leave Discover on both sides. (The old `likes` list is kept in the record but no longer used.) | "People, connections & messages" in `api.ts`, `backend/supabase/migrations/013_connections.sql`, `features/chat/useConversations.ts` |
| Server-checked points | Rewards/purchases are validated in `api.ts` but stored in the client-sent record | "Points, challenges & shop" in `api.ts` |
| Quests | Weekly, daily (one refresh a day), travel adventures and getting-started quests; points checked on the server | `features/quests/catalog/`, `features/quests/engine.ts`, `backend/supabase/migrations/011_economy.sql` |
| Online city search | Works where Open-Meteo is reachable; otherwise only the bundled 7,680 larger cities show (the search says so) | `searchRemote` in `features/places/citySearch.ts` |
| Cities added automatically | `source: 'trip' / 'quest'` and `refId` are in the model, but nothing adds cities yet | `addCity(cities, place, source, refId)` in `model.ts` |
