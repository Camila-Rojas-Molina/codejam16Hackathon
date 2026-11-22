// Migo's guided tour. Shown once to a new account on its first visit to the hub (the record's
// `tutorial` is 'pending'), and again when someone picks "Replay the tour" in Settings.
//
//   * The page is dimmed (ink, with a faint printed hatch) except for a cut-out over the part being
//     explained, framed like a ruled cell with a saffron block shadow.
//   * Migo, the MIGO logo and a speech bubble sit together on one sheet, placed beside the target where
//     there's room (desktop) or above/below it (phones), never on top of it.
//   * Each stop can open a page of the app (steps.ts `route`), so the real Map, Discover, Quests,
//     Shop, Gallery and Profile are on screen while Migo explains them. The spotlight waits for the
//     page to draw its target, and scrolls it into view.
//   * Progress squares + "Step 3 of 10", Back, Next, and Skip tour. Esc skips; ← and → step.
//     Finishing goes back to the Map; skipping leaves you wherever you are.
//   * Skip and Finish are saved to the profile record right away (api.setTutorialStatus), so the tour
//     never comes back on its own. The tour blocks clicks on the page underneath while it's open.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Icon from '../../components/icons/Icon'
import { Mascot } from '../../components/illustrations/Mascot'
import { buttonClasses } from '../../components/ui/buttonStyles'
import Logo from '../../components/ui/Logo'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/useStore'
import { resolve, TOUR_STEPS } from './steps'

type Rect = { x: number; y: number; w: number; h: number }

const PAD = 6 // spotlight padding around the target
const GAP = 18 // between the spotlight and the tour sheet
const EDGE = 12 // keep the sheet this far from the screen edge
const TOP_BAR = 76 // the hub's sticky top bar, so a scrolled-to target isn't hidden under it

const isVisible = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}

/** The visible elements for these tour hooks, and the box around all of them. */
function findTarget(names: string[] | undefined): { rect: Rect | null; els: Element[] } {
  if (!names) return { rect: null, els: [] }
  const els = names.flatMap((n) => [...document.querySelectorAll(`[data-tour="${n}"]`)]).filter(isVisible)
  if (els.length === 0) return { rect: null, els }
  const rs = els.map((e) => e.getBoundingClientRect())
  const x = Math.min(...rs.map((r) => r.left))
  const y = Math.min(...rs.map((r) => r.top))
  const right = Math.max(...rs.map((r) => r.right))
  const bottom = Math.max(...rs.map((r) => r.bottom))
  return { rect: { x: x - PAD, y: y - PAD, w: right - x + PAD * 2, h: bottom - y + PAD * 2 }, els }
}

const same = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5)

/** The part of a rect that's on screen (null when none of it is). */
function clipToViewport(r: Rect, vw: number, vh: number): Rect | null {
  const x = Math.max(r.x, 0)
  const y = Math.max(r.y, 0)
  const w = Math.min(r.x + r.w, vw) - x
  const h = Math.min(r.y + r.h, vh) - y
  return w > 0 && h > 0 ? { x, y, w, h } : null
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)))

/** Where the sheet goes: beside the target if it fits (wide screens), else above/below, away from it. */
function placeSheet(t: Rect | null, sheet: { w: number; h: number }, vw: number, vh: number): { x: number; y: number } {
  const center = { x: (vw - sheet.w) / 2, y: (vh - sheet.h) / 2 }
  if (!t) return center
  const midY = clamp(t.y + t.h / 2 - sheet.h / 2, EDGE, vh - sheet.h - EDGE)
  const midX = clamp(t.x + t.w / 2 - sheet.w / 2, EDGE, vw - sheet.w - EDGE)
  const options = {
    right: { x: t.x + t.w + GAP, y: midY, fits: t.x + t.w + GAP + sheet.w <= vw - EDGE },
    left: { x: t.x - GAP - sheet.w, y: midY, fits: t.x - GAP - sheet.w >= EDGE },
    below: { x: midX, y: t.y + t.h + GAP, fits: t.y + t.h + GAP + sheet.h <= vh - EDGE },
    above: { x: midX, y: t.y - GAP - sheet.h, fits: t.y - GAP - sheet.h >= EDGE },
  }
  const lowerHalf = t.y + t.h / 2 > vh / 2
  const vertical = lowerHalf ? (['above', 'below'] as const) : (['below', 'above'] as const)
  const order = vw >= 768 ? (['right', 'left', ...vertical] as const) : vertical
  for (const side of order) if (options[side].fits) return options[side]
  // Nothing fits cleanly (a very small screen): pin to the edge furthest from the target.
  return { x: center.x, y: lowerHalf ? EDGE : vh - sheet.h - EDGE }
}

