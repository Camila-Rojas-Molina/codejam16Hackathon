// A local in Discover: who they are, what you share, and Connect (or "Request sent" once you've asked).
import { useId, useState } from 'react'
import Icon from '../../../components/icons/Icon'
import Avatar from '../../../components/ui/Avatar'
import Badge from '../../../components/ui/Badge'
import { buttonClasses } from '../../../components/ui/buttonStyles'
import { cn } from '../../../lib/cn'
import { modeMeta, roleLabel } from '../../onboarding/options'
import type { Compatibility, Dimension } from '../../profile/matching'
import { INTEREST_OPTIONS, labelsFor } from '../../profile/options'
import { matchLabel } from '../match'
import type { Person } from '../types'

const DIMENSION_LABELS: Record<Dimension, string> = {
  interests: 'Interests',
  languages: 'Languages',
  qualities: 'What you each value',
  energy: 'Social energy',
  planning: 'Planning style',
  pace: 'Pace',
  budget: 'Budget',
  group: 'Group size',
}

type PersonCardProps = {
  person: Person
  match: Compatibility
  /** You've asked and they haven't answered yet. */
  pending: boolean
  onConnect: () => void
  onWithdraw: () => void
  busy?: boolean
}

/** Someone's public profile: fun fact, interests (shared ones starred), languages, and optionally how you match. */
export function PersonDetails({ person, match, id }: { person: Person; match?: Compatibility; id?: string }) {
  const shared = match ? labelsFor(INTEREST_OPTIONS, match.sharedInterests) : []
  return (
    <div id={id} className="space-y-3">
      {person.funFact && (
        <p className="font-serif text-lg leading-snug">
          <span className="eyebrow mr-2 align-middle">Fun fact</span>
          {person.funFact}
        </p>
      )}
      <div>
        <p className="eyebrow">Into</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {labelsFor(INTEREST_OPTIONS, person.interests).map((i) => (
            <li key={i} className={cn('inline-flex items-center gap-1 border-2 border-ink px-2 py-0.5 text-sm font-semibold', shared.includes(i) ? 'bg-saffron' : 'bg-sheet')}>
              {shared.includes(i) && <Icon name="star" accent="sheet" className="size-4" />}
              {i}
              {shared.includes(i) && <span className="sr-only"> (shared)</span>}
            </li>
          ))}
          {person.interests.length === 0 && <li className="text-sm">Not shared yet</li>}
        </ul>
      </div>
      <p className="text-sm">
        <span className="eyebrow mr-2">Speaks</span>
        {person.languages.join(', ') || 'Not shared'}
      </p>
      {match && Object.keys(match.dimensions).length > 0 && (
        <dl className="grid grid-cols-2 border-t-2 border-l-2 border-ink text-sm">
          {(Object.entries(match.dimensions) as [Dimension, number][]).map(([dim, score]) => (
            <div key={dim} className="border-r-2 border-b-2 border-ink px-3 py-2">
              <dt className="font-bold">{DIMENSION_LABELS[dim]}</dt>
              <dd>{Math.round(score * 100)}% match</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export default function PersonCard({ person, match, pending, onConnect, onWithdraw, busy }: PersonCardProps) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const label = matchLabel(match.total)
  const shared = labelsFor(INTEREST_OPTIONS, match.sharedInterests)
  const pct = match.total === null ? null : Math.round(match.total * 100)
  const mode = modeMeta(person.mode)

  return (
    <article aria-labelledby={`${detailsId}-name`} className="sheet-grain border-2 border-ink shadow-block">
      <div className="flex items-stretch border-b-2 border-ink">
        <div className="grid w-24 shrink-0 place-items-center border-r-2 border-ink bg-saffron-soft p-2 sm:w-28">
          <Avatar avatar={person.avatar} size="lg" className="border-0 bg-transparent" />
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`${detailsId}-name`} className="text-3xl">
              {person.name}
            </h3>
            <Badge tone={person.mode === 'local' ? 'teal' : 'saffron'} icon={mode.icon}>
              {roleLabel(person.mode)}
            </Badge>
            {person.demo && <Badge tone="outline">Sample</Badge>}
          </div>
          {/* Compatibility: a label plus a meter, never colour alone */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Badge tone={label.tone}>{label.text}</Badge>
            {pct !== null && (
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="hatch h-3.5 w-24 border-2 border-ink bg-sheet" aria-hidden>
                  <span className="block h-full bg-sienna" style={{ width: `${pct}%` }} />
                </span>
                {pct}% in common
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 p-4">
        {shared.length > 0 && (
          <p className="flex items-start gap-2 text-sm">
            <Icon name="venn" className="size-5" />
            <span>You both love {shared.join(', ')}</span>
          </p>
        )}
        {match.sharedLanguages.length > 0 && (
          <p className="flex items-start gap-2 text-sm">
            <Icon name="chats" className="size-5" />
            <span>You both speak {match.sharedLanguages.join(', ')}</span>
          </p>
        )}

        {open && (
          <div className="mt-3 border-t-2 border-dashed border-ink pt-4">
            <PersonDetails id={detailsId} person={person} match={match} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t-2 border-ink p-4">
        <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen((o) => !o)} className={buttonClasses({ variant: 'secondary' })}>
          <Icon name={open ? 'minus' : 'eye'} className="size-5" />
          {open ? 'Hide profile' : 'View profile'}
        </button>
        {pending ? (
          <>
            <span role="status" className={cn(buttonClasses({ variant: 'dark' }), 'cursor-default hover:bg-ink active:translate-0')}>
              <Icon name="check" accent="none" strokeWidth={2.4} className="size-5" />
              Request sent
            </span>
            <button type="button" disabled={busy} onClick={onWithdraw} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
              Withdraw
            </button>
            <p className="flex w-full items-start gap-2 text-sm">
              <Icon name="info" accent="sheet" className="size-5" />
              We’ll let you know when {person.name} answers.
            </p>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={onConnect} className={buttonClasses()}>
            <Icon name="people2" accent="sheet" className="size-5" />
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        )}
      </div>
    </article>
  )
}
