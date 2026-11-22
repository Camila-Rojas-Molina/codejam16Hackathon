// Shown while a map engine's code downloads (it's split out of the main bundle).
import { Mascot } from '../../components/illustrations/Mascot'
import { cn } from '../../lib/cn'

export default function MapLoading({ className }: { className?: string }) {
  return (
    <section aria-label="Map" aria-busy className={cn('relative flex min-h-[22rem] flex-1 overflow-hidden border-2 border-ink bg-teal-soft shadow-block', className)}>
      <div className="hatch-soft absolute inset-0 grid place-items-center p-6">
        <div className="sheet-grain flex max-w-sm flex-col items-center gap-3 border-2 border-ink p-5 text-center shadow-block-sm" role="status">
          <Mascot pose="search" className="h-24 sm:h-28" />
          <p className="eyebrow">Loading the map</p>
          <p className="font-serif text-lg leading-snug">Migo’s unfolding the streets of Montréal…</p>
        </div>
      </div>
    </section>
  )
}
