# Profile: one person, one account, two ways to explore

Nobody is permanently a tourist or a local. Every account has one universal profile, and
**Tourist** and **Local** are modes the person switches between whenever they like.

## Data model (`types.ts`)

| Piece | What it holds | When it's filled |
|---|---|---|
| `Account` | name, avatar | registration (`/onboarding`) |
| `UniversalProfile` | **home city**, **cities discovered**, personality, interests, companion preferences, budget, pace, attractions, food, transport, group size, languages, accessibility | onboarding questionnaire (`/onboarding/questions`); cities can also be added on the profile |
| `TouristTrip[]` | destination, dates, group, trip budget, trip interests and activities, extra access needs | first time Tourist mode is used, then per trip (`/mode/tourist`, `/trips`) |
| `LocalContext` | home city, neighbourhood, known areas, recommendations, hosting activities, languages, availability, duration, transport, dog preference | first time Local mode is used (`/mode/local`) |
| `Rewards` | points ledger (balance = sum), owned shop items, what Migo is wearing | quests and the shop |
| `ProfileRecord` | all of the above, plus `activeMode`, `activeTripId`, `likes` and `universalCompletedAt` | |

Home city and cities discovered belong to the universal profile, so no mode can overwrite them. Each
discovered city records its `source` (`manual` today; `trip` or `quest` when they're added
automatically later) and an optional `refId`, so automatic additions can be traced and de-duplicated.
Local mode's hosting city starts as the home city but is stored separately. Older saved profiles
without these fields still load (`normalizeRecord`); the profile page nudges people to add a home city.

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
| Mutual interest | Likes are saved; matching likes isn't checked yet (messaging opens for teammates) | `setLiked` in `api.ts`, `canMessage` in `features/chat/useConversations.ts` |
| Server-checked points | Rewards/purchases are validated in `api.ts` but stored in the client-sent record | "Points, challenges & shop" in `api.ts` |
| More challenges | One daily + three starter challenges | `features/quests/challenges.ts` |
