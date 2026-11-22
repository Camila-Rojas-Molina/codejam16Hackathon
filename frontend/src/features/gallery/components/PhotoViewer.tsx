// Large photo viewer: full screen on phones, a big framed print on desktop. Arrow keys or swipe to
// move between photos, Esc or the close button to leave. Delete asks first.
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import Icon from '../../../components/icons/Icon'
import Button from '../../../components/ui/Button'
import { ErrorText } from '../../../components/ui/Fields'
import { cn } from '../../../lib/cn'
import { cityLabel, formatFullDate, photoAlt } from '../grouping'
import type { Photo } from '../types'
import Modal from './Modal'

type PhotoViewerProps = {
  photos: Photo[]
  /** Index of the photo shown, or null when closed. */
  index: number | null
  onIndex: (index: number) => void
  onClose: () => void
  /** Omit to hide the delete button. */
  onDelete?: (photo: Photo) => Promise<void>
}

const SWIPE_PX = 50

export default function PhotoViewer({ photos, index, onIndex, onClose, onDelete }: PhotoViewerProps) {
  const titleId = useId()
  const infoId = useId()
  const open = index !== null && photos.length > 0
  const i = open ? Math.min(index, photos.length - 1) : 0
  const photo = open ? photos[i] : null
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)

  const hasPrev = i > 0
  const hasNext = i < photos.length - 1
  const go = (to: number) => {
    if (to < 0 || to >= photos.length) return
    setConfirming(false)
    setError(null)
    onIndex(to)
  }

  // Warm up the neighbours so swiping feels instant.
  useEffect(() => {
    if (!open) return
    for (const n of [photos[i - 1], photos[i + 1]]) {
      if (n) new Image().src = n.url
    }
  }, [open, i, photos])

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse') return
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  function onPointerUp(e: PointerEvent) {
    const s = swipe.current
    swipe.current = null
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    go(dx < 0 ? i + 1 : i - 1)
  }

  async function remove() {
    if (!photo || !onDelete) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(photo)
      setConfirming(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t delete this photo.')
    } finally {
      setBusy(false)
    }
  }

  const where = photo ? cityLabel(photo) : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={infoId}
      closeOnBackdrop={false}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('input, textarea')) return
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          go(i + 1)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          go(i - 1)
        }
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-sheet"
    >
      {photo && (
        <div className="flex h-full flex-col lg:flex-row">
          {/* Picture area */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
              <p className="eyebrow text-sheet" aria-live="polite">
                Photo {i + 1} of {photos.length}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="grid size-12 place-items-center border-2 border-sheet text-sheet transition-colors hover:bg-sheet hover:text-ink"
              >
                <Icon name="close" accent="none" strokeWidth={2.4} className="size-6" label="Close viewer" />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 pb-2 select-none sm:px-16"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (swipe.current = null)}
            >
              {loaded !== photo.id && <span className="hatch-soft absolute inset-6 opacity-40 sm:inset-20" aria-hidden />}
              <img
                key={photo.id}
                src={photo.url}
                alt={photoAlt(photo)}
                draggable={false}
                onLoad={() => setLoaded(photo.id)}
                className="relative max-h-full max-w-full border-2 border-sheet object-contain"
              />
              <NavButton dir="prev" disabled={!hasPrev} onClick={() => go(i - 1)} />
              <NavButton dir="next" disabled={!hasNext} onClick={() => go(i + 1)} />
            </div>
          </div>

          {/* Details */}
          <aside id={infoId} className="sheet-grain max-h-[45dvh] shrink-0 overflow-y-auto border-t-2 border-ink p-4 text-ink sm:p-5 lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l-2">
            <h2 id={titleId} className="text-2xl break-words">
              {photo.caption ?? (photo.city?.name ? `In ${photo.city.name}` : 'A photo')}
            </h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <dt>
                  <Icon name="calendar" accent="teal" className="size-5" label="Taken" />
                </dt>
                <dd className="font-semibold">{formatFullDate(photo.takenAt)}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt>
                  <Icon name="pin" accent="sienna" className="size-5" label="Where" />
                </dt>
                <dd className="font-semibold">{where ?? 'No city added'}</dd>
              </div>
              {(photo.huntId || photo.questId) && (
                <div className="flex items-start gap-2">
                  <dt>
                    <Icon name="quest" accent="saffron" className="size-5" label="From" />
                  </dt>
                  <dd className="font-semibold">{photo.huntId ? 'Photo hunt' : 'Quest'}</dd>
                </div>
              )}
            </dl>

            {onDelete && (
              <div className="mt-5 border-t-2 border-dashed border-ink pt-4">
                {confirming ? (
                  <div role="group" aria-label="Confirm delete">
                    <p className="font-bold">Delete this photo for good?</p>
                    <p className="text-sm">It’s removed from your gallery and from storage. This can’t be undone.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="danger" icon="trash" onClick={remove} disabled={busy} aria-busy={busy || undefined} autoFocus>
                        {busy ? 'Deleting…' : 'Delete'}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                        Keep it
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" icon="trash" onClick={() => setConfirming(true)}>
                    Delete photo
                  </Button>
                )}
                <ErrorText>{error}</ErrorText>
              </div>
            )}
            <p className="mt-4 hidden text-xs lg:block">Use ← → to move between photos, Esc to close.</p>
          </aside>
        </div>
      )}
    </Modal>
  )
}

function NavButton({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center border-2 border-ink bg-saffron text-ink shadow-block-sm transition-colors',
        'hover:bg-sheet disabled:pointer-events-none disabled:opacity-0',
        dir === 'prev' ? 'left-2 sm:left-3' : 'right-2 sm:right-3',
      )}
    >
      <Icon
        name={dir === 'prev' ? 'arrow-left' : 'arrow-right'}
        accent="none"
        strokeWidth={2.4}
        className="size-6"
        label={dir === 'prev' ? 'Previous photo' : 'Next photo'}
      />
    </button>
  )
}
