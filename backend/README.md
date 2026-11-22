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
│   ├── 005_auth.sql     login (Supabase Auth): links profiles to logins, owner checks
│   ├── 006_gallery.sql  photo gallery: private `photos` table + 'gallery' storage bucket
│   ├── 007_economy.sql  points, quests and the shop, decided by the server (+ carries over old points)
│   └── 008_economy_catalog.sql  GENERATED: the quest and shop catalogues (`npm run gen:economy`)
└── tests/
    ├── smoke_test.sql          checks the hunt flow, then rolls back
    ├── migo_profiles_test.sql  checks accounts/profiles and mode switching, then rolls back
    ├── auth_test.sql           checks the login/owner rules, then rolls back
    ├── gallery_test.sql        checks the gallery owner rules, ordering and delete, then rolls back
    ├── economy_test.sql        checks points, quests, refreshes, the shop and timezones, then rolls back
    └── local_supabase_stub.sql fake `auth` schema for testing on plain Postgres (never run on Supabase)
```

## Setup (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, then paste and run `001_schema.sql`, `002_seed.sql`, `003_storage.sql`, `004_migo_profiles.sql`, `005_auth.sql`, `006_gallery.sql`, `007_economy.sql` and `008_economy_catalog.sql`, in that order.
3. Optional: paste and run `tests/smoke_test.sql`, `tests/migo_profiles_test.sql`, `tests/auth_test.sql`, `tests/gallery_test.sql` and `tests/economy_test.sql`. They should say `All backend checks passed`, `All MIGO profile checks passed`, `All auth checks passed`, `All gallery checks passed` and `All economy checks passed`.
4. Set up login in the dashboard (see [Supabase dashboard settings for login](#supabase-dashboard-settings-for-login)).
5. Go to **Project Settings → API** and copy the Project URL and the `anon` public key into `frontend/.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Never commit `.env.local`. Add the same two variables in Vercel for the deployed app.

