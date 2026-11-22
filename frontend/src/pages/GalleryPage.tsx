// /gallery: photos taken while exploring. Grid grouped by month or city, a large viewer, adding
// (camera or library) with an optional city and caption, and delete. Saved photos need an online,
// signed-in account (006_gallery.sql); otherwise the page explains why instead of faking an upload.
// This session's hunt selfies (kept in memory only) are shown apart, marked "Not saved yet".
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import Button from '../components/ui/Button'
import { ErrorText } from '../components/ui/Fields'
import PageHeader from '../components/ui/PageHeader'
import AddPhotoDialog from '../features/gallery/components/AddPhotoDialog'
import GalleryNotice from '../features/gallery/components/GalleryNotice'
import PhotoGrid, { gridCols } from '../features/gallery/components/PhotoGrid'
import PhotoViewer from '../features/gallery/components/PhotoViewer'
import SessionSelfies from '../features/gallery/components/SessionSelfies'
import { groupPhotos, recentCities } from '../features/gallery/grouping'
import type { GroupBy, PhotoMeta } from '../features/gallery/types'
import { useGallery } from '../features/gallery/useGallery'
import type { PlacePick } from '../features/places/types'
import { cn } from '../lib/cn'
import { readJSON, writeJSON } from '../lib/storage'
import type { HuntResult } from '../lib/types'
import { useStore } from '../store/useStore'

const GROUP_KEY = 'migo:gallery:groupBy'
const GROUPS: { value: GroupBy; label: string; icon: 'calendar' | 'pin' }[] = [
  { value: 'date', label: 'By date', icon: 'calendar' },
  { value: 'city', label: 'By city', icon: 'pin' },
]

const pickToCity = (p: PlacePick | null | undefined): NonNullable<PhotoMeta['city']> | null =>
  p ? { name: p.name, country: p.country, countryCode: p.countryCode, placeId: p.placeId, lat: p.lat, lng: p.lng } : null

