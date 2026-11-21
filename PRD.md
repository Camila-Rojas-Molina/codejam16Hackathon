# Travel Quest — Product Requirements (CodeJam 16)

> **For Claude Code:** Read `claude/claude.md` and `frontend/src/features/README.md` first and follow the existing structure. Build the **frontend only**, using **mock data**: there is no backend yet. Keep all data access behind one small module (`src/lib/api.ts`) so it can be swapped for Supabase later. Build in the order of the "Build order" section and make sure the app runs (`npm run dev`, `npm run build`) after each step.

---

## 1. One-liner

A city scavenger hunt that pairs **tourists with locals**. Your team gets a photo of a mystery spot, finds it before time runs out, goes there together, puts the phone away, and takes a selfie to earn points.

## 2. Why it exists (pitch)

Remember summer 2016, when Pokémon Go got everyone outside talking to strangers? That feeling is gone. Travel Quest brings it back, but the "monsters" are real places and the point is the people you find them with.

| Track | How we hit it |
|---|---|
| **People First** (go out, meet people IRL, a Friday-night app) | Every hunt pairs a tourist with a local. You can't play alone. |
| **Touch Grass** (do things away from your phone; notifications can bring you back) | When you arrive, the app goes into **Phone Away** mode and pings you when it's selfie time. |
| **Undo Button** (bring back a defunct feature you miss) | Brings back 2016-era Pokémon Go: out in the city together. The shrinking hint circle is a nod to the original removed "footprints" tracker. |

## 3. Users

- **Tourist:** visiting the city and wants to see real spots, not a list of attractions.
- **Local:** knows the city and enjoys showing it off and meeting people.

## 4. Core loop (the demo)

1. **Onboarding:** pick a role (Tourist or Local), enter a name and choose an emoji avatar.
2. **Match:** a "finding your partner…" animation, then a reveal card with your teammate.
3. **Hunt:** the mystery photo, a countdown, and a map with a **hint circle that shrinks** as time runs out.
4. **Arrive:** the GPS check ("you're within 75 m!"), with a **demo-mode button** to fake arrival.
5. **Phone Away:** a calm full-screen state: "Put your phone away and explore." A timer runs, then a notification says it's selfie time.
6. **Selfie:** capture with the camera (file input with `capture="user"`), preview, submit.
7. **Points:** the score breakdown (base + speed bonus + "met someone new" bonus), with a confetti moment.
8. **Leaderboard:** teams ranked by points. Your team is highlighted.

## 5. Screens & requirements

Routes go in `src/pages/`, feature logic in `src/features/<area>/`.

### 5.1 `/` Welcome
- Logo/wordmark, tagline ("Find the place. Find your people."), and a "Start a quest" CTA.
- If a user is already in localStorage, go straight to `/hunts`.

### 5.2 `/onboarding`
- Role picker: two big cards, **Tourist** 🧳 / **Local** 📍.
- Name input and an emoji avatar picker (8 options).
- Save to localStorage (wrapped in try/catch).

### 5.3 `/match`
- A 2–3 s searching animation (pulsing rings), then a reveal of the partner card (name, avatar, role, one fun fact).
- The partner is picked from mock users with the **opposite role**.
- CTA: "Start hunting together".

### 5.4 `/hunts`: hunt list
- Cards for the available hunts: a blurred/cropped teaser of the photo, difficulty, time limit, and points.
- Completed hunts show a ✓ and the points earned.

### 5.5 `/hunt/:id`: active hunt (most important screen)
- The mystery photo at the top (tap to enlarge).
- A big countdown timer (mm:ss). It turns accent/red under 1 minute.
- A Google Map (`VITE_GOOGLE_MAPS_API_KEY`, via `@vis.gl/react-google-maps`) showing:
  - the user's live location (`navigator.geolocation.watchPosition`)
  - a **hint circle** that contains the target but is **not centred on it** (random offset). Its radius shrinks from ~600 m to ~100 m as time passes.
