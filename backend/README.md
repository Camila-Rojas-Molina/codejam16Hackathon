# Backend

Supabase (Postgres) backend for Travel Quest: players, matching, hunts, the GPS check, scoring and the leaderboard.

There's no server code to run. The logic lives in SQL functions inside the database, and the frontend calls them over Supabase's REST API (`frontend/src/lib/backend.ts`).

```
backend/
├── supabase/migrations/
│   ├── 001_schema.sql   tables, scoring, matching, GPS check, security
│   ├── 002_seed.sql     McGill hunts, partner pool, leaderboard teams
│   ├── 003_storage.sql  'selfies' storage bucket
│   ├── 004_migo_profiles.sql  one account, two modes: questionnaire, trips, local profile
│   └── 005_auth.sql     login (Supabase Auth): links profiles to logins, owner checks
└── tests/
    ├── smoke_test.sql          checks the hunt flow, then rolls back
    ├── migo_profiles_test.sql  checks accounts/profiles and mode switching, then rolls back
    ├── auth_test.sql           checks the login/owner rules, then rolls back
    └── local_supabase_stub.sql fake `auth` schema for testing on plain Postgres (never run on Supabase)
```

## Setup (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, then paste and run `001_schema.sql`, `002_seed.sql`, `003_storage.sql`, `004_migo_profiles.sql` and `005_auth.sql`, in that order.
3. Optional: paste and run `tests/smoke_test.sql`, `tests/migo_profiles_test.sql` and `tests/auth_test.sql`. They should say `All backend checks passed`, `All MIGO profile checks passed` and `All auth checks passed`.
4. Set up login in the dashboard (see [Supabase dashboard settings for login](#supabase-dashboard-settings-for-login)).
5. Go to **Project Settings → API** and copy the Project URL and the `anon` public key into `frontend/.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Never commit `.env.local`. Add the same two variables in Vercel for the deployed app.

To test on a local Postgres instead, run `tests/local_supabase_stub.sql` first (it fakes Supabase's `auth` schema and `auth.uid()`), then 001, 002, 004, 005 and the three tests. Skip 003 (it needs Supabase storage).

All migration files can be run again safely after changes. Running `002_seed.sql` again also puts the demo partners back in the match queue.

## Data model

| Table | What it holds |
|---|---|
| `profiles` | Players: name, avatar, `role` = the **current** mode (tourist/local, null until picked), fun fact, `has_dog`, `accessibility_needs` |
| `migo_profiles` | One JSON record per player: universal profile (incl. home city and cities discovered), tourist trips, local context, points, items and likes. `home_city` is pulled out for searching. |
| `hunts` | Places to find: photo, coordinates, time limit, points, trivia, `kind` (landmark, dog-park…), `accessible_for` |
| `teams` / `team_members` | One tourist and one local per team |
| `submissions` | One per team per hunt: where they were, time left, selfie path and the points breakdown |
| `leaderboard` (view) | Teams with members and total points |

## API

Call these from `frontend/src/lib/backend.ts`. Each one is a Postgres function.

| Function | Does |
|---|---|
| `create_profile(name, avatar, role, fun_fact, has_dog, accessibility_needs)` | Onboarding. Returns the new player. |
| `find_partner(profile_id)` | Pairs the player with someone of the opposite role who is waiting. Prefers the same dog status, then shared accessibility needs, then whoever waited longest. Returns the team, or `null` if nobody is waiting yet (the player joins the queue; call again). |
| `get_hunts(profile_id, lat, lng)` | Hunts for this player: dog park hunts only for dog owners, places that suit their accessibility needs first, then nearest. |
| `submit_selfie(team_id, hunt_id, seconds_left, lat, lng, selfie_path, demo)` | Checks the team is within 75 m of the spot (skipped when `demo` is true), then scores it. A team can score each hunt once. |

**MIGO accounts and profiles** (`004_migo_profiles.sql`). The app uses these automatically when the two Supabase variables are set (`frontend/src/lib/profileRepo.ts`); without them it saves on the device.

| Function | Does |
|---|---|
| `migo_create_account(name, avatar)` | Registration. No role: Tourist/Local is a mode, picked later. When signed in, the profile is linked to the login; a second profile for the same login fails with `23505` `This login already has a profile`. |
| `migo_my_profile()` | The signed-in user's profile, same shape as `migo_get_profile` (`{account, record}`). `null` if not signed in or no profile yet (then show registration). |
| `migo_get_profile(profile_id)` | The account and its saved record (`null` record before the first save, `null` if the account is gone). |
| `migo_update_account(profile_id, name, avatar)` | Name and avatar. |
| `migo_save_record(profile_id, record)` | Saves the whole record and keeps `profiles.role` (= active mode) and `has_dog` in sync, so `find_partner` keeps working. |
| `migo_delete_account(profile_id)` | Deletes the player and everything attached, and the login itself if the profile belongs to the caller's login. |

**Owner rule** (`005_auth.sql`): a profile created while signed in has `auth_user_id` set. Then `migo_get_profile`, `migo_update_account`, `migo_save_record` and `migo_delete_account` only work with that login's access token; anyone else (another user, or no login) gets errcode `42501` `Not your account`. Profiles without a login (demo/seed data and accounts made before login) work as before.

**Scoring** (same as `frontend/src/features/scoring/score.ts`, plus the first finder bonus):

```
base + speed bonus (base × time left / time limit × 0.5) + 50 for meeting someone new
     + first finder bonus: 1st team 100, 2nd 50, 3rd 25, then 0
```

## Security

- The browser can read `hunts`, `teams` and `leaderboard`, and can call the four functions above. It cannot write to any table directly, so points are always calculated on the server.
- Login is Supabase Auth (email + password). The app sends the user's access token, so `auth.uid()` identifies them and the `migo_*` functions only let a login touch its own profile. Gaps: profiles created without a login are still identified only by their id, and the hunt functions from `001_schema.sql` (`find_partner`, `get_hunts`, `submit_selfie`) don't check the login yet.
- `migo_save_record` accepts the whole record from the browser, including the points ledger and owned items. Before real use, move claiming rewards and buying items into their own functions that check them on the server (the rules are in `frontend/src/lib/api.ts` under "Points, challenges & shop").

## Supabase dashboard settings for login

- **Authentication → Sign In / Providers → Email**: enabled. For the hackathon turn **off "Confirm email"**, otherwise sign-up doesn't return a session and the app has to show a "check your email" step.
- **Authentication → URL Configuration**: Site URL = `https://migo.pqapp.dev`; add `http://localhost:5173` to Redirect URLs for local development.

## For the team

- **Dani (matching):** the matching order is the `order by` in `find_partner` in `001_schema.sql`. Replace it with your algorithm there.
- **Cami (maps, camera):** the server rechecks distance with the same haversine formula as `geo.ts`. If you change `ARRIVAL_RADIUS_M`, change `arrival_radius_m()` too.
- **Joyanne (UI):** `submitSelfie` returns `firstFinderBonus` and `findRank` as well as the usual breakdown, if you want to show "First team to find it!".
- **Dog park and accessibility hunts:** none are seeded yet. Add real, verified places using the example at the bottom of the hunts section in `002_seed.sql`.

## Hooking it into the app

`api.ts` still returns mock data, so nothing changes until we switch. The plan:

1. Onboarding: `createProfile(...)`, then store the returned id with the user.
2. Match: `findTeam(user.id)`. If it returns `null`, fall back to the mock partner.
3. Hunt list: `getHunts(user.id, position)`.
4. Selfie: `uploadSelfie(team.id, hunt.id, file)`, then `submitSelfie({ teamId, huntId, secondsLeft, position, selfiePath, demo })`. Catch `TooFarError` to show "Not quite there yet".
5. Leaderboard: `getLeaderboard()`.
