// The guided tour's script. Migo walks a brand-new account through MIGO in ten short stops, and
// actually opens each part of the app on the way, so the real thing is on screen while Migo talks
// (it doubles as a walkthrough when someone is showing MIGO to others).
//
// What made the cut, and why (everything here exists in the app today):
//   1. Hello: who Migo is, and that the tour is short.
//   2. Tourist / Local: the one idea people must get. It's a mode you switch, not an account type,
//      and it decides who you meet.
//   3. Map: the real 3D map of Montréal's landmarks, with recommended places (from your answers)
//      highlighted and the ones you've visited ticked off.
//   4. Camera: how a visit counts. The photo's GPS reading links it to the landmark you're at.
//   5. Matching: the heart of MIGO. Tourists pick from their top-matched locals (an instant match);
//      locals are matched by tourists and get "You've been matched!".
//   6. Quests: daily and weekly challenges that pay points.
//   7. Points: where the balance lives (it's also the way into the Shop).
//   8. Shop: what points are for (dressing up your avatar).
//   9. Gallery: every photo, grouped by place and city.
//  10. Profile, then done: the card your matches see, and where to replay this.
// Left out on purpose: questionnaire details, trips, privacy settings, Day/Night, photo hunts and the
// match-score breakdown. They're explained where they appear.
//
// `route` is the page the stop opens (the tour stays on top). `target` names [data-tour] hooks on the
// real interface. Several elements can share a name (desktop nav and phone tab bar): the tour
// spotlights whichever are visible. No target, or a target that isn't on screen = Migo in the middle.
import type { MascotPose } from '../../components/illustrations/Mascot'
import type { ExploreMode } from '../profile/types'

type ByMode<T> = T | ((mode: ExploreMode | null) => T)

export type TourStep = {
  id: string
  route?: ByMode<string>
  target?: ByMode<string[] | undefined>
  pose: MascotPose
  title: string
  /** Mode-aware where it helps (null = no mode picked yet). */
  text: (mode: ExploreMode | null) => string
}

export const resolve = <T,>(v: ByMode<T>, mode: ExploreMode | null): T => (typeof v === 'function' ? (v as (m: ExploreMode | null) => T)(mode) : v)

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'hello',
    route: '/map',
    pose: 'hello',
    title: 'Hi, I’m Migo!',
    text: () => 'Let me show you around. MIGO pairs tourists with locals, then sends you out to explore the city together. It only takes a minute.',
  },
  {
    id: 'mode',
    route: '/map',
    target: ['mode'],
    pose: 'curious',
    title: 'Tourist or Local?',
    text: () => 'One account, two modes. Switch here any time: as a tourist you meet locals, as a local you show visitors your city.',
  },
  {
    id: 'map',
    route: '/map',
    target: ['map-view'],
    pose: 'glide',
    title: 'Explore the real city',
    text: () =>
      'A 3D map of Montréal’s landmarks. The highlighted ones are picked for you from your answers, and every place you visit gets ticked off. Tap a pin for the details.',
  },
  {
    id: 'camera',
    route: '/map',
    target: ['camera'],
    pose: 'search',
    title: 'Snap it to count it',
    text: () => 'At a landmark? Take a photo. Your phone’s location tells MIGO where you are, and the place is marked visited on your map.',
  },
  {
    id: 'match',
    route: (mode) => (mode === 'tourist' ? '/chat?tab=discover' : '/chat'),
    target: (mode) => (mode === 'tourist' ? ['top-match'] : ['nav-chat']),
    pose: 'read',
    title: 'Find your people',
    text: (mode) =>
      mode === 'local'
        ? 'Tourists see you among their top matches. When one picks you, you’ll get a “You’ve been matched!”. Say hi and plan something together in Chat.'
        : mode === 'tourist'
          ? 'Your top-matched locals, ranked by what you have in common. Pick one and it’s a match, straight away: they get a “You’ve been matched!”.'
          : 'Tourists pick from their top-matched locals, and locals get a “You’ve been matched!”. Pick a mode to start meeting people.',
  },
  {
    id: 'quests',
    route: '/quests',
    target: ['quests-weekly'],
    pose: 'play',
    title: 'Quests earn points',
    text: () => 'A big weekly challenge, three fresh dailies and adventures picked for your interests. Finish one, then claim its points.',
  },
  {
    id: 'points',
    route: '/quests',
    target: ['points'],
    pose: 'goodies',
    title: 'Your points',
    text: () => 'Your balance lives up here, wherever you are. Tap it any time to go shopping.',
  },
  {
    id: 'shop',
    route: '/shop',
    target: ['shop-fitting'],
    pose: 'cheer',
    title: 'Treat yourself',
    text: () => 'Spend points on hats, glasses, pets and backdrops. Try things on in the fitting room before you buy.',
  },
  {
    id: 'gallery',
    route: '/gallery',
    target: ['gallery-header'],
    pose: 'leap',
    title: 'Your adventures',
    text: () => 'Every photo you take lands here, with the place, the city and the day. Your visited places add up too.',
  },
  {
    id: 'done',
    route: '/profile',
    target: ['profile-card'],
    pose: 'cheer',
    title: 'You’re all set!',
    text: () => 'This is the card your matches see. You can replay this tour any time from Settings. Now go find your people!',
  },
]
