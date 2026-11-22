// Selfies from this session's photo hunts. They only live in memory (HuntResult.selfieUrl) and are
// gone after a reload, so they're shown apart from the gallery and clearly marked "not saved".
// When the person is online and signed in, each one can be saved to the gallery for real.
import { useEffect, useState } from 'react'
import Icon from '../../../components/icons/Icon'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import * as api from '../../../lib/api'
import type { HuntResult } from '../../../lib/types'

type SessionSelfiesProps = {
  results: HuntResult[]
  /** Hunt ids already saved to the gallery in this session. */
  savedHuntIds: string[]
  /** Omit when photos can't be saved (device mode / signed out). */
  onSave?: (result: HuntResult, title: string) => void
}

export default function SessionSelfies({ results, savedHuntIds, onSave }: SessionSelfiesProps) {
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [broken, setBroken] = useState<string[]>([])
  const withSelfie = results.filter((r) => r.selfieUrl && !broken.includes(r.huntId))

  const needTitles = withSelfie.length > 0
  useEffect(() => {
    if (!needTitles) return
    let cancelled = false
    api
      .getHunts()
      .then((hunts) => !cancelled && setTitles(Object.fromEntries(hunts.map((h) => [h.id, h.title]))))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [needTitles])

  if (withSelfie.length === 0) return null

  return (
    <section aria-labelledby="session-selfies" className="border-2 border-dashed border-ink bg-sandy-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="session-selfies" className="text-xl sm:text-2xl">
          This session’s selfies
        </h2>
        <Badge tone="sienna" icon="alert">
          Not saved yet
        </Badge>
      </div>
      <p className="mt-1 max-w-2xl text-sm">
        These hunt selfies are only kept on this screen and disappear when the page reloads.
        {onSave ? ' Save the ones you want to keep to your gallery.' : ' Saving photos needs an online account.'}
      </p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2" aria-label="Unsaved hunt selfies">
        {withSelfie.map((r) => {
          const title = titles[r.huntId] ?? 'Photo hunt'
          const saved = savedHuntIds.includes(r.huntId)
          return (
            <li key={r.huntId} className="sheet-grain w-40 shrink-0 border-2 border-ink sm:w-44">
              <img
                src={r.selfieUrl}
                alt={`Selfie at ${title}`}
                onError={() => setBroken((b) => [...b, r.huntId])}
                className="aspect-square w-full border-b-2 border-ink object-cover"
              />
              <div className="p-2">
                <p className="truncate text-sm font-bold">{title}</p>
                {saved ? (
                  <p className="mt-1 flex min-h-10 items-center gap-1 text-xs font-bold tracking-[0.1em] uppercase">
                    <Icon name="check" accent="teal" className="size-5" /> Saved
                  </p>
                ) : onSave ? (
                  <Button size="sm" variant="secondary" fullWidth className="mt-1" onClick={() => onSave(r, title)}>
                    Save to gallery
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
