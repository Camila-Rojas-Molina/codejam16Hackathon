// /camera: take a photo of a MIGO place. Full screen, outside the dashboard. The camera is only a
// capture UI: the shutter freezes one frame and takes ONE GPS reading in the same tap; the server
// (explore_check_location, then explore_register_capture) decides whether the photo belongs to a
// landmark, is a Montréal memory, or can't be saved. Nothing is uploaded before that check says ok.
// ?landmark=<id|slug> is where the user means to go ("Heading to X"); purely informative.
// Flow and states: features/camera/captureMachine.ts.
import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Icon from '../components/icons/Icon'
import Screen from '../components/layout/Screen'
import Button from '../components/ui/Button'
import { ErrorText } from '../components/ui/Fields'
import CapturePanel from '../features/camera/components/CapturePanel'
import {
  captureReducer,
  heldShot,
  initialCaptureState,
  type CaptureState,
  type CheckingState,
  type UploadingState,
} from '../features/camera/captureMachine'
import { CLIENT_ACCURACY_PREFILTER, LOCATION_EXPLAINER } from '../features/camera/config'
import { cameraUnavailable, classifyCameraError, drawFrame, encodeFrame, isFreshPick, readLocationOnce, shotFromFile } from '../features/camera/device'
import { cameraErrorText, statusLine } from '../features/camera/messages'
import { describeSaveError, saveCapture } from '../features/camera/saveCapture'
import { CameraSuperseded, useCamera } from '../features/camera/useCamera'
import { checkLocation, getLandmark } from '../features/explore/api'
import type { LocationCheck } from '../features/explore/types'
import GalleryNotice from '../features/gallery/components/GalleryNotice'
import { useGalleryAvailability } from '../features/gallery/useGallery'
import { cn } from '../lib/cn'

export default function CameraPage() {
  const { availability } = useGalleryAvailability()
  const [params] = useSearchParams()
  const heading = params.get('landmark')?.trim() || null
  const back = useBack()

  if (availability !== 'online') {
    return (
      <Screen className="gap-5">
        <BackButton onClick={back} dark={false} />
        <GalleryNotice availability={availability} />
      </Screen>
    )
  }
  return <CameraScreen heading={heading} onBack={back} />
}

/** Back where the user came from (the map or the gallery), or the map on a fresh tab. */
function useBack() {
  const navigate = useNavigate()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/map')
  }, [navigate])
}

function useLandmarkName(idOrSlug: string | null) {
  const [found, setFound] = useState<{ key: string; name: string | null } | null>(null)
  useEffect(() => {
    if (!idOrSlug) return
    let cancelled = false
    getLandmark(idOrSlug)
      .then((l) => !cancelled && setFound({ key: idOrSlug, name: l?.name ?? null }))
      .catch(() => !cancelled && setFound({ key: idOrSlug, name: null }))
    return () => {
      cancelled = true
    }
  }, [idOrSlug])
  return found && found.key === idOrSlug ? found.name : null
}

