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
│   ├── 007_landmarks_geofencing.sql  Montréal landmarks, PostGIS geofences, camera captures, visits
│   ├── 008_montreal_island_boundary.sql  Island of Montréal boundary (generated)
│   ├── 009_landmarks_seed.sql  the landmark catalogue (generated)
│   ├── 010_simple_recommendations.sql  rule-based recommendations from Questionnaire B
│   ├── 011_economy.sql  points, quests and the shop, decided by the server (+ carries over old points)
│   └── 012_economy_catalog.sql  GENERATED: the quest and shop catalogues (`npm run gen:economy`)
├── scripts/import_landmarks.mjs  rebuilds 008/009 from Montréal open data (see scripts/README.md)
└── tests/
    ├── smoke_test.sql          checks the hunt flow, then rolls back
    ├── migo_profiles_test.sql  checks accounts/profiles and mode switching, then rolls back
    ├── auth_test.sql           checks the login/owner rules, then rolls back
    ├── gallery_test.sql        checks the gallery owner rules, ordering and delete, then rolls back
    ├── explore_test.sql        checks geofences, the island boundary, visits and owner rules, then rolls back
    ├── economy_test.sql        checks points, quests, refreshes, the shop and timezones, then rolls back
    └── local_supabase_stub.sql fake `auth` schema for testing on plain Postgres (never run on Supabase)
```

## Setup (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, then paste and run `001_schema.sql`, `002_seed.sql`, `003_storage.sql`, `004_migo_profiles.sql`, `005_auth.sql`, `006_gallery.sql`, `007_landmarks_geofencing.sql`, `008_montreal_island_boundary.sql`, `009_landmarks_seed.sql`, `010_simple_recommendations.sql`, `011_economy.sql` and `012_economy_catalog.sql`, in that order (007–010 need PostGIS, see [Exploration](#exploration-landmarks-geofences-and-visits-007009)).
3. Optional: paste and run `tests/smoke_test.sql`, `tests/migo_profiles_test.sql`, `tests/auth_test.sql`, `tests/gallery_test.sql`, `tests/explore_test.sql` and `tests/economy_test.sql`. They should say `All backend checks passed`, `All MIGO profile checks passed`, `All auth checks passed`, `All gallery checks passed`, `All exploration checks passed` and `All economy checks passed`.
4. Set up login in the dashboard (see [Supabase dashboard settings for login](#supabase-dashboard-settings-for-login)).
5. Go to **Project Settings → API** and copy the Project URL and the `anon` public key into `frontend/.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Never commit `.env.local`. Add the same two variables in Vercel for the deployed app.

