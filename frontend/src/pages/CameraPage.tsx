// /camera: take a photo and let the server link it to a nearby MIGO place. Full screen, outside the
// dashboard frame. The camera is only a capture UI (no computer vision): on the shutter press we grab
// one frame and ask for ONE GPS reading, the server checks it against Montréal Island and the
// landmark geofences (explore_check_location), and only an 'ok' photo is uploaded and registered.
// ?landmark=<id|slug> shows "Heading to X" (informative only: the server decides).
// Without a working camera, a file input (camera capture on phones) feeds the same pipeline.
import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import Icon from '../components/icons/Icon'
import Button from '../components/ui/Button'
import { ErrorText } from '../components/ui/Fields'
import { canSave, captureReducer, hasPhoto, initialCapture, statusText } from '../features/camera/captureMachine'
import ResultSheet from '../features/camera/components/ResultSheet'
import { downloadName, LOCATION_NOTICE, NOTICE_SEEN_KEY } from '../features/camera/config'
import { CAMERA_MESSAGES, requestFix } from '../features/camera/media'
import { saveCapture } from '../features/camera/saveCapture'
import { useCamera } from '../features/camera/useCamera'
import { BackendError, checkLocation, getLandmark } from '../features/explore/api'
import GalleryNotice from '../features/gallery/components/GalleryNotice'
import { prepareImage, renderJpeg } from '../features/gallery/image'
import { useGalleryAvailability } from '../features/gallery/useGallery'
import { cn } from '../lib/cn'
import { readJSON, writeJSON } from '../lib/storage'

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

export default function CameraPage() {
  const { availability } = useGalleryAvailability()
  if (availability !== 'online') {
    return (
      <div className="paper-grain flex min-h-dvh flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Link to="/gallery" className="inline-flex min-h-11 items-center gap-2 self-start font-bold underline decoration-2 underline-offset-4">
          <Icon name="arrow-left" accent="none" strokeWidth={2.4} className="size-5" />
          Back
        </Link>
        <GalleryNotice availability={availability} />
      </div>
    )
  }
  return <CameraScreen />
}

function CameraScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { videoRef, ...cam } = useCamera()
  const [state, dispatch] = useReducer(captureReducer, initialCapture)
  const attempt = useRef(0)
  const saving = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [noticeSeen, setNoticeSeen] = useState(() => readJSON<boolean>(NOTICE_SEEN_KEY) === true)

  // "Heading to X": just a hint from the map; where the photo belongs is the server's call.
  const headingId = params.get('landmark')
  const [heading, setHeading] = useState<{ id: string; name: string } | null>(null)
  useEffect(() => {
    if (!headingId) return
    let cancelled = false
    getLandmark(headingId)
      .then((l) => !cancelled && setHeading(l ? { id: headingId, name: l.name } : null))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [headingId])
  const headingName = heading && heading.id === headingId ? heading.name : null

  // The machine follows the preview: live → previewing, stopped (page hidden…) → idle.
  useEffect(() => {
    dispatch({ type: cam.status === 'live' ? 'preview' : 'preview_stopped' })
  }, [cam.status])

  const photoShown = hasPhoto(state)

  // The photo in memory, shown through a fresh object URL per attach (revoked on cleanup, so
  // StrictMode's double attach is safe); only re-attached when the photo itself changes.
  const shotBlob = state.shot?.blob ?? null
  const previewRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !shotBlob) return
      const url = URL.createObjectURL(shotBlob)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [shotBlob],
  )

  function markNoticeSeen() {
    if (noticeSeen) return
    setNoticeSeen(true)
    writeJSON(NOTICE_SEEN_KEY, true)
  }

  // One GPS reading for this attempt, then the read-only server check. Nothing is uploaded here.
  function locate(a: number, capturedAt: number) {
    requestFix(
      (fix) => {
        dispatch({ type: 'fix', attempt: a, fix })
        checkLocation(fix, capturedAt)
          .then((check) => dispatch({ type: 'checked', attempt: a, check }))
          .catch((e: unknown) => dispatch({ type: 'check_failed', attempt: a, message: errorMessage(e, 'Check your connection and try again.') }))
      },
      (problem) => dispatch({ type: 'gps_failed', attempt: a, problem }),
    )
  }

  // The shutter: everything in this one handler (same user gesture). The frame is drawn right now,
  // the GPS request goes out right after, and only then do we wait for the JPEG.
  function shoot() {
    const video = videoRef.current
    if (!video || state.phase !== 'previewing') return
    const capturedAt = Date.now()
    const a = ++attempt.current
    const encoding = renderJpeg(video, video.videoWidth, video.videoHeight)
    dispatch({ type: 'shutter', attempt: a, capturedAt })
    locate(a, capturedAt)
    cam.stop()
    markNoticeSeen()
    encoding
      .then((img) => dispatch({ type: 'image', attempt: a, shot: { ...img, source: 'camera' } }))
      .catch((e: unknown) => dispatch({ type: 'image_failed', attempt: a, message: errorMessage(e, 'The photo couldn’t be prepared. Try again.') }))
  }

  // Fallback: a picked (or phone-camera) photo goes through the same steps. capturedAt = now.
  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || (state.phase !== 'idle' && state.phase !== 'previewing')) return
    const capturedAt = Date.now()
    const a = ++attempt.current
    dispatch({ type: 'shutter', attempt: a, capturedAt })
    locate(a, capturedAt)
    cam.stop()
    markNoticeSeen()
    prepareImage(file)
      .then((img) => dispatch({ type: 'image', attempt: a, shot: { ...img, source: 'file' } }))
      .catch((err: unknown) => dispatch({ type: 'image_failed', attempt: a, message: errorMessage(err, 'This picture can’t be used.') }))
  }

  function relocate() {
    if (state.capturedAt === null) return
    const a = ++attempt.current
    dispatch({ type: 'relocate', attempt: a })
    locate(a, state.capturedAt)
  }

  async function save() {
    if (saving.current || !canSave(state)) return
    const { shot, fix, capturedAt, selectedId, attempt: a } = state
    if (!shot || !fix || capturedAt === null) return
    saving.current = true
    dispatch({ type: 'save' })
    try {
      const result = await saveCapture(shot, fix, capturedAt, selectedId)
      dispatch({ type: 'saved', attempt: a, result })
    } catch (e) {
      dispatch({
        type: 'save_failed',
        attempt: a,
        code: e instanceof BackendError ? e.code : null,
        reason: e instanceof BackendError ? e.hint : null,
        message: errorMessage(e, 'Check your connection and try again.'),
        now: Date.now(),
      })
    } finally {
      saving.current = false
    }
  }

  function retake() {
    dispatch({ type: 'discard' })
    void cam.start()
  }

  function cancel() {
    dispatch({ type: 'discard' })
  }

  function download() {
    if (!state.shot || state.capturedAt === null) return
    const url = URL.createObjectURL(state.shot.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName(state.capturedAt)
    document.body.append(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  function leave() {
    // Back to where they came from (map, gallery…), or the map when opened directly.
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else navigate('/map')
  }

  const live = cam.status === 'live'
  const cameraBlocked = cam.problem === 'insecure' || cam.problem === 'unsupported'
  const status = photoShown ? statusText(state) : cam.status === 'starting' ? 'Starting the camera…' : cam.status === 'error' && cam.problem ? CAMERA_MESSAGES[cam.problem] : statusText(state)

  return (
    <div className="fixed inset-0 flex flex-col bg-ink text-sheet">
      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-2 pl-[max(0.75rem,env(safe-area-inset-left))]">
        <button
          type="button"
          onClick={leave}
          disabled={state.phase === 'uploading'}
          className="grid size-12 shrink-0 place-items-center border-2 border-sheet transition-colors hover:bg-sheet hover:text-ink disabled:opacity-50"
        >
          <Icon name="close" accent="none" strokeWidth={2.4} className="size-6" label="Close camera" />
        </button>
        <div className="min-w-0 flex-1">
          {headingName ? (
            <p className="inline-flex max-w-full items-center gap-1.5 border-2 border-sheet bg-ink/60 px-2.5 py-1 text-sm font-bold">
              <Icon name="flag" accent="saffron" className="size-5" />
              <span className="truncate">Heading to {headingName}</span>
            </p>
          ) : (
            <p className="eyebrow truncate text-sheet">Camera</p>
          )}
        </div>
        {live && cam.canFlip && (
          <button
            type="button"
            onClick={() => void cam.flip()}
            className="grid size-12 shrink-0 place-items-center border-2 border-sheet transition-colors hover:bg-sheet hover:text-ink"
          >
            <Icon name="shuffle" accent="none" strokeWidth={2.2} className="size-6" label={cam.facing === 'environment' ? 'Switch to the front camera' : 'Switch to the back camera'} />
          </button>
        )}
      </div>

      {/* Viewfinder / photo */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
          className={cn('absolute inset-0 size-full object-cover', (!live || photoShown) && 'invisible', cam.facing === 'user' && '-scale-x-100')}
        />
        {photoShown && state.shot && (
          <img
            ref={previewRef}
            alt="The photo you just took"
            className="absolute inset-0 size-full object-contain"
          />
        )}
        {photoShown && !state.shot && <div className="hatch-soft absolute inset-6 opacity-30" aria-hidden />}

        {!photoShown && !live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto px-5 py-6 text-center">
            <Icon name="camera" accent="saffron" className="size-14" />
            <h1 className="text-3xl text-sheet">Snap a place</h1>
            <p className="max-w-sm">Take a photo where you are. If it’s at a MIGO place, it’s added to your map as a visit.</p>
            {cam.status === 'error' && cam.problem && (
              <ErrorText className="max-w-sm text-left">{CAMERA_MESSAGES[cam.problem]}</ErrorText>
            )}
            {cam.paused && cam.status === 'off' && <p className="text-sm">The camera turned off while MIGO was in the background.</p>}
            <div className="flex w-full max-w-xs flex-col gap-2">
              {!cameraBlocked && (
                <Button icon="camera" size="lg" onClick={() => void cam.start()} disabled={cam.status === 'starting'} aria-busy={cam.status === 'starting' || undefined}>
                  {cam.status === 'starting' ? 'Starting…' : cam.paused ? 'Resume camera' : cam.status === 'error' ? 'Try again' : 'Start camera'}
                </Button>
              )}
              <Button variant={cameraBlocked || cam.status === 'error' ? 'primary' : 'secondary'} icon="gallery" onClick={() => fileInput.current?.click()}>
                Take or pick a photo
              </Button>
            </div>
            <p className="flex max-w-sm items-start gap-2 text-left text-sm">
              <Icon name="pin" accent="sienna" className="mt-0.5 size-5" />
              {LOCATION_NOTICE}
            </p>
          </div>
        )}
      </div>

      {/* Hidden picker behind "Take or pick a photo". `capture` opens the camera on phones. */}
      <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" tabIndex={-1} aria-hidden />

      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      {/* Controls */}
      {live && !photoShown && (
        <div className="relative z-10 border-t-2 border-sheet/30 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
          {!noticeSeen && (
            <p className="mx-auto mb-3 flex max-w-md items-start gap-2 text-xs sm:text-sm">
              <Icon name="pin" accent="sienna" className="size-4 sm:size-5" />
              {LOCATION_NOTICE}
            </p>
          )}
          <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="grid size-12 place-items-center justify-self-start border-2 border-sheet transition-colors hover:bg-sheet hover:text-ink"
            >
              <Icon name="gallery" accent="none" className="size-6" label="Pick a photo instead" />
            </button>
            <button
              type="button"
              onClick={shoot}
              aria-label="Take photo"
              className="grid size-20 place-items-center rounded-full border-4 border-sheet transition-transform active:scale-95"
            >
              <span className="block size-15 rounded-full bg-saffron" aria-hidden />
            </button>
            <span aria-hidden />
          </div>
        </div>
      )}

      {photoShown && (
        <div className="relative z-10 max-h-[60dvh] overflow-y-auto">
          <ResultSheet
            state={state}
            onSelect={(id) => dispatch({ type: 'select', landmarkId: id })}
            onSave={() => void save()}
            onRelocate={relocate}
            onRetake={retake}
            onCancel={cancel}
            onDownload={download}
          />
        </div>
      )}
    </div>
  )
}
