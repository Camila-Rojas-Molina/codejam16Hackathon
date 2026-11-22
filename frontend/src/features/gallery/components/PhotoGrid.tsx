// The gallery grid: one ruled section per group (month, city or place), photos as square prints with
// a small caption band (MIGO place with a pin, and a "Visited place" / "Montréal memory" tag for
// camera captures). 2 columns on phones, 3–4 on tablets, 4–6 on wide screens.
import { useState } from 'react'
import { Link } from 'react-router'
import Icon, { type IconName } from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { associationLabel, formatDay, formatTime, MEMORIES_KEY, photoAlt } from '../grouping'
import type { GroupBy, Photo, PhotoGroup } from '../types'

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
              <Icon name={groupIcon(groupBy, g.key)} accent={groupBy === 'date' ? 'teal' : 'sienna'} className="size-6" />
              {g.title}
            </h2>
            <p className="eyebrow flex flex-wrap items-center gap-x-3">
              {g.subtitle}
              {g.landmarkId && (
                <Link to={`/map?landmark=${encodeURIComponent(g.landmarkId)}`} className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4">
                  See on map
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

const groupIcon = (by: GroupBy, key: string): IconName => (by === 'date' ? 'calendar' : by === 'city' ? 'pin' : key === MEMORIES_KEY ? 'globe' : key.startsWith('landmark-') ? 'flag' : 'gallery')

function Thumb({ photo, groupBy, onOpen }: { photo: Photo; groupBy: GroupBy; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false)
  // Remember which URL failed: a re-signed URL gets a fresh chance.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // The useful line depends on the grouping: in place groups the date, otherwise the place or city.
  const place = photo.landmark?.name ?? (groupBy === 'date' ? photo.city?.name : null) ?? null
  const camera = photo.associationStatus !== null
  const when = camera ? `${formatDay(photo.takenAt)}, ${formatTime(photo.takenAt)}` : formatDay(photo.takenAt)
  const line = groupBy === 'place' || !place ? when : place
  const showPin = !!photo.landmark && line === photo.landmark.name
  const tag = associationLabel(photo)
  const broken = !photo.url || failedUrl === photo.url
  const ok = loaded && !broken
  return (
    <button
      type="button"
      onClick={onOpen}
      data-photo-id={photo.id}
      className="group/thumb sheet-grain block w-full border-2 border-ink text-left transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-block-sm active:translate-y-0"
    >
      <span className={cn('relative block aspect-square overflow-hidden border-b-2 border-ink', !ok && 'hatch-soft bg-paper')}>
        {!broken && photo.url ? (
          <img
            src={photo.url}
            alt={photoAlt(photo)}
            loading="lazy"
            decoding="async"
            width={photo.width ?? undefined}
            height={photo.height ?? undefined}
            onLoad={() => setLoaded(true)}
            onError={() => setFailedUrl(photo.url)}
            className={cn('size-full object-cover transition-opacity duration-300', ok ? 'opacity-100' : 'opacity-0')}
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
        {tag && (
          <span
            className={cn(
              'absolute top-1.5 left-1.5 border-2 border-ink px-1.5 py-0.5 text-[0.6rem] leading-tight font-bold tracking-[0.1em] uppercase',
              photo.associationStatus === 'landmark_visit' ? 'bg-saffron-soft' : 'bg-teal-soft',
            )}
          >
            {tag}
          </span>
        )}
      </span>
      <span className="flex min-h-11 items-center gap-1.5 px-2.5 py-1.5">
        {showPin && <Icon name="pin" accent="sienna" className="size-4" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{line}</span>
          {photo.caption && <span className="block truncate text-xs">{photo.caption}</span>}
        </span>
      </span>
    </button>
  )
}