export default function Tour() {
  const { profile, setTutorial } = useStore()
  const pending = profile?.tutorial?.status === 'pending'
  // Hidden as soon as it's skipped or finished, without waiting for the save.
  const [closed, setClosed] = useState(false)
  // A replay (status back to 'pending') opens it again.
  const [seenAt, setSeenAt] = useState(profile?.tutorial?.at)
  if (profile?.tutorial?.at !== seenAt) {
    setSeenAt(profile?.tutorial?.at)
    setClosed(false)
  }
  if (!pending || closed) return null
  return <TourRunner mode={profile?.activeMode ?? null} onClosed={(status) => {
        setClosed(true)
        void setTutorial(status).catch(() => {
          // Offline: it will simply be offered again next time.
        })
      }} />
}

/** Finishing returns to the Map (home); skipping leaves you where you are. */
function TourRunner({ mode, onClosed }: { mode: 'tourist' | 'local' | null; onClosed: (status: 'completed' | 'skipped') => void }) {
  const navigate = useNavigate()
  return (
    <TourOverlay
      mode={mode}
      onClose={(status) => {
        onClosed(status)
        if (status === 'completed') navigate('/map')
      }}
    />
  )
}

function TourOverlay({ mode, onClose }: { mode: 'tourist' | 'local' | null; onClose: (status: 'completed' | 'skipped') => void }) {
  const [index, setIndex] = useState(0)
  const [target, setTarget] = useState<Rect | null>(null)
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [sheetSize, setSheetSize] = useState({ w: 0, h: 0 })
  const sheetRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const ids = useId()
  const step = TOUR_STEPS[index]
  const last = index === TOUR_STEPS.length - 1
  const remaining = TOUR_STEPS.length - 1 - index
  const route = step.route ? resolve(step.route, mode) : null
  const names = step.target ? resolve(step.target, mode) : undefined
  const namesKey = names?.join(',') ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const here = location.pathname + location.search

  // Open the stop's page (the tour stays on top). Replace, so Back in the browser isn't ten tour stops.
  useEffect(() => {
    if (route && route !== here) navigate(route, { replace: true })
  }, [route, here, navigate])

  // Once the page has drawn the target, bring it into view (once per stop).
  const scrolledFor = useRef<string | null>(null)

  // Follow the target (and the sheet's own size) every frame: layout shifts, scrolling, resizing,
  // the phone's toolbar sliding in… all just work.
  useLayoutEffect(() => {
    let frame = 0
    const list = namesKey ? namesKey.split(',') : undefined
    const tick = () => {
      const found = findTarget(list)
      if (found.els[0] && scrolledFor.current !== step.id) {
        scrolledFor.current = step.id
        const r = found.els[0].getBoundingClientRect()
        if (r.top < TOP_BAR || r.bottom > window.innerHeight) {
          // Tall targets: their top just under the sticky top bar. Others: centred.
          const top = r.height > window.innerHeight * 0.6 ? r.top - TOP_BAR - PAD * 2 : r.top - (window.innerHeight - r.height) / 2
          window.scrollTo({ top: window.scrollY + top, behavior: 'smooth' })
        }
      }
      setTarget((prev) => (same(prev, found.rect) ? prev : found.rect))
      setViewport((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }))
      const el = sheetRef.current
      if (el) setSheetSize((s) => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }))
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [step, namesKey])

  // Move focus to Next once the sheet is placed (it's hidden until measured, and can't take focus before).
  const measured = sheetSize.w > 0
  useEffect(() => {
    if (measured) nextRef.current?.focus({ preventScroll: true })
  }, [step, measured])

  const go = useCallback(
    (to: number) => {
      if (to >= TOUR_STEPS.length) onClose('completed')
      else setIndex(Math.max(0, to))
    },
    [onClose],
  )

  // Esc skips, arrows step: wherever focus is, while the tour is open.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose('skipped')
      } else if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, onClose])

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      // Keep focus inside the tour.
      const focusable = [...(sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])]
      const first = focusable[0]
      const lastEl = focusable.at(-1)
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        lastEl?.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        first?.focus()
      }
    }
  }

  // Big targets (the map) are clipped to the screen, so the sheet can be placed against what's visible.
  const visible = names && target ? clipToViewport(target, viewport.w, viewport.h) : null
  const pos = placeSheet(visible, sheetSize, viewport.w, viewport.h)
  const hole = visible
  const narrow = viewport.w < 640

  return (
    <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
      {/* The dimmed page with the spotlight cut out. It also blocks clicks on the page underneath. */}
      <svg className="absolute inset-0 size-full" aria-hidden onClick={(e) => e.stopPropagation()}>
        <defs>
          <mask id={`${ids}-mask`}>
            <rect width="100%" height="100%" fill="white" />
            {hole && <rect className="tour-hole" x={hole.x} y={hole.y} width={hole.w} height={hole.h} fill="black" />}
          </mask>
          <pattern id={`${ids}-hatch`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--tour-hatch)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <g mask={`url(#${ids}-mask)`}>
          <rect width="100%" height="100%" fill="var(--tour-dim)" />
          <rect width="100%" height="100%" fill={`url(#${ids}-hatch)`} />
        </g>
      </svg>

      {/* The spotlight's frame: a ruled cell lifted off the page. */}
      {hole && (
        <div
          className="tour-frame pointer-events-none absolute border-[3px] border-saffron shadow-[5px_5px_0_var(--color-ink)]"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          aria-hidden
        />
      )}

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        aria-describedby={`${ids}-text`}
        className="tour-sheet sheet-grain absolute border-2 border-ink text-ink shadow-block"
        style={{
          left: pos.x,
          top: pos.y,
          width: narrow ? viewport.w - EDGE * 2 : 'min(27rem, calc(100vw - 24px))',
          // Hidden until measured, so it never flashes in the wrong place.
          visibility: sheetSize.w ? 'visible' : 'hidden',
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-3 py-2">
          <Logo size="sm" className="h-7" />
          <button type="button" onClick={() => onClose('skipped')} className={cn(buttonClasses({ variant: 'ghost', size: 'sm' }), 'min-h-11 px-2')}>
            Skip tour
          </button>
        </div>

        {/* Migo talking: the bubble's tail points at Migo's mouth. */}
        <div key={step.id} className="flex items-start gap-1 px-3 pt-3 motion-safe:animate-step-in">
          <Mascot pose={step.pose} bob className={cn('shrink-0', narrow ? 'h-20' : 'h-32')} />
          <div className="relative mt-3 min-w-0 flex-1 pl-3">
            <svg viewBox="0 0 20 20" className="absolute top-6 -left-[5px] size-5" aria-hidden>
              <path d="M20 4 1 12l19 3z" fill="var(--color-sheet)" />
              <path d="M19 4 1 12l18 3" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <div className="rounded-[1.4rem] border-2 border-ink bg-sheet px-4 py-3" aria-live="polite">
              <h2 id={`${ids}-title`} className="text-lg leading-tight sm:text-2xl">
                {step.title}
              </h2>
              <p id={`${ids}-text`} className="mt-1 font-serif text-[0.95rem] leading-snug sm:text-lg">
                {step.text(mode)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t-2 border-ink px-3 py-3">
          <div className="min-w-0 flex-1">
            <ol className="flex gap-1" aria-hidden>
              {TOUR_STEPS.map((s, i) => (
                <li key={s.id} className={cn('h-2.5 flex-1 border-2 border-ink', i <= index ? 'bg-saffron' : 'bg-transparent')} />
              ))}
            </ol>
            <p className="mt-1 text-xs font-semibold">
              Step {index + 1} of {TOUR_STEPS.length}
              {' · '}
              {remaining === 0 ? 'last one!' : `${remaining} more to go`}
            </p>
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <button type="button" onClick={() => go(index - 1)} aria-label="Back" className={cn(buttonClasses({ variant: 'secondary', size: 'sm' }), 'min-h-11 px-3')}>
                <Icon name="arrow-left" accent="none" strokeWidth={2.2} className="size-5" />
              </button>
            )}
            <button ref={nextRef} type="button" onClick={() => go(index + 1)} className={cn(buttonClasses({ size: 'sm' }), 'min-h-11')}>
              {last ? 'Let’s go' : index === 0 ? 'Show me' : 'Next'}
              <Icon name={last ? 'check' : 'arrow-right'} accent="none" strokeWidth={2.2} className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