To test on a local Postgres instead, run `tests/local_supabase_stub.sql` first (it fakes Supabase's `auth` schema and `auth.uid()`), then 001, 002, 004, 005, 006, 007, 008 and the five tests. Skip 003 (it needs Supabase storage).

```
for f in tests/local_supabase_stub.sql supabase/migrations/00{1,2,4,5,6,7,8}_*.sql tests/*_test.sql; do
  psql -v ON_ERROR_STOP=1 -d <your test db> -f "$f" || break
done
```

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
| `photos` | Gallery photos (006) |
| `points_ledger`, `inventory`, `equipped` | MIGO points (one row per change), owned shop items, what the avatar wears (007) |
| `quest_defs`, `shop_items` | The server's copy of the quest and shop catalogues (008) |
| `quest_assignments`, `daily_refreshes`, `app_visits`, `seen_cities`, `legacy_imports` | Quests given to each person per period, and what their progress is measured from (007) |

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
| `migo_save_record(profile_id, record)` | Saves the whole record and keeps `profiles.role` (= active mode) and `has_dog` in sync, so `find_partner` keeps working. Since 007, `record.rewards` is ignored and replaced with a read-only copy built from the points tables. |
| `migo_delete_account(profile_id)` | Deletes the player and everything attached, and the login itself if the profile belongs to the caller's login. |

**Owner rule** (`005_auth.sql`): a profile created while signed in has `auth_user_id` set. Then `migo_get_profile`, `migo_update_account`, `migo_save_record` and `migo_delete_account` only work with that login's access token; anyone else (another user, or no login) gets errcode `42501` `Not your account`. Profiles without a login (demo/seed data and accounts made before login) work as before.

**Scoring** (same as `frontend/src/features/scoring/score.ts`, plus the first finder bonus):

```
base + speed bonus (base × time left / time limit × 0.5) + 50 for meeting someone new
     + first finder bonus: 1st team 100, 2nd 50, 3rd 25, then 0
```

## Gallery (`006_gallery.sql`)

Photos people take while exploring, shown on the app's `/gallery` page. Needs a login: the page explains this instead of uploading when Supabase isn't configured or nobody is signed in.

**Set up:** after `005_auth.sql`, paste and run `006_gallery.sql` in the SQL Editor (safe to run again), then optionally `tests/gallery_test.sql`, which should say `All gallery checks passed`. The file also creates the `gallery` storage bucket and its policies. That part only runs where Supabase's `storage` schema exists, so on a local Postgres (stub, 001, 002, 004, 005, 006, then the tests) it prints `skipped the gallery bucket` and the test covers the database side only.

**How a photo is saved** (`frontend/src/lib/backend.ts`, `uploadPhoto`): the browser shrinks the picture to at most 1600 px (JPEG), uploads it to `gallery/<auth uid>/<random id>.jpg` with the user's access token, then calls `gallery_add_photo` with that path. Photos are shown from the public URL `/storage/v1/object/public/gallery/<path>`.

| Function | Does |
|---|---|
| `gallery_add_photo(profile_id, storage_path, meta)` | Saves a photo row. Signed-in only, and the profile must belong to that login. `storage_path` must be `<your auth uid>/<name>.jpg\|jpeg\|png\|webp`. `meta` (all optional): `city_name`, `country`, `country_code`, `lat`, `lng`, `place_id`, `caption` (≤ 200 characters), `quest_id`, `hunt_id`, `taken_at` (never later than now; default now), `width`, `height`. Returns the photo. |
| `gallery_list(profile_id)` | The profile's photos as a JSON array, newest `taken_at` first. |
| `gallery_delete_photo(profile_id, photo_id)` | Deletes the row and returns its `storage_path`, so the app deletes the file through the Storage API. |

Errors: `42501` not signed in / `Not your account` / not your folder, `22023` bad details, `23505` path already saved, `P0002` unknown profile or photo.

**Rules:** the `photos` table has RLS on and no grants, so it's only reachable through these functions (owner rule as in 005). Storage policies let a signed-in user upload, replace, list and delete files only under their own `<auth uid>/` folder. The bucket is public-read (8 MB per file, JPEG/PNG/WebP), like `selfies`: file names are random, but anyone who has a photo's URL can open it. Gap: deleting the whole account removes the photo rows but not the files; clean those up from **Storage** in the dashboard (or delete them from the app first).

## Points, quests and the shop (`007_economy.sql`, `008_economy_catalog.sql`)

The server owns MIGO points. The browser only sends ids ("claim this quest", "buy this item"); the server checks eligibility, uses its own reward or price, and returns the whole state. The shapes are in `frontend/src/features/economy/types.ts` (`EconomyState`, `QuestAssignment`, `QuestCondition`), and the app calls these through `frontend/src/lib/backend.ts`.

**Set up:** after 006, run `007_economy.sql`, then `008_economy_catalog.sql` (both safe to run again), then optionally `tests/economy_test.sql` (`All economy checks passed`). 007 carries over everyone's existing points, items and equipped items from their saved record (see below), so run it before people use the new app.

**Changing a catalogue** (`frontend/src/features/quests/catalog/*`, `frontend/src/features/rewards/catalog/*`): in `frontend/`, run `npm run gen:economy` (rewrites 008), `npm run check:economy` (reward/price bands, unique ids, the 12 original item ids, every accessory has a fit, 008 up to date), commit, then run the new 008 in the SQL Editor. Never rename or delete an id: set `retired: true`. 008 never deletes; ids missing from the catalogue are marked retired.

| Function | Does |
|---|---|
| `economy_state(profile_id)` | The `EconomyState`: balance, totals, the newest 50 ledger rows, owned and equipped items, current quests with progress, history, whether the daily refresh is left, next reset times. Issues the period's quests the first time it's called in a period and marks old ones expired. |
| `economy_claim(profile_id, assignment_id)` | Pays a finished quest once (progress recomputed here; reward from `quest_defs`). Calling it again returns the state without paying. |
| `economy_refresh_daily(profile_id, assignment_id)` | Swaps one of today's unfinished dailies for a different one that isn't already finished today (so a refresh is never a free reward). Once a day; if nothing fits, the refresh isn't used up. No points. |
| `economy_purchase(profile_id, item_id)` | Buys at the `shop_items` price if the balance covers it. Never equips. Buying something already owned does nothing. |
| `economy_equip(profile_id, slot, item_id or null)` | Wears an owned item in its own slot, or empties the slot. |
| `economy_record_visit(profile_id, page)` | `map`, `shop`, `gallery`, `chat` or `quests` was opened (for "visit" quests). Keeps the first and the latest visit per page: daily visit quests need a visit since the day began, starter ones any visit ever. Returns nothing. |
| `economy_set_timezone(profile_id, tz)` | Saves the IANA timezone days and weeks are counted in. Must be a real zone; the first change is free, then at most one every 20 hours. Returns nothing. |

All of them apply the owner rule from 005 (`42501` `Not your account`), so they work for signed-in profiles and for device accounts without a login, and lock the profile row first so two requests for one person run one after the other. Errors: `P0002` unknown profile/quest/item, `22023` bad input (unknown slot, page or timezone, wrong slot for the item, retired item, refreshing a non-daily), `P0001` a rule said no, with a HINT the app can switch on: `not_finished`, `expired`, `completed`, `claimable` (finished dailies can't be refreshed: claim them), `refresh_used`, `none_available`, `insufficient_points`, `not_owned`, `timezone_rate_limited`.

**Rules**
- Every points change is one `points_ledger` row with a ref that's unique per person (`quest:<assignment id>`, `purchase:<item id>`, `legacy:<old refId>`), so nothing can pay or charge twice. A trigger refuses any insert that would take a balance below zero, and ledger rows can't be edited.
- Quests per person: 1 weekly and 3 adventures per ISO week (Monday 00:00), 3 dailies per day (00:00), all in their saved timezone using the server clock; every starter quest once (never expires). Weekly: random, not one from the last 4 weeks. Dailies: 3 different ones, none from the last 3 days. Adventures: matched to the person's interests (plus the trip's in Tourist mode), then to their pace (relaxed → light, balanced → moderate, fast → big), random among equals, none from the last 2 weeks. ("Not recent" gives way only when nothing else fits.) Everything skips quests for the other mode and quests whose `avoid_for` matches their accessibility needs. At most one companion-only quest per period and never as the only option; a companion-only weekly only for someone who has already done a hunt with a teammate.
- Progress is computed from stored data, inside the quest's period: hunts (`submissions` of the person's teams; "with a partner" = a team of two), gallery photos (by upload time; cities by place id or name), new cities (pinned in the saved record, `addedAt` in the period AND first seen by the server in the period, so re-adding a city doesn't make it new), the saved profile, page visits, other completed quests, purchases, what's equipped.
- Timezones can't be used to farm quests: a period + slot is only ever issued once, periods only move forward (moving west keeps today's quests instead of issuing "yesterday"), and changes are limited to one per 20 hours. Quest windows move with the timezone. The first timezone a profile saves is the one exception: quests issued before it (in UTC) that nobody has touched are discarded and issued again in the real local day.
- `migo_save_record` replaces `record.rewards` with a mirror of these tables (newest 200 ledger rows plus summary rows, so the sum is still the balance), so older app versions keep showing the right numbers but can't add points. Each economy write refreshes the mirror too.

