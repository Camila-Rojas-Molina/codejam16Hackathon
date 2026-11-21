// A discoverable person: who they are, what you share, and actions (view, show interest, message).
import { useId, useState } from 'react'
import { Link } from 'react-router'
import Avatar from '../../../components/ui/Avatar'
import Badge from '../../../components/ui/Badge'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { roleLabel } from '../../onboarding/options'
import type { Compatibility, Dimension } from '../../profile/matching'
import { INTEREST_OPTIONS, labelsFor } from '../../profile/options'
import { matchLabel } from '../match'
import type { Person } from '../types'

const DIMENSION_LABELS: Record<Dimension, string> = {
  interests: 'Interests',
  languages: 'Languages',
  energy: 'Social energy',
  planning: 'Planning style',
  pace: 'Pace',
  budget: 'Budget',
  group: 'Group size',
}

type PersonCardProps = {
  person: Person
  match: Compatibility
  liked: boolean
  onToggleLike: () => void
  canMessage: boolean
  busy?: boolean
}

export default function PersonCard({ person, match, liked, onToggleLike, canMessage, busy }: PersonCardProps) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const label = matchLabel(match.total)
  const shared = labelsFor(INTEREST_OPTIONS, match.sharedInterests)
  const pct = match.total === null ? null : Math.round(match.total * 100)

  return (
    <article aria-labelledby={`${detailsId}-name`} className="rounded-[1.5rem_1.3rem_1.6rem_1.2rem] border-[3px] border-navy bg-paper p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <Avatar avatar={person.avatar} size="lg" className="bg-bubble-light" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`${detailsId}-name`} className="text-3xl leading-none">
              {person.name}
            </h3>
            <Badge tone="navy">{roleLabel(person.mode)}</Badge>
            {person.demo && <Badge tone="outline">Sample</Badge>}
          </div>
          {/* Compatibility: a label plus a meter, never colour alone */}
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={label.tone}>{label.text}</Badge>
            {pct !== null && (
              <span className="flex items-center gap-2 text-sm">
                <span className="h-3 w-20 overflow-hidden rounded-full border-2 border-navy bg-paper" aria-hidden>
                  <span className="block h-full bg-red" style={{ width: `${pct}%` }} />
                </span>
                {pct}% in common
              </span>
            )}
          </div>
          {shared.length > 0 && <p className="mt-2 text-sm">🤝 You both love {shared.join(', ')}</p>}
          {match.sharedLanguages.length > 0 && <p className="text-sm">🗣️ You both speak {match.sharedLanguages.join(', ')}</p>}
        </div>
      </div>

      {open && (
        <div id={detailsId} className="mt-4 space-y-3 border-t-[3px] border-dashed border-navy pt-4">
          {person.funFact && (
            <p>
              <span className="font-type text-xs tracking-wider uppercase">Fun fact · </span>
              {person.funFact}
            </p>
          )}
          <div>
            <p className="font-type text-xs tracking-wider uppercase">Into</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {labelsFor(INTEREST_OPTIONS, person.interests).map((i) => (
                <li key={i} className={cn('rounded-full border-2 border-navy px-2.5 py-0.5 text-sm', shared.includes(i) ? 'bg-sun text-ink' : 'bg-paper')}>
                  {shared.includes(i) && <span aria-hidden>★ </span>}
                  {i}
                  {shared.includes(i) && <span className="sr-only"> (shared)</span>}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm">
            <span className="font-type text-xs tracking-wider uppercase">Speaks · </span>
            {person.languages.join(', ') || 'Not shared'}
          </p>
          {Object.keys(match.dimensions).length > 0 && (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {(Object.entries(match.dimensions) as [Dimension, number][]).map(([dim, score]) => (
                <div key={dim} className="rounded-xl border-2 border-navy/40 px-2 py-1">
                  <dt className="font-semibold">{DIMENSION_LABELS[dim]}</dt>
                  <dd>{Math.round(score * 100)}% match</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen((o) => !o)} className={buttonClasses({ variant: 'secondary' })}>
          {open ? 'Hide profile' : 'View profile'}
        </button>
        <button
          type="button"
          aria-pressed={liked}
          disabled={busy}
          onClick={onToggleLike}
          className={buttonClasses({ variant: liked ? 'primary' : 'secondary' })}
        >
          <span aria-hidden>{liked ? '♥' : '♡'}</span> {liked ? 'Interested' : 'Show interest'}
        </button>
        {canMessage && (
          <Link to={`/chat/${encodeURIComponent(person.id)}`} className={buttonClasses({ variant: 'sun' })}>
            Message
          </Link>
        )}
      </div>
      {!canMessage && (
        <p className="mt-2 text-sm">💬 Messaging opens once you’re matched as teammates, or you both show interest.</p>
      )}
    </article>
  )
}
