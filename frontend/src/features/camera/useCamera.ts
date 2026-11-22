// Holds the live camera stream for one <video>. Imperative on purpose: start() is called from a tap
// (iOS wants a gesture), stop() after a capture, when the page is hidden and on unmount, so the
// camera light never stays on behind the user's back.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { countVideoInputs, openCameraStream, stopStream, type Facing } from './device'

/** Thrown by start() when a newer start() or a stop() made this one pointless. */
export class CameraSuperseded extends Error {}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const stream = useRef<MediaStream | null>(null)
  const token = useRef(0)
  const [facing, setFacing] = useState<Facing>('environment')
  const [cameraCount, setCameraCount] = useState(0)

  const stop = useCallback(() => {
    token.current++
    stopStream(stream.current)
    stream.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
  }, [videoRef])

  const start = useCallback(
    async (want: Facing = facing) => {
      stop()
      const mine = ++token.current
      const s = await openCameraStream(want)
      if (mine !== token.current) {
        stopStream(s)
        throw new CameraSuperseded('superseded')
      }
      stream.current = s
      setFacing(want)
      const video = videoRef.current
      if (video) {
        video.srcObject = s
        // autoPlay usually does it; play() covers browsers that wait. Its rejection isn't fatal.
        await video.play().catch(() => undefined)
      }
      countVideoInputs().then((n) => mine === token.current && setCameraCount(n))
    },
    [facing, stop, videoRef],
  )

  // Leaving the page (route change or unmount) always releases the camera.
  useEffect(() => stop, [stop])

  return { start, stop, facing, canFlip: cameraCount > 1 }
}
