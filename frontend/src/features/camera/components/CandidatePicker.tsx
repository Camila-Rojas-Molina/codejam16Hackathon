// The MIGO places a photo can belong to when geofences overlap: name + distance, one to pick.
// A native radio group, so it works with screen readers and the keyboard as is.
import { useId } from 'react'
import Icon from '../../../components/icons/Icon'
import { cn } from '../../../lib/cn'
import type { CandidateLandmark } from '../../explore/types'
import { formatDistance } from '../config'

type CandidatePickerProps = {
  legend: string
  candidates: CandidateLandmark[]
  selectedId: string | null
  onSelect: (id: string) => void
  disabled?: boolean
}

export default function CandidatePicker({ legend, candidates, selectedId, onSelect, disabled }: CandidatePickerProps) {
  const name = useId()
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="eyebrow mb-2">{legend}</legend>
      <ul className="grid gap-2">
        {candidates.map((c) => {
          const checked = c.id === selectedId
          return (
            <li key={c.id}>
              <label
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 border-2 border-ink px-3 py-2 transition-colors',
                  checked ? 'bg-saffron-soft' : 'hover:bg-saffron-soft/60',
                )}
              >
                <input type="radio" name={name} value={c.id} checked={checked} onChange={() => onSelect(c.id)} className="size-5 shrink-0 accent-ink" />
                <Icon name="pin" accent={checked ? 'sienna' : 'saffron'} className="size-5" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold break-words">{c.name}</span>
                  <span className="block text-xs">
                    {formatDistance(c.distanceM)} away{c.match === 'polygon' ? ' · inside the area' : ''}
                    {c.visited ? ' · visited before' : ''}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
