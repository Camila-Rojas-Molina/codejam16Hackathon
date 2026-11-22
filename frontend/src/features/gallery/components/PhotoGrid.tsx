// The gallery grid: one ruled section per group (month or city), photos as square prints with a
// small caption band. 2 columns on phones, 3–4 on tablets, 4–6 on wide screens.
import { useState } from 'react'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import { formatDay, photoAlt } from '../grouping'
import type { GroupBy, Photo, PhotoGroup } from '../types'

export const gridCols = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'

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
            <h2 id={`group-${g.key}`} className="flex items-center gap-2 text-2xl break-words">
              <Icon name={groupBy === 'city' ? 'pin' : 'calendar'} accent={groupBy === 'city' ? 'sienna' : 'teal'} className="size-6" />
              {g.title}
            </h2>
            <p className="eyebrow">{g.subtitle}</p>
          </div>
          <ul className={gridCols}>
            {g.photos.map((p) => (
              <li key={p.id}>
                <Thumb photo={p} showCity={groupBy === 'date'} onOpen={() => onOpen(p)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Thumb({ photo, showCity, onOpen }: { photo: Photo; showCity: boolean; onOpen: () => void }) {
  const [state, setState] = useState<'loading' | 'ok' | 'broken'>('loading')
  // In date groups the city is the useful line; in city groups, the date.
  const line = showCity ? (photo.city?.name ?? formatDay(photo.takenAt)) : formatDay(photo.takenAt)
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
            onLoad={() => setState('ok')}
            onError={() => setState('broken')}
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
      </span>
      <span className="flex min-h-11 items-center gap-1.5 px-2.5 py-1.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{line}</span>
          {photo.caption && <span className="block truncate text-xs">{photo.caption}</span>}
        </span>
      </span>
    </button>
  )
}
