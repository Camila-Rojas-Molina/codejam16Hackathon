// The live camera preview. Starts only when asked (a tap: iOS gesture rules), and stops every track
// on unmount (route change), when the page is hidden, and when the caller stops it after a capture.
// A late getUserMedia answer for a camera that was already stopped is shut down at once.
import { useCallback, useEffect, useRef, useState } from 'react'
import { cameraProblem, cameraUnavailable, countCameras, openCamera, stopStream, type CameraProblem } from './media'

export type CameraStatus = 'off' | 'starting' | 'live' | 'error'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Bumped by every start/stop, so an older start that resolves late knows it's been cancelled.
  const token = useRef(0)
  const [status, setStatus] = useState<CameraStatus>('off')
  const [problem, setProblem] = useState<CameraProblem | null>(() => cameraUnavailable())
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const facingRef = useRef(facing)
  const [cameras, setCameras] = useState(0)
  /** Stopped because the page was hidden (so the screen can offer "Resume"). */
  const [paused, setPaused] = useState(false)

  const stop = useCallback(() => {
    token.current += 1
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus((s) => (s === 'error' ? s : 'off'))
  }, [])

  const start = useCallback(async (want?: 'environment' | 'user') => {
    const unavailable = cameraUnavailable()
    if (unavailable) {
      setProblem(unavailable)
      setStatus('error')
      return false
    }
    const mine = ++token.current
    stopStream(streamRef.current)
    streamRef.current = null
    setStatus('starting')
    setProblem(null)
    setPaused(false)
    try {
      const stream = await openCamera(want ?? facingRef.current)
      if (mine !== token.current) {
        stopStream(stream)
        return false
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        // autoPlay covers most browsers; play() for the ones that need a nudge. Muted, so it's allowed.
        await video.play().catch(() => undefined)
      }
      if (mine !== token.current) return false
      if (want) {
        facingRef.current = want
        setFacing(want)
      }
      setStatus('live')
      countCameras().then((n) => mine === token.current && setCameras(n))
      return true
    } catch (e) {
      if (mine !== token.current) return false
      setProblem(cameraProblem(e))
      setStatus('error')
      return false
    }
  }, [])

  const flip = useCallback(() => start(facing === 'environment' ? 'user' : 'environment'), [facing, start])

  // Never keep the camera on in the background or after leaving the screen.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && streamRef.current) {
        stop()
        setPaused(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      token.current += 1
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [stop])

  return { videoRef, status, problem, paused, facing, canFlip: cameras > 1, start, stop, flip }
}