To test on a local Postgres instead, run `tests/local_supabase_stub.sql` first (it fakes Supabase's `auth` schema and `auth.uid()`), then 001, 002, 004, 005, 006, 011, 012 and the five tests (007–010 and `explore_test.sql` need PostGIS; run them too if your Postgres has it). Skip 003 (it needs Supabase storage).

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
| `points_ledger`, `inventory`, `equipped` | MIGO points (one row per change), owned shop items, what the avatar wears (011) |
| `quest_defs`, `shop_items` | The server's copy of the quest and shop catalogues (012) |
| `quest_assignments`, `daily_refreshes`, `app_visits`, `seen_cities`, `legacy_imports` | Quests given to each person per period, and what their progress is measured from (011) |

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
| `migo_save_record(profile_id, record)` | Saves the whole record and keeps `profiles.role` (= active mode) and `has_dog` in sync, so `find_partner` keeps working. Since 011, `record.rewards` is ignored and replaced with a read-only copy built from the points tables. |
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

**How a photo is saved** (`frontend/src/lib/backend.ts`, `uploadPhoto`): the browser shrinks the picture to at most 1600 px (JPEG), uploads it to `gallery/<auth uid>/<random id>.jpg` with the user's access token, then calls `gallery_add_photo` with that path. The bucket is private: photos are shown through signed URLs (`POST /storage/v1/object/sign/gallery`), which only the owner can create. Camera photos use the 007 flow below instead.

| Function | Does |
|---|---|
| `gallery_add_photo(profile_id, storage_path, meta)` | Saves a photo row. Signed-in only, and the profile must belong to that login. `storage_path` must be `<your auth uid>/<name>.jpg\|jpeg\|png\|webp`. `meta` (all optional): `city_name`, `country`, `country_code`, `lat`, `lng`, `place_id`, `caption` (≤ 200 characters), `quest_id`, `hunt_id`, `taken_at` (never later than now; default now), `width`, `height`. Returns the photo. |
| `gallery_list(profile_id)` | The profile's photos as a JSON array, newest `taken_at` first. |
| `gallery_delete_photo(profile_id, photo_id)` | Deletes the row and returns its `storage_path`, so the app deletes the file through the Storage API. |

Errors: `42501` not signed in / `Not your account` / not your folder, `22023` bad details, `23505` path already saved, `P0002` unknown profile or photo.

**Rules:** the `photos` table has RLS on and no grants, so it's only reachable through these functions (owner rule as in 005). Storage policies let a signed-in user upload, replace, list and delete files only under their own `<auth uid>/` folder. The bucket is private (8 MB per file, JPEG/PNG/WebP); signed URLs expire after an hour. Gap: deleting the whole account removes the photo rows but not the files; clean those up from **Storage** in the dashboard (or delete them from the app first).

## Exploration: landmarks, geofences and visits (`007`–`009`)

The MAP shows every active Montréal landmark; the camera links a photo to a landmark **by GPS only** (no image recognition). PostGIS decides, never the browser.

**Set up:** after `006_gallery.sql`, run `007_landmarks_geofencing.sql`, then `008_montreal_island_boundary.sql` and `009_landmarks_seed.sql` (generated by `scripts/import_landmarks.mjs`; all safe to run again). Optionally run `tests/explore_test.sql`, which should say `All exploration checks passed`. PostGIS must be on (Supabase: **Database → Extensions → postgis**, schema `extensions`; 007 enables it if it can).

**Tables**

| Table | What it holds |
|---|---|
| `landmarks` | The catalogue: name, slug, category, prominence (1–4), WGS84 lat/lng + generated `location` (geography point), `geofence_radius_m` or `geofence_polygon` (geography MultiPolygon), source, licence and record id, `needs_review`, `is_active`. Ids are stable (UUID v5 of the source record). Public read of active rows; no browser writes. |
| `service_areas` / `service_area_parts` | The Island of Montréal boundary, and the same cut into small pieces for fast point-in-polygon checks. |
| `landmark_discoveries` | One row per person per visited landmark (`unique (profile_id, landmark_id)`): first visit time and its photo. |
| `photos` (extended) | Camera photos add `landmark_id`, `association_status` (`landmark_visit` / `montreal_unassigned`; null = manual upload), `gps_accuracy_m`, `file_size_bytes`. Raw coordinates are not stored. |
| `explore_settings` | One row of thresholds, editable in the Table editor: max accuracy (50 m), reading age (120 s at check, 900 s at save), photo↔reading gap (120 s), clock skew, ambiguity margin, polygon/shore tolerances, rate limit (30 per 10 min), max travel speed between visits. Tune after testing on real phones. |

**Functions**

| Function | Does |
|---|---|
| `landmarks_in_view(west, south, east, north, limit)` | Active landmarks in the map viewport with the caller's `visited` / `recommended` flags. Works signed out. |
| `landmark_get(id_or_slug)` | One landmark with its area as GeoJSON and its attribution. |
| `explore_check_location(lat, lng, accuracy_m, position_at, captured_at)` | Read-only, signed in. Returns `ok` (with candidates, the default landmark or `ambiguous`), `retry` (`poor_accuracy`, `stale_position`, `capture_gap`, `future_timestamp`, `implausible_travel`), `outside_area` or `rate_limited`. |
| `explore_register_capture(storage_path, lat, lng, accuracy_m, position_at, captured_at, landmark_id, width, height, file_size_bytes)` | Checks the file exists in the caller's folder, re-runs the check, then saves the photo and the first visit in one transaction. Errors `MG001` retry · `MG002` outside · `MG003` rate limited · `MG004` invalid/missing pick · `MG005` file missing. The app deletes the uploaded file on any error. |
| `explore_my_discoveries()` | The caller's visited landmarks with photo counts. |

**Geofences:** a circle (`ST_DWithin` on geography, metres, per-landmark radius) or an area (`ST_Covers`, plus a 10 m edge tolerance). When several match: a circle beats an area, the nearest circle wins unless the next is within max(10 m, accuracy/2) (then the person picks), nested areas resolve to the smallest. The person can always pick another matching place; the server only accepts a pick that is among the matches. Readings outside the island boundary (30 m shore tolerance) are refused and nothing is uploaded.

**Recommendations:** `landmark_recommended_ids(profile_id)` is the hook for the Questionnaire B recommender. `010_simple_recommendations.sql` fills it with transparent rules: the person's exploration picks (plus the active trip's activities in Tourist mode) map to landmark categories, and each pick contributes its most prominent unvisited places (about 40 in all; no answers → a few major landmarks). Replace its body with the real recommender, keeping the signature; 007 never overwrites it. Recommended landmarks get a saffron highlight on the map; nothing is hidden.