- Live distance readout, e.g. "≈ 240 m away". Use haversine and put it in `src/lib/geo.ts`.
- When distance ≤ 75 m, show "You found it!" and go to `/hunt/:id/away`.
- **Demo mode:** a small "Simulate arrival" button, shown when `?demo=1` is in the URL or a toggle in settings is on. We need this for judging indoors.
- When time runs out, show a "Time's up" sheet: retry or pick another hunt.
- If the Maps key is missing, fall back to a styled placeholder panel with the distance only. The app must not crash.

### 5.6 `/hunt/:id/away`: Phone Away
- A full-screen calm state, visually different (navy background, slow breathing animation).
- Copy: "You made it. Phone in your pocket — go explore with {partner}."
- Timer: 3 min by default, 15 s in demo mode.
- When it ends, use the Notification API (ask permission once) plus an in-app chime/banner saying "Selfie time! 📸", then go to `/hunt/:id/selfie`.

### 5.7 `/hunt/:id/selfie`
- Camera capture (`<input type="file" accept="image/*" capture="user">`), then a preview, then Retake or Submit.
- On submit, store the image as an object URL or base64 in local state/localStorage (it doesn't need to persist across reloads) and calculate points.

### 5.8 `/hunt/:id/result`
- Points breakdown:
  - base points (from the hunt)
  - speed bonus: `round(base * secondsLeft / timeLimit * 0.5)`
  - "met someone new" bonus: +50
- Confetti (`canvas-confetti`), the selfie in a polaroid frame, and CTAs for "Next hunt" and "Leaderboard".

### 5.9 `/leaderboard`
- Ranked list of teams: the two avatars, team name, and points. The current team is highlighted and sorted in live.
- Mock teams are seeded so the board isn't empty.

### Shared
- **Mobile first** (375 px). On desktop, centre the app in a phone-width column, with an optional side panel showing the leaderboard.
- A bottom tab bar on the main screens: Hunts · Leaderboard · Profile.
- All state goes in a simple store (React context or Zustand) and is saved to localStorage behind try/catch.

## 6. Data (mock): `src/lib/mockData.ts`

```ts
type Role = "tourist" | "local";
type User = { id: string; name: string; avatar: string; role: Role; funFact?: string };
type Hunt = {
  id: string; title: string; photo: string; // /assets/hunts/<id>.jpg
  lat: number; lng: number;
  timeLimitSec: number; basePoints: number;
  difficulty: "easy" | "medium" | "hard";
  revealText: string; // shown after it's found ("This is the Roddick Gates, built in 1925…")
};
type Team = { id: string; name: string; members: [User, User]; points: number; completedHuntIds: string[] };
```

Seed hunts near McGill. **Coordinates are approximate: verify each in Google Maps before the demo.** Photos go in `frontend/public/assets/hunts/`. Use placeholders until the real photos are added.

| id | Title | lat, lng | Time | Points | Difficulty |
|---|---|---|---|---|---|
| roddick-gates | Roddick Gates | 45.5048, -73.5772 | 10 min | 100 | easy |
| three-bares | The Three Bares (McGill campus) | 45.5045, -73.5780 | 10 min | 150 | medium |
| leonard-cohen-mural | Leonard Cohen mural | 45.4986, -73.5783 | 15 min | 200 | medium |
| kondiaronk | Kondiaronk Belvedere | 45.5040, -73.5874 | 25 min | 300 | hard |
| place-des-arts | Place des Arts fountains | 45.5085, -73.5665 | 15 min | 200 | medium |
| cartier-monument | George-Étienne Cartier Monument | 45.5144, -73.5866 | 20 min | 250 | hard |

Mock users: about 6 (3 tourists, 3 locals) with fun facts. Mock teams: 5 with varied points.

`src/lib/api.ts` exposes async functions (`getHunts`, `getHunt`, `findPartner`, `submitSelfie`, `getLeaderboard`) that return mock data now. They'll be swapped for Supabase later.

## 7. Design direction

**Vibe:** a hand-drawn scrapbook / zine. Flat **sky-blue** everywhere, **fire-engine red** pill buttons with typewriter lettering, a distressed rubber-stamp display font, and hand-drawn illustrations with wobbly navy outlines (speech bubbles, notebook paper, a retro smiley). It's playful, a bit retro, and made by a person. It should *not* look like a generic AI/SaaS app: no gradients, no glassmorphism, no purple, no default shadcn look, no generic Lucide icon grids.

Put the tokens in `src/styles/` (Tailwind theme):

| Token | Value | Use |
|---|---|---|
| `sky` | `#6994C6` | **app background** (flat, the signature colour) |
| `red` | `#E80C0C` | primary buttons, logo, timer, key CTAs |
| `red-rim` | `#FF2D2B` | the lighter outer rim on pill buttons |
| `navy` | `#13175A` | outlines, body text on light surfaces, illustration strokes |
| `paper` | `#FFF2E6` | cards and sheets (notebook-paper feel) |
| `bubble` | `#7BCFFB` | secondary surfaces, the map hint circle, chips |
| `bubble-light` | `#BDEAFF` | alt surfaces, the partner card, notebook lines |
| `sun` | `#FFCC00` | points, badges, success, confetti |
| `ink` | `#000000` | smiley/sticker outlines, text on yellow |

- **Type:**
  - logo and big headings: a distressed stamp-style display font (e.g. *Rubik Dirt* or *Bungee*, all caps)
  - buttons, labels, timer: a typewriter font (*Special Elite* or *Courier Prime*, all caps, white on red)
  - body: *Courier Prime* or a clean sans like *DM Sans* for readability
  - load everything from Google Fonts
- **Buttons:** fat red pills, with the darker red fill sitting inside a slightly larger lighter-red rim (two-tone border) and white typewriter caps. They squish slightly when pressed.
- **Cards:** paper-coloured, a slightly irregular hand-drawn feel (2–3 px navy border, can be a little rotated ±1°), with notebook-paper details (red margin line, blue ruled lines, hole punches) on list-style screens like the hunt list.
- **Illustrations/stickers:** simple flat shapes with thick wobbly navy strokes (draw as inline SVG, original art only): speech bubbles for the match screen, a yellow smiley for the points/result screen, little stars and squiggle underlines as decoration.
- **Contrast:** red text on the sky background is low contrast, so use it **only for the large logo/display text**. Body text goes on paper cards in navy, or white on red/navy.
- **Motion:** bouncy and sticker-like for game moments (match reveal, points, confetti in red/yellow/light-blue). Slow and calm on Phone Away (navy background, breathing smiley or bubble).
- **Map:** a custom map style tinted toward sky/light blue with navy roads, POI labels hidden so it doesn't give the answer away. The hint circle is `bubble` at ~35% opacity with a dashed navy stroke.
- **Accessibility:** contrast ≥ 4.5:1 for text, tap targets ≥ 44 px, and respect `prefers-reduced-motion`.

## 8. Out of scope (for now)
- A real backend, auth, or matching algorithm (mock it all)
- Photo verification with AI (we check arrival by GPS instead, which is cheap and honest)
- Chat between teammates
- Multiple cities

## 9. Build order
1. Design tokens, fonts, base UI components (`Button`, `Card`, `Badge`, `Timer`, `BottomNav`)
2. Mock data, `api.ts`, `geo.ts`, the store
3. Welcome → Onboarding → Match
4. Hunt list → **Active hunt with map** (the priority screen)
5. Phone Away → Selfie → Result
6. Leaderboard
7. Desktop layout and polish

## 10. Done when
- The whole loop (Welcome → Leaderboard) works on a phone in demo mode with no backend.
- `npm run build` and `npm run lint` pass.
- The app works without a Maps key (placeholder fallback).
- Nothing crashes if location or notification permission is denied. It shows friendly copy plus the demo-mode fallback.