/** Phones and tablets can open the camera straight from a file input. */
const canUseCamera = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export default function GalleryPage() {
  const { profile, huntResults } = useStore()
  const { availability, photos, status, error, reload, add, remove } = useGallery()
  const online = availability === 'online'

  const [groupBy, setGroupByState] = useState<GroupBy>(() => (readJSON<GroupBy>(GROUP_KEY) === 'city' ? 'city' : 'date'))
  const setGroupBy = (g: GroupBy) => {
    setGroupByState(g)
    writeJSON(GROUP_KEY, g)
  }
  const groups = useMemo(() => groupPhotos(photos, groupBy), [photos, groupBy])
  // The viewer walks the photos in the order they're shown.
  const ordered = useMemo(() => groups.flatMap((g) => g.photos), [groups])

  const [viewing, setViewing] = useState<number | null>(null)
  const [pending, setPending] = useState<{ file: File; huntId?: string } | null>(null)
  const [savedHuntIds, setSavedHuntIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [selfieError, setSelfieError] = useState<string | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)
  const [camera] = useState(canUseCamera)

  const quickCities = useMemo(
    () =>
      [pickToCity(profile?.universal?.homeCityPlace), pickToCity(profile?.local?.homeCityPlace), ...recentCities(photos)].filter(
        (c): c is NonNullable<typeof c> => !!c,
      ),
    [profile, photos],
  )

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file again still fires
    if (file) setPending({ file })
  }

  async function saveSelfie(r: HuntResult, title: string) {
    if (!r.selfieUrl) return
    setSelfieError(null)
    try {
      const blob = await (await fetch(r.selfieUrl)).blob()
      const file = new File([blob], `${title}.jpg`, { type: blob.type || 'image/jpeg', lastModified: r.completedAt })
      setPending({ file, huntId: r.huntId })
    } catch {
      setSelfieError('That selfie is no longer available on this device.')
    }
  }

  async function save(file: File, meta: PhotoMeta) {
    const photo = await add(file, meta)
    if (pending?.huntId) setSavedHuntIds((ids) => [...ids, pending.huntId!])
    setPending(null)
    setMessage(`Photo saved${photo.city ? ` in ${photo.city.name}` : ''}.`)
  }

  const addButtons = online && (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
      {camera && (
        <Button icon="camera" onClick={() => cameraInput.current?.click()} className="flex-1 sm:flex-none">
          Take photo
        </Button>
      )}
      <Button icon="plus" variant={camera ? 'secondary' : 'primary'} onClick={() => libraryInput.current?.click()} className="flex-1 sm:flex-none">
        {camera ? 'Upload' : 'Add photo'}
      </Button>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Your adventures"
        title="Gallery"
        description="Photos from your quests and explorations, with the city and the day you took them."
        // With no photos yet, the buttons sit in the empty state instead.
        aside={(status !== 'ready' || photos.length > 0) && addButtons ? addButtons : undefined}
      />

      {/* Hidden pickers behind the buttons. `capture` opens the camera on phones. */}
      {online && (
        <>
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" tabIndex={-1} aria-hidden />
          <input ref={libraryInput} type="file" accept="image/*" onChange={onFile} className="sr-only" tabIndex={-1} aria-hidden />
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      {!online && <GalleryNotice availability={availability} />}

      <SessionSelfies results={huntResults} savedHuntIds={savedHuntIds} onSave={online ? saveSelfie : undefined} />
      <ErrorText>{selfieError}</ErrorText>

      {online && status === 'loading' && (
        <div aria-busy="true">
          <p className="sr-only">Loading your photos…</p>
          <ul className={gridCols} aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="hatch-soft aspect-[4/5] border-2 border-ink bg-paper opacity-60" />
            ))}
          </ul>
        </div>
      )}

      {online && status === 'error' && (
        <div>
          <ErrorText>Couldn’t load your photos. {error}</ErrorText>
          <Button variant="secondary" icon="undo" className="mt-3" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {online && status === 'ready' && photos.length === 0 && (
        <section aria-labelledby="gallery-empty" className="sheet-grain flex flex-col items-center gap-4 border-2 border-ink px-5 py-8 text-center">
          <Mascot pose="ponder" className="h-40 sm:h-48" />
          <h2 id="gallery-empty" className="text-2xl sm:text-3xl">
            No photos yet
          </h2>
          <p className="max-w-md">
            Snap the places you find on quests and explorations. Add a city and a caption, and they’ll be sorted here by day or by city.
          </p>
          {addButtons}
        </section>
      )}

      {online && status === 'ready' && photos.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </p>
            <div role="group" aria-label="Organise photos" className="sheet-grain flex border-2 border-ink">
              {GROUPS.map((g, i) => (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={groupBy === g.value}
                  onClick={() => setGroupBy(g.value)}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors sm:px-4',
                    i > 0 && 'border-l-2 border-ink',
                    groupBy === g.value ? 'bg-saffron' : 'hover:bg-saffron-soft',
                  )}
                >
                  <Icon name={g.icon} accent={groupBy === g.value ? 'sheet' : 'saffron'} className="size-5" />
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <PhotoGrid groups={groups} groupBy={groupBy} onOpen={(p) => setViewing(ordered.findIndex((x) => x.id === p.id))} />
        </>
      )}

      <PhotoViewer
        photos={ordered}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
        onDelete={
          online
            ? async (photo) => {
                await remove(photo.id)
                setMessage('Photo deleted.')
                if (ordered.length <= 1) setViewing(null)
              }
            : undefined
        }
      />

      <AddPhotoDialog
        file={pending?.file ?? null}
        quickCities={quickCities}
        extra={pending?.huntId ? { huntId: pending.huntId } : undefined}
        onCancel={() => setPending(null)}
        onReplace={pending?.huntId ? undefined : (file) => setPending({ file })}
        onSave={save}
      />
    </div>
  )
}
