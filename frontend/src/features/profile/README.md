# Profile: one person, one account, two ways to explore

Nobody is permanently a tourist or a local. Every account has one universal profile, and
**Tourist** and **Local** are modes the person switches between whenever they like.

## Data model (`types.ts`)

| Piece | What it holds | When it's filled |
|---|---|---|
| `Account` | name, avatar | registration (`/onboarding`) |
| `UniversalProfile` | personality, interests, companion preferences, budget, pace, attractions, food, transport, group size, languages, accessibility | onboarding questionnaire (`/onboarding/questions`) |
| `TouristTrip[]` | destination, dates, group, trip budget, trip interests and activities, extra access needs | first time Tourist mode is used, then per trip (`/mode/tourist`, `/trips`) |
| `LocalContext` | home city, neighbourhood, known areas, recommendations, hosting activities, languages, availability, duration, transport, dog preference | first time Local mode is used (`/mode/local`) |
| `ProfileRecord` | all of the above, plus `activeMode`, `activeTripId` and `universalCompletedAt` | |

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

Everything goes through `src/lib/api.ts`. Today `api.ts` stores accounts and profiles in
`src/lib/profileDb.ts` (device localStorage, keyed by account id). To move to Supabase, replace those
function bodies. The signatures and the `ProfileRecord` shape stay the same.