function CameraScreen({ heading, onBack }: { heading: string | null; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [state, dispatch] = useReducer(captureReducer, initialCaptureState)
  const camera = useCamera(videoRef)
  const [videoReady, setVideoReady] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const headingName = useLandmarkName(heading)

  const shotSeq = useRef(0)
  const attemptSeq = useRef(0)
  /** The shot currently held (0 = none), so late results for a discarded one are dropped. */
  const activeShot = useRef(0)
  /** The server's thresholds from its last check, for the optional client-side accuracy pre-filter. */
  const limits = useRef<LocationCheck['limits'] | null>(null)
  const savingShot = useRef(0)

  // ---- Photo preview lifetime: revoke an object URL once no state holds it -------------------
  const previewUrl = heldShot(state)?.previewUrl ?? null
  const liveUrl = useRef<string | null>(null)
  useEffect(() => {
    if (liveUrl.current && liveUrl.current !== previewUrl) URL.revokeObjectURL(liveUrl.current)
    liveUrl.current = previewUrl
  }, [previewUrl])
  useEffect(
    () => () => {
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current)
      liveUrl.current = null
    },
    [],
  )

  // ---- Camera -------------------------------------------------------------------------------
  const { start: startStream, stop: stopStream, facing, canFlip } = camera
  const startCamera = useCallback(
    (want?: typeof facing) => {
      setPickError(null)
      const why = cameraUnavailable()
      if (why) {
        dispatch({ type: 'CAMERA_FAILED', error: why })
        return
      }
      setVideoReady(false)
      dispatch({ type: 'CAMERA_STARTING' })
      startStream(want)
        .then(() => dispatch({ type: 'CAMERA_READY' }))
        .catch((e: unknown) => {
          if (!(e instanceof CameraSuperseded)) dispatch({ type: 'CAMERA_FAILED', error: classifyCameraError(e) })
        })
    },
    [startStream],
  )

  const stopCamera = useCallback(() => {
    stopStream()
    setVideoReady(false)
    dispatch({ type: 'CAMERA_STOPPED' })
  }, [stopStream])

  // Camera already allowed for this site: start it straight away (once). Otherwise wait for a tap,
  // so the permission prompt follows the explanation on screen.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current || !navigator.permissions?.query || cameraUnavailable()) return
    let cancelled = false
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((p) => {
        if (cancelled || autoStarted.current || p.state !== 'granted') return
        autoStarted.current = true
        startCamera()
      })
      .catch(() => undefined) // Not every browser can be asked about the camera.
    return () => {
      cancelled = true
    }
  }, [startCamera])

  // A hidden page (app switch, lock screen, bfcache) never keeps the camera on.
  useEffect(() => {
    const onVisibility = () => document.visibilityState === 'hidden' && stopCamera()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', stopCamera)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', stopCamera)
    }
  }, [stopCamera])

  // ---- GPS: one reading per request, tagged so a late one can't land on another photo ------
  const locate = useCallback((shotId: number, attempt: number) => {
    readLocationOnce(
      (fix) =>
        dispatch({
          type: 'FIX',
          shotId,
          attempt,
          fix,
          maxAccuracyM: CLIENT_ACCURACY_PREFILTER ? (limits.current?.maxAccuracyM ?? null) : null,
        }),
      (error) => dispatch({ type: 'GEO_ERROR', shotId, attempt, error }),
    )
  }, [])

  /** Starts a shot: same tick as the tap, so the capture time and the GPS request belong together. */
  function beginShot(capturedAt: number) {
    const shotId = ++shotSeq.current
    const attempt = ++attemptSeq.current
    activeShot.current = shotId
    dispatch({ type: 'SHUTTER', shotId, capturedAt, attempt })
    return { shotId, attempt }
  }

  function onShutter() {
    const video = videoRef.current
    if (state.phase !== 'previewing' || !video) return
    const capturedAt = Date.now()
    const canvas = drawFrame(video) // synchronous: the frame on screen at the tap
    if (!canvas) return
    const { shotId, attempt } = beginShot(capturedAt)
    const encoded = encodeFrame(canvas) // toBlob starts now…
    locate(shotId, attempt) // …and so does the one GPS reading, without waiting for the JPEG.
    stopStream()
    setVideoReady(false)
    encoded
      .then((photo) => {
        if (activeShot.current === shotId) dispatch({ type: 'PHOTO_READY', shotId, photo })
        else URL.revokeObjectURL(photo.previewUrl)
      })
      .catch((e: unknown) => dispatch({ type: 'PHOTO_FAILED', shotId, message: e instanceof Error ? e.message : 'The photo couldn’t be taken.' }))
  }

  function openPicker() {
    // The camera app needs the camera: release ours first.
    if (state.phase === 'previewing' || (state.phase === 'idle' && state.starting)) stopCamera()
    fileRef.current?.click()
  }

  function onPicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same file again still fires
    if (!file || (state.phase !== 'idle' && state.phase !== 'previewing')) return
    const capturedAt = Date.now()
    if (!isFreshPick(file, capturedAt)) {
      setPickError('That picture was taken earlier. Take a new one now, or add older pictures from the Gallery with Upload.')
      return
    }
    setPickError(null)
    const { shotId, attempt } = beginShot(capturedAt)
    locate(shotId, attempt)
    shotFromFile(file)
      .then((photo) => {
        if (activeShot.current === shotId) dispatch({ type: 'PHOTO_READY', shotId, photo })
        else URL.revokeObjectURL(photo.previewUrl)
      })
      .catch((err: unknown) => dispatch({ type: 'PHOTO_FAILED', shotId, message: err instanceof Error ? err.message : 'That picture couldn’t be opened.' }))
  }

  // ---- Server pre-check (read-only), once per checking step ---------------------------------
  const checking = state.phase === 'checking' ? state : null
  const lastChecked = useRef<CheckingState | null>(null)
  useEffect(() => {
    if (!checking || lastChecked.current === checking) return
    lastChecked.current = checking
    checkLocation(checking.fix, checking.capturedAt)
      .then((check) => {
        limits.current = check.limits
        dispatch({ type: 'CHECK_RESULT', shotId: checking.shotId, check })
      })
      .catch((e: unknown) =>
        dispatch({
          type: 'CHECK_FAILED',
          shotId: checking.shotId,
          message: e instanceof TypeError ? 'No connection. Check your network and try again.' : `Your location couldn’t be checked. ${e instanceof Error ? e.message : ''}`.trim(),
        }),
      )
  }, [checking])

  // ---- Save: upload, register, clean up on failure (features/camera/saveCapture.ts) ---------
  function runSave(s: UploadingState) {
    if (savingShot.current === s.shotId) return // a double tap
    savingShot.current = s.shotId
    saveCapture(s)
      .then((result) => dispatch({ type: 'SAVE_OK', shotId: s.shotId, result }))
      .catch((e: unknown) => {
        const { message, retryLocation } = describeSaveError(e)
        dispatch({ type: 'SAVE_FAILED', shotId: s.shotId, message, retryLocation })
      })
      .finally(() => {
        if (savingShot.current === s.shotId) savingShot.current = 0
      })
  }

  function onSave() {
    const next = captureReducer(state, { type: 'SAVE' })
    if (next.phase !== 'uploading') return
    dispatch({ type: 'SAVE' })
    runSave(next)
  }

  function onRetry() {
    const next = captureReducer(state, { type: 'RETRY' })
    dispatch({ type: 'RETRY' })
    if (next.phase === 'uploading') runSave(next)
  }

  function onRetryLocation() {
    if (!('shotId' in state)) return
    const attempt = ++attemptSeq.current
    dispatch({ type: 'RETRY_LOCATION', attempt })
    locate(state.shotId, attempt)
  }

  function discard() {
    activeShot.current = 0
    dispatch({ type: 'DISCARD' })
  }

  function onRetake() {
    discard()
    startCamera()
  }

  // Move focus to each new result so screen reader and keyboard users land on it.
  const resultPhase = state.phase === 'idle' || state.phase === 'previewing' ? null : state.phase
  useEffect(() => {
    if (resultPhase && resultPhase !== 'capturing') headingRef.current?.focus({ preventScroll: true })
  }, [resultPhase])

  const nameFor = (id: string | null) => landmarkName(state, id, heading, headingName)
  const status = statusLine(state, nameFor)
  const shot = heldShot(state)
  const live = state.phase === 'previewing'

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--night-shadow)] text-white">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-2 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-2 pl-[max(0.75rem,env(safe-area-inset-left))]">
        <BackButton onClick={onBack} />
        <h1 className="sr-only">Camera</h1>
        {heading && headingName && (
          <p className="ml-auto flex min-w-0 items-center gap-1.5 border-2 border-white/80 px-2.5 py-1 text-xs font-bold tracking-[0.08em] uppercase">
            <Icon name="flag" accent="saffron" className="size-4" />
            <span className="truncate">Heading to {headingName}</span>
          </p>
        )}
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {/* Viewfinder / photo */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
          onLoadedMetadata={(e) => e.currentTarget.videoWidth > 0 && setVideoReady(true)}
          onPlaying={(e) => e.currentTarget.videoWidth > 0 && setVideoReady(true)}
          className={cn('absolute inset-0 size-full object-cover', facing === 'user' && '-scale-x-100', !live && 'invisible')}
        />
        {shot && <img src={shot.previewUrl} alt="The photo you just took" className="absolute inset-0 size-full object-contain" />}
        {!live && !shot && state.phase === 'idle' && <IdleView state={state} onStart={() => startCamera()} onPick={openPicker} pickError={pickError} />}
        {!live && !shot && state.phase === 'capturing' && (
          <div className="absolute inset-0 grid place-items-center" aria-hidden>
            <Icon name="camera" accent="none" className="size-16 opacity-60" />
          </div>
        )}
      </div>

      {/* Controls / result */}
      {live ? (
        <div className="shrink-0 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
          <p className="mx-auto mb-3 flex max-w-md items-start gap-2 text-xs leading-snug sm:text-sm">
            <Icon name="pin" accent="saffron" className="mt-px size-4" />
            <span>{LOCATION_EXPLAINER}</span>
          </p>
          <div className="mx-auto grid max-w-md grid-cols-3 items-center">
            <button
              type="button"
              onClick={openPicker}
              className="grid size-12 place-items-center justify-self-start border-2 border-white/80 transition-colors hover:bg-white/15"
            >
              <Icon name="gallery" accent="none" className="size-6" label="Use your camera app instead" />
            </button>
            <button
              type="button"
              onClick={onShutter}
              disabled={!videoReady}
              aria-label="Take photo"
              className="grid size-20 place-items-center justify-self-center rounded-full border-4 border-white transition-transform active:scale-95 disabled:opacity-50"
            >
              <span className="block size-15 rounded-full bg-white" aria-hidden />
            </button>
            {canFlip ? (
              <button
                type="button"
                onClick={() => startCamera(facing === 'environment' ? 'user' : 'environment')}
                className="grid size-12 place-items-center justify-self-end border-2 border-white/80 transition-colors hover:bg-white/15"
              >
                <Icon name="shuffle" accent="none" className="size-6" label={facing === 'environment' ? 'Switch to front camera' : 'Switch to rear camera'} />
              </button>
            ) : (
              <span aria-hidden />
            )}
          </div>
        </div>
      ) : (
        state.phase !== 'idle' && (
          <CapturePanel
            state={state}
            nameFor={nameFor}
            headingRef={headingRef}
            onPick={(landmarkId) => dispatch({ type: 'PICK', landmarkId })}
            onSave={onSave}
            onRetryLocation={onRetryLocation}
            onRetry={onRetry}
            onRetake={onRetake}
            onCancel={discard}
          />
        )
      )}

      {/* The fallback picker: `capture` opens the phone's camera app directly. */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPicked} className="sr-only" tabIndex={-1} aria-hidden />
    </div>
  )
}

