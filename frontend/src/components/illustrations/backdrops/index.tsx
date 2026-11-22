// Shop backdrops: printed-poster scenes drawn behind the avatar, each filling a 0–100 square.
// Catalogue (names, tiers, prices): features/rewards/catalog/backdrops.ts. Scenes are keyed by the
// item's `art` (defaults to its id). They keep their day colours in both themes: they're artwork.
//
// Composition rule for every scene: the avatar covers the middle ~86% of the square, so the
// centre stays calm and low-contrast, and the detail lives near the edges and the horizon.
import { useId } from 'react'
import { BACKDROPS } from '../../../features/rewards/catalog/backdrops'
import { ABSTRACT_SCENES } from './scenesAbstract'
import { CITY_SCENES } from './scenesCity'
import { NATURE_SCENES } from './scenesNature'
import { NIGHT_SCENES } from './scenesNight'
import { SEA_SCENES } from './scenesSea'
import { GRAIN_SPECKS, MOTION_CSS, type SceneDef } from './util'

const SCENES: Record<string, SceneDef> = { ...ABSTRACT_SCENES, ...NATURE_SCENES, ...SEA_SCENES, ...NIGHT_SCENES, ...CITY_SCENES }

/**
 * One backdrop as an <svg> that fills its box (cropped to cover, like object-fit: cover).
 * Unknown ids render nothing. `still` turns off the subtle motion (it is also off whenever the
 * person prefers reduced motion), e.g. for long shop grids.
 */
export function BackdropArt({ id, className, still = false }: { id: string; className?: string; still?: boolean }) {
  const reactId = useId()
  const def = BACKDROPS.find((b) => b.id === id)
  const scene = SCENES[def?.art ?? id]
  if (!scene) return null
  const prefix = `bd${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const u = (key: string) => `${prefix}-${key}`
  const live = scene.motion && !still
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={live ? `mbd-live ${className ?? ''}`.trim() : className}
      aria-hidden
      focusable="false"
      data-backdrop={id}
    >
      {live ? <style>{MOTION_CSS}</style> : null}
      <defs>
        <pattern id={u('grain')} width="18" height="18" patternUnits="userSpaceOnUse">
          {GRAIN_SPECKS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={scene.dark ? '#f3e7c9' : 'var(--day-ink)'} fillOpacity={s.o * (scene.dark ? 0.22 : 0.18)} />
          ))}
        </pattern>
      </defs>
      {scene.draw(u)}
      <rect width="100" height="100" fill={`url(#${u('grain')})`} />
    </svg>
  )
}
