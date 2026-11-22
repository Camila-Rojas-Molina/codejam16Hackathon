// The guided tour's script. Migo walks a brand-new account through the hub in eight short stops.
//
// What made the cut, and why (everything here exists in the app today):
//   1. Hello: who Migo is, and that the tour is short.
//   2. Map: the hub's home page. The interactive map itself isn't switched on yet, so the stop says
//      what Map really does today: where you're exploring, and the shortcut to photo hunts.
//   3. Tourist / Local: the one idea people must get. It's a mode you switch, not an account type,
//      and it decides who you meet.
//   4. Chat: how people actually meet (tourist taps Connect, the local says yes, then Messages).
//   5. Quests: where points come from.
//   6. Points → Shop: what points are for (dressing up your avatar).
//   7. Gallery + Profile: the two personal sections, together (one sentence each is enough).
//   8. Settings: done, and where to replay this.
// Left out on purpose: questionnaire details, trips, privacy settings, Day/Night, Discover's match
// scores. They're explained where they appear.
//
// `target` names [data-tour] hooks on the real interface (nav items, the mode toggle, the points
// badge, the settings button). Several elements can share a name (desktop nav and phone tab bar):
// the tour spotlights whichever are visible. No target = Migo in the middle of the screen.
import type { MascotPose } from '../../components/illustrations/Mascot'
import type { ExploreMode } from '../profile/types'

export type TourStep = {
  id: string
  target?: string[]
  pose: MascotPose
  title: string
  /** Mode-aware where it helps (null = no mode picked yet). */
  text: (mode: ExploreMode | null) => string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'hello',
    pose: 'hello',
    title: 'Hi, I’m Migo!',
    text: () => 'I’ll show you around MIGO. It takes under a minute, promise.',
  },
  {
    id: 'map',
    target: ['nav-map'],
    pose: 'glide',
    title: 'Map is home base',
    text: () => 'It shows where you’re exploring, with shortcuts to quests and photo hunts: team up with someone and find a mystery spot together.',
  },
  {
    id: 'mode',
    target: ['mode'],
    pose: 'curious',
    title: 'Tourist or Local?',
    text: () => 'Switch here any time. As a tourist you meet locals; as a local you show visitors your city.',
  },
  {
    id: 'chat',
    target: ['nav-chat'],
    pose: 'read',
    title: 'Meet people in Chat',
    text: (mode) =>
      mode === 'local'
        ? 'Tourists find you in Discover and ask to connect. Pick Connect or Not now. Once you’re connected, you chat in Messages.'
        : 'Browse locals in Discover and tap Connect. When a local says yes, you’ll find each other in Messages.',
  },
  {
    id: 'quests',
    target: ['nav-quests'],
    pose: 'play',
    title: 'Quests earn points',
    text: () => 'Do the daily challenge and a few starter goals, then claim your points.',
  },
  {
    id: 'points',
    target: ['points'],
    pose: 'goodies',
    title: 'Treat yourself',
    text: () => 'Your points live here. Tap them to open the Shop and dress up your avatar.',
  },
  {
    id: 'you',
    target: ['nav-gallery', 'nav-profile'],
    pose: 'search',
    title: 'Your photos and profile',
    text: () => 'Gallery keeps photos from your adventures. Profile holds your answers and the card other people see.',
  },
  {
    id: 'done',
    target: ['settings'],
    pose: 'cheer',
    title: 'You’re all set!',
    text: () => 'You can replay this tour any time in Settings. Now go find your people!',
  },
]
