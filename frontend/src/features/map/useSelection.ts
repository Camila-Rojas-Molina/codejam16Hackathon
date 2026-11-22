// Which landmark is open, kept in the URL as /map?landmark=<id|slug> so the Gallery (and a reload)
// can deep-link to it. A deep link asks the map to centre on the landmark once its details load,
// even when it's outside the current viewport; picking a pin doesn't move the camera.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLandmarkDetail } from './useLandmarkDetail'

const PARAM = 'landmark'

export type Selection = { key: string; /** Centre the map on it when the details arrive. */ focus: boolean }

export function useSelection() {
  const [params, setParams] = useSearchParams()
  const param = params.get(PARAM)
  const handled = useRef(param)
  const [selected, setSelected] = useState<Selection | null>(() => (param ? { key: param, focus: true } : null))
  const detail = useLandmarkDetail(selected?.key ?? null)

  // The URL changed from outside (a link while the map is open, or the address bar).
  useEffect(() => {
    if (param === handled.current) return
    handled.current = param
    setSelected(param ? { key: param, focus: true } : null)
  }, [param])

  const writeParam = useCallback(
    (value: string | null) => {
      handled.current = value
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(PARAM, value)
          else next.delete(PARAM)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const select = useCallback(
    (id: string, focus = false) => {
      setSelected({ key: id, focus })
      writeParam(id)
    },
    [writeParam],
  )

  const close = useCallback(() => {
    setSelected(null)
    writeParam(null)
  }, [writeParam])

  /** The map has centred on the deep-linked landmark. */
  const focused = useCallback(() => setSelected((s) => (s && s.focus ? { ...s, focus: false } : s)), [])

  const selectedId = detail.state?.detail?.id ?? selected?.key ?? null
  return { selected, selectedId, detail, select, close, focused }
}
