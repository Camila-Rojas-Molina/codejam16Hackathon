// Details for a photo that's about to be saved: a preview, an optional city, caption and date.
// The picture is shrunk in the browser on save (features/gallery/image.ts), then uploaded.
import { useId, useRef, useState, type FormEvent } from 'react'
import Icon from '../../../components/icons/Icon'
import Button from '../../../components/ui/Button'
import { ErrorText, fieldLabel, inputBase, TextArea } from '../../../components/ui/Fields'
import { cn } from '../../../lib/cn'
import CitySearch from '../../places/components/CitySearch'
import type { PlacePick } from '../../places/types'
import { CAPTION_MAX, type PhotoMeta } from '../types'
import Modal from './Modal'

type City = NonNullable<PhotoMeta['city']>

type AddPhotoDialogProps = {
  file: File | null
  /** Cities to offer with one tap (home city, recent photo cities…). */
  quickCities: City[]
  /** Extra details carried with the photo (e.g. a hunt id for a selfie). */
  extra?: Pick<PhotoMeta, 'huntId' | 'questId'>
  onCancel: () => void
  /** Swap the picture for another one. Omit to hide "Choose another photo" (e.g. for a hunt selfie). */
  onReplace?: (file: File) => void
  onSave: (file: File, meta: PhotoMeta) => Promise<void>
}

const fromPick = (p: PlacePick): City => ({
  name: p.name,
  country: p.country,
  countryCode: p.countryCode,
  placeId: p.placeId,
  lat: p.lat,
  lng: p.lng,
})

const cityId = (c: City) => c.placeId ?? `${c.name}|${c.countryCode ?? ''}`

/** yyyy-mm-dd in local time. */
const toDateInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddPhotoDialog(props: AddPhotoDialogProps) {
  const titleId = useId()
  return (
    <Modal
      open={!!props.file}
      onClose={props.onCancel}
      labelledBy={titleId}
      closeOnBackdrop={false}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:w-[min(44rem,calc(100vw-3rem))]"
    >
      {props.file && <AddPhotoForm key={`${props.file.name}-${props.file.lastModified}-${props.file.size}`} {...props} file={props.file} titleId={titleId} />}
    </Modal>
  )
}

function AddPhotoForm({ file, quickCities, extra, onCancel, onReplace, onSave, titleId }: AddPhotoDialogProps & { file: File; titleId: string }) {
  const dateId = useId()
  const [city, setCity] = useState<City | null>(null)
  const [caption, setCaption] = useState('')
  // Read once per form (the form is keyed by file, so a new file gets fresh values).
  const [{ fileDate, today }] = useState(() => ({ fileDate: toDateInput(file.lastModified || Date.now()), today: toDateInput(Date.now()) }))
  const [date, setDate] = useState(fileDate > today ? today : fileDate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Its own picker: anything outside an open modal dialog is inert.
  const replaceInput = useRef<HTMLInputElement>(null)

  const quick = quickCities.filter((c, i, all) => all.findIndex((x) => cityId(x) === cityId(c)) === i).slice(0, 5)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    // Keep the file's exact time when the date wasn't changed; otherwise midday on the chosen day.
    const takenAt = date === fileDate && file.lastModified ? file.lastModified : date ? new Date(`${date}T12:00:00`).getTime() : undefined
    try {
      await onSave(file, { city, caption: caption.trim() || undefined, takenAt: Number.isFinite(takenAt) ? takenAt : undefined, ...extra })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save this photo. Try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="sheet-grain flex h-full flex-col border-ink sm:max-h-[92dvh] sm:border-2 sm:shadow-block" aria-busy={busy || undefined}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-4 py-3 sm:px-5">
        <h2 id={titleId} className="text-2xl">
          Add to gallery
        </h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="grid size-12 shrink-0 place-items-center border-2 border-ink transition-colors hover:bg-saffron-soft disabled:opacity-55"
        >
          <Icon name="close" accent="none" strokeWidth={2.4} label="Cancel" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
          <div>
            <div className="hatch-soft border-2 border-ink bg-paper">
              <img
                // A fresh object URL per attach, revoked by the ref cleanup (safe under StrictMode's double attach).
                ref={(img) => {
                  if (!img) return
                  const url = URL.createObjectURL(file)
                  img.src = url
                  return () => URL.revokeObjectURL(url)
                }}
                alt="The photo you picked"
                className="mx-auto max-h-64 w-full object-contain sm:max-h-56"
              />
            </div>
            {onReplace && (
              <>
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => replaceInput.current?.click()} disabled={busy}>
                  Choose another photo
                </Button>
                <input
                  ref={replaceInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    const next = e.target.files?.[0]
                    e.target.value = ''
                    if (next) onReplace(next)
                  }}
                />
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <fieldset className="min-w-0">
              <legend className={fieldLabel}>
                City <span className="ml-1 font-medium tracking-normal normal-case">(optional)</span>
              </legend>
              {city ? (
                <div className="flex min-h-14 items-center gap-3 border-2 border-ink bg-teal-soft px-3 py-2">
                  <Icon name="pin" accent="sienna" className="size-6" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{city.name}</span>
                    {city.country && <span className="block text-sm">{city.country}</span>}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setCity(null)} disabled={busy}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  {quick.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Quick picks">
                      {quick.map((c) => (
                        <button
                          key={cityId(c)}
                          type="button"
                          onClick={() => setCity(c)}
                          className="inline-flex min-h-11 items-center gap-1.5 border-2 border-ink px-3 text-sm font-bold transition-colors hover:bg-saffron-soft"
                        >
                          <Icon name="pin" accent="sienna" className="size-4" />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <CitySearch label="Search for the city" onPick={(p) => setCity(fromPick(p))} />
                </>
              )}
            </fieldset>

            <TextArea
              label="Caption"
              optional
              value={caption}
              onChange={setCaption}
              maxLength={CAPTION_MAX}
              rows={2}
              placeholder="What's happening here?"
            />

            <div>
              <label htmlFor={dateId} className={fieldLabel}>
                Taken on
              </label>
              <input
                id={dateId}
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className={cn(inputBase, 'min-h-14 px-4 text-lg')}
              />
              <p className="mt-1.5 text-sm">From the photo file. Change it if it’s off.</p>
            </div>
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t-2 border-ink px-4 py-3 sm:px-5">
        <Button variant="secondary" onClick={onCancel} disabled={busy} className="flex-1 sm:flex-none">
          Cancel
        </Button>
        <Button type="submit" disabled={busy} aria-busy={busy || undefined} className="flex-1 sm:flex-none">
          {busy ? 'Saving…' : 'Save photo'}
        </Button>
      </div>
    </form>
  )
}