**Old points** (`economy_import_legacy()`, run by 007): for every saved record not imported yet, each old `rewards.ledger` entry becomes a `legacy` ledger row (`legacy:<refId>`, same amount, label and time; a repeated refId gets `#2`, `#3`…), `owned` becomes inventory (price paid taken from the old `item:<id>` purchase, else 0) and `equipped` stays equipped, so balances are identical. Old claims count: a starter or daily quest claimed under the old system (`challenge:<id>:once` / `challenge:<id>:<day>`) shows as completed and doesn't pay again. Imported profiles are recorded in `legacy_imports`, so running 007 again imports nothing twice.

**Testing time:** every function reads the clock from `economy_now()`. It returns `now()` unless the session setting `economy.test_now` is set (`select set_config('economy.test_now', '2026-11-23 10:00Z', true)`), which only `tests/economy_test.sql` does. Browsers can't set it: PostgREST only sets its own `request.*` settings (headers and JWT claims arrive as `request.headers` / `request.jwt.claims`; `Prefer: timezone` only changes how times are printed), the API roles can't run SQL or call `set_config` through the API, and the setting is ignored outright for PostgREST's `authenticator` login.

**Gaps:** progress for hunts relies on `submit_selfie`, which (like the other 001 hunt functions) doesn't check the login yet. Device accounts without a login are identified only by their id, as everywhere else. Page visits are reported by the app, so a "visit" quest proves the app was opened, nothing more.

## Security

- The browser can read `hunts`, `teams` and `leaderboard`, and can call the four functions above. It cannot write to any table directly, so points are always calculated on the server.
- Login is Supabase Auth (email + password). The app sends the user's access token, so `auth.uid()` identifies them and the `migo_*` functions only let a login touch its own profile. Gaps: profiles created without a login are still identified only by their id, and the hunt functions from `001_schema.sql` (`find_partner`, `get_hunts`, `submit_selfie`) don't check the login yet.
- Points, quest rewards, purchases and equipped items are decided by the `economy_*` functions (007). `migo_save_record` still saves the rest of the record from the browser, but ignores `record.rewards`.

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
