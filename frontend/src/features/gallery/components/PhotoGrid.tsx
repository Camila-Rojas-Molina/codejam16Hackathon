// The gallery grid: one ruled section per group (month, city or MIGO place), photos as square
// prints with a small caption band. 2 columns on phones, 3–4 on tablets, 4–6 on wide screens.
// Camera captures carry a stamp: "Visited" (linked to a landmark) or "Montréal" (a memory).
import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { formatDay, formatTime, hasCaptureTime, photoAlt } from '../grouping'
import type { GroupBy, Photo, PhotoGroup } from '../types'

const groupIcon = { date: 'calendar', city: 'pin', place: 'flag' } as const
const groupAccent = { date: 'teal', city: 'sienna', place: 'teal' } as const

export const gridCols = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6'

type PhotoGridProps = {
  groups: PhotoGroup[]
  groupBy: GroupBy
  onOpen: (photo: Photo) => void
}

export default function PhotoGrid({ groups, groupBy, onOpen }: PhotoGridProps) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`group-${g.key}`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-ink pb-2">
            <h2 id={`group-${g.key}`} className="flex min-w-0 items-center gap-2 text-2xl break-words">
              <Icon name={groupIcon[groupBy]} accent={groupAccent[groupBy]} className="size-6" />
              {g.title}
            </h2>
            <p className="eyebrow flex flex-wrap items-center gap-x-3">
              {g.subtitle}
              {g.landmark && (
                <Link to={`/map?landmark=${encodeURIComponent(g.landmark.id)}`} className="underline decoration-2 underline-offset-4 hover:decoration-sienna">
                  See on map<span className="sr-only">: {g.landmark.name}</span>
                </Link>
              )}
            </p>
          </div>
          <ul className={gridCols}>
            {g.photos.map((p) => (
              <li key={p.id}>
                <Thumb photo={p} groupBy={groupBy} onOpen={() => onOpen(p)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Thumb({ photo, groupBy, onOpen }: { photo: Photo; groupBy: GroupBy; onOpen: () => void }) {
  // Signed URLs get replaced before they expire: a new URL deserves a fresh try, and a picture
  // that already showed stays visible while its new URL loads.
  const [shown, setShown] = useState(false)
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const state: 'loading' | 'ok' | 'broken' = !photo.url || brokenUrl === photo.url ? 'broken' : shown ? 'ok' : 'loading'
  const when = hasCaptureTime(photo) ? `${formatDay(photo.takenAt)}, ${formatTime(photo.takenAt)}` : formatDay(photo.takenAt)
  // In date groups where it was is the useful line; in city and place groups, the date.
  const where = photo.landmark?.name ?? photo.city?.name ?? null
  const line = groupBy === 'date' ? (where ?? when) : groupBy === 'city' && photo.landmark ? photo.landmark.name : when
  const linePin = groupBy !== 'place' && !!photo.landmark && line === photo.landmark.name
  return (
    <button
      type="button"
      onClick={onOpen}
      data-photo-id={photo.id}
      className="group/thumb sheet-grain block w-full border-2 border-ink text-left transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-block-sm active:translate-y-0"
    >
      <span className={cn('relative block aspect-square overflow-hidden border-b-2 border-ink', state !== 'ok' && 'hatch-soft bg-paper')}>
        {state !== 'broken' ? (
          <img
            src={photo.url}
            alt={photoAlt(photo)}
            loading="lazy"
            decoding="async"
            width={photo.width ?? undefined}
            height={photo.height ?? undefined}
            onLoad={() => setShown(true)}
            onError={() => setBrokenUrl(photo.url)}
            className={cn('size-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0')}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-2 text-center text-xs font-bold">
            <span>
              <Icon name="alert" accent="sienna" className="mx-auto mb-1 size-6" />
              Image unavailable
              <span className="sr-only">: {photoAlt(photo)}</span>
            </span>
          </span>
        )}
        {photo.associationStatus && <Stamp photo={photo} />}
      </span>
      <span className="flex min-h-11 items-center gap-1.5 px-2.5 py-1.5">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-bold">
            {linePin && <Icon name="pin" accent="sienna" className="size-4" />}
            <span className="truncate">{line}</span>
          </span>
          {photo.caption && <span className="block truncate text-xs">{photo.caption}</span>}
        </span>
      </span>
    </button>
  )
}

/** Small corner stamp on camera captures. The full wording is in the viewer. */
function Stamp({ photo }: { photo: Photo }) {
  const visit = photo.associationStatus === 'landmark_visit'
  return (
    <span
      className={cn(
        'absolute top-1.5 left-1.5 inline-flex items-center gap-1 border-2 border-ink px-1.5 py-0.5 text-[0.62rem] leading-tight font-bold tracking-[0.1em] uppercase',
        visit ? 'bg-teal-soft text-ink' : 'bg-saffron-soft text-ink',
      )}
    >
      <Icon name={visit ? 'flag' : 'pin'} accent={visit ? 'teal' : 'sienna'} className="size-3.5" />
      {visit ? 'Visited' : 'Montréal'}
      <span className="sr-only">{visit ? (photo.landmark ? `: ${photo.landmark.name}` : '') : ' memory'}</span>
    </span>
  )
}