**Points:** a visit doesn't award points; that's a separate task.

**Admin:** manage landmarks in the dashboard Table editor (deactivate with `is_active = false`; don't delete visited ones) or by re-running the import. `gallery_orphan_files` (dashboard only) lists uploaded files with no photo row older than an hour; delete them in **Storage → gallery**.

**Limits:** browser GPS can be faked. The accuracy, freshness, rate and travel-speed checks are basic abuse prevention, not proof of presence.

## Points, quests and the shop (`011_economy.sql`, `012_economy_catalog.sql`)

The server owns MIGO points. The browser only sends ids ("claim this quest", "buy this item"); the server checks eligibility, uses its own reward or price, and returns the whole state. The shapes are in `frontend/src/features/economy/types.ts` (`EconomyState`, `QuestAssignment`, `QuestCondition`), and the app calls these through `frontend/src/lib/backend.ts`.

**Set up:** after 010, run `011_economy.sql`, then `012_economy_catalog.sql` (both safe to run again), then optionally `tests/economy_test.sql` (`All economy checks passed`). 011 carries over everyone's existing points, items and equipped items from their saved record (see below), so run it before people use the new app.

**Changing a catalogue** (`frontend/src/features/quests/catalog/*`, `frontend/src/features/rewards/catalog/*`): in `frontend/`, run `npm run gen:economy` (rewrites 012), `npm run check:economy` (reward/price bands, unique ids, the 12 original item ids, every accessory has a fit, 012 up to date), commit, then run the new 012 in the SQL Editor. Never rename or delete an id: set `retired: true`. 012 never deletes; ids missing from the catalogue are marked retired.

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

**Old points** (`economy_import_legacy()`, run by 011): for every saved record not imported yet, each old `rewards.ledger` entry becomes a `legacy` ledger row (`legacy:<refId>`, same amount, label and time; a repeated refId gets `#2`, `#3`…), `owned` becomes inventory (price paid taken from the old `item:<id>` purchase, else 0) and `equipped` stays equipped, so balances are identical. Old claims count: a starter or daily quest claimed under the old system (`challenge:<id>:once` / `challenge:<id>:<day>`) shows as completed and doesn't pay again. Imported profiles are recorded in `legacy_imports`, so running 011 again imports nothing twice.

**Testing time:** every function reads the clock from `economy_now()`. It returns `now()` unless the session setting `economy.test_now` is set (`select set_config('economy.test_now', '2026-11-23 10:00Z', true)`), which only `tests/economy_test.sql` does. Browsers can't set it: PostgREST only sets its own `request.*` settings (headers and JWT claims arrive as `request.headers` / `request.jwt.claims`; `Prefer: timezone` only changes how times are printed), the API roles can't run SQL or call `set_config` through the API, and the setting is ignored outright for PostgREST's `authenticator` login.

**Gaps:** progress for hunts relies on `submit_selfie`, which (like the other 001 hunt functions) doesn't check the login yet. Device accounts without a login are identified only by their id, as everywhere else. Page visits are reported by the app, so a "visit" quest proves the app was opened, nothing more.

## Security

- The browser can read `hunts`, `teams` and `leaderboard`, and can call the four functions above. It cannot write to any table directly, so points are always calculated on the server.
- Login is Supabase Auth (email + password). The app sends the user's access token, so `auth.uid()` identifies them and the `migo_*` functions only let a login touch its own profile. Gaps: profiles created without a login are still identified only by their id, and the hunt functions from `001_schema.sql` (`find_partner`, `get_hunts`, `submit_selfie`) don't check the login yet.
- Points, quest rewards, purchases and equipped items are decided by the `economy_*` functions (011). `migo_save_record` still saves the rest of the record from the browser, but ignores `record.rewards`.

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