/** Name of a landmark the check mentioned, or the "heading to" one, else a generic label. */
function landmarkName(s: CaptureState, id: string | null, heading: string | null, headingName: string | null): string | null {
  if (!id) return null
  const fromCheck = 'check' in s ? s.check.candidates.find((c) => c.id === id)?.name : undefined
  return fromCheck ?? (heading === id && headingName ? headingName : 'a MIGO place')
}

function IdleView({
  state,
  onStart,
  onPick,
  pickError,
}: {
  state: Extract<CaptureState, { phase: 'idle' }>
  onStart: () => void
  onPick: () => void
  pickError: string | null
}) {
  const err = state.cameraError ? cameraErrorText(state.cameraError) : null
  const canLive = state.cameraError !== 'insecure' && state.cameraError !== 'unsupported'
  return (
    <div className="absolute inset-0 overflow-y-auto pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
      <div className="flex min-h-full items-center justify-center py-4">
        <section aria-labelledby="camera-idle" className="sheet-grain w-full max-w-md border-2 border-ink p-5 text-ink">
          <p className="eyebrow">Camera</p>
          <h2 id="camera-idle" className="mt-1 text-2xl">
            {err ? err.title : 'Snap a MIGO place'}
          </h2>
          <p className="mt-2 text-sm">
            {err ? err.body : 'Take a photo where you are. If you’re at a MIGO place, it’s saved there and counts as a visit.'}
          </p>
          <p className="mt-3 flex items-start gap-2 border-2 border-dashed border-ink px-3 py-2 text-sm">
            <Icon name="pin" accent="sienna" className="mt-px size-5" />
            <span>{LOCATION_EXPLAINER}</span>
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {canLive && (
              <Button icon="camera" fullWidth onClick={onStart} disabled={state.starting} aria-busy={state.starting || undefined}>
                {state.starting ? 'Starting camera…' : err ? 'Try again' : 'Start camera'}
              </Button>
            )}
            <Button variant={canLive ? 'secondary' : 'primary'} icon="gallery" fullWidth onClick={onPick}>
              Use camera app
            </Button>
          </div>
          <ErrorText>{pickError}</ErrorText>
        </section>
      </div>
    </div>
  )
}

function BackButton({ onClick, dark = true }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-11 items-center gap-1.5 border-2 px-3 text-xs font-bold tracking-[0.08em] uppercase transition-colors',
        dark ? 'border-white/80 text-white hover:bg-white/15' : 'self-start border-ink text-ink hover:bg-saffron-soft',
      )}
    >
      <Icon name="arrow-left" accent="none" strokeWidth={2.4} className="size-4" />
      Back
    </button>
  )
}
