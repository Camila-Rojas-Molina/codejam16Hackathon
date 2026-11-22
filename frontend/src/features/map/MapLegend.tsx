// The key under the map: what each pin state means. Wraps onto two lines on narrow phones.
import { cn } from '../../lib/cn'
import { PIN_STATE_LABEL, type PinState } from './landmarkMeta'
import { LandmarkPin } from './Pins'

const STATES: PinState[] = ['new', 'visited', 'recommended', 'both']

export default function MapLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 px-3 py-2 text-xs font-semibold', className)}>
      <span className="eyebrow hidden sm:inline" aria-hidden>
        Key
      </span>
      <ul aria-label="Map key" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {STATES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <LandmarkPin state={s} category="other" size="sm" className="mr-0.5" />
            {PIN_STATE_LABEL[s]}
          </li>
        ))}
      </ul>
    </div>
  )
}
