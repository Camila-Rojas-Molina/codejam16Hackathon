// /mode/tourist (new trip) and /mode/tourist/:tripId (edit a trip).
// Trip details live on the trip. Defaults come from the universal profile, and editing a trip never
// changes the universal profile.
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { MascotSays } from '../components/illustrations/Mascot'
import SetupFlow, { type SetupStep } from '../components/layout/SetupFlow'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Choices from '../components/ui/Choices'
import { Stepper, TextArea, TextField } from '../components/ui/Fields'
import BudgetFields from '../features/profile/components/BudgetFields'
import SummaryList from '../features/profile/components/SummaryList'
import { stepIdOf, tripItems } from '../features/profile/contextSummary'
import { hasUniversalProfile, type SetupNavState } from '../features/profile/flow'
import { newTrip, rangeError, tripDatesError } from '../features/profile/model'
import {
  ACCESSIBILITY_OPTIONS,
  ATTRACTION_OPTIONS,
  BUDGET_OPTIONS,
  CITY_MAX_LENGTH,
  COMPANION_OPTIONS,
  INTEREST_OPTIONS,
  MAX_COMPANIONS,
  NOTE_MAX_LENGTH,
  labelFor,
  labelsFor,
  type Option,
} from '../features/profile/options'
import type { TouristTrip, UniversalProfile } from '../features/profile/types'
import { useStore } from '../store/useStore'

const DATE_MODES: Option<TouristTrip['dates']['kind']>[] = [
  { value: 'dates', emoji: '📅', label: 'I know my dates' },
  { value: 'approx', emoji: '🤔', label: 'Not sure yet' },
]

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x))

function UseMyUsual({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null
  return (
    <Button variant="secondary" onClick={onClick} className="min-h-11 text-sm">
      ↺ Use my usual
    </Button>
  )
}

function tripSteps(u: UniversalProfile): SetupStep<TouristTrip>[] {
  return [
    {
      id: 'where',
      title: 'Where are you off to?',
      isValid: (t) => t.destination.trim().length > 0 && tripDatesError(t) === null,
      blockedReason: 'Add a destination and when you’re going.',
      render: (t, update) => {
        const setDates = (patch: Partial<TouristTrip['dates']>) => update((x) => ({ ...x, dates: { ...x.dates, ...patch } }))
        const err = tripDatesError(t)
        return (
          <>
            <TextField
              label="Destination city"
              value={t.destination}
              onChange={(destination) => update((x) => ({ ...x, destination }))}
              maxLength={CITY_MAX_LENGTH}
              placeholder="e.g. Montréal"
              autoComplete="off"
            />
            <Choices
              legend="When"
              layout="chip"
              options={DATE_MODES}
              value={t.dates.kind}
              onChange={(kind) => setDates({ kind })}
            />
            {t.dates.kind === 'dates' ? (
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Arriving"
                  type="date"
                  value={t.dates.start}
                  onChange={(start) => setDates({ start })}
                  error={t.dates.start && err ? err : null}
                />
                <TextField
                  label="Leaving"
                  optional
                  type="date"
                  min={t.dates.start || undefined}
                  value={t.dates.end}
                  onChange={(end) => setDates({ end })}
                />
              </div>
            ) : (
              <TextField
                label="Roughly when?"
                value={t.dates.approx}
                onChange={(approx) => setDates({ approx })}
                maxLength={CITY_MAX_LENGTH}
                placeholder="e.g. A long weekend in July"
              />
            )}
          </>
        )
      },
    },
    {
      id: 'who',
      title: 'Who’s coming along?',
      isValid: (t) => t.companions !== null,
      blockedReason: 'Pick who you’re travelling with.',
      render: (t, update) => (
        <>
          <Choices
            legend="Travelling"
            hideLegend
            layout="tile"
            columns={2}
            options={COMPANION_OPTIONS}
            value={t.companions}
            onChange={(companions) =>
              update((x) => ({
                ...x,
                companions,
                companionCount: companions === 'solo' ? 0 : Math.max(1, x.companionCount),
              }))
            }
          />
          {t.companions && t.companions !== 'solo' && (
            <Stepper
              label="How many people besides you?"
              value={t.companionCount}
              min={1}
              max={MAX_COMPANIONS}
              unit={(n) => (n === 1 ? 'person' : 'people')}
              onChange={(companionCount) => update((x) => ({ ...x, companionCount }))}
            />
          )}
          <p className="text-sm">🔒 Private. Helps us suggest group-friendly plans.</p>
        </>
      ),
    },
    {
      id: 'budget',
      title: 'What’s the budget for this trip?',
      subtitle: `Pre-filled from your usual (${labelFor(BUDGET_OPTIONS, u.exploration.budget.level)}). Changing it here won’t touch your profile.`,
      isValid: (t) => t.budget.level !== null && rangeError(t.budget.range) === null,
      blockedReason: 'Pick a budget (and check the range).',
      render: (t, update) => (
        <>
          <BudgetFields
            legend="Trip budget"
            hideLegend
            value={t.budget}
            defaultCurrency={u.exploration.budget.range?.currency}
            onChange={(budget) => update((x) => ({ ...x, budget }))}
          />
          <UseMyUsual
            show={
              t.budget.level !== u.exploration.budget.level ||
              JSON.stringify(t.budget.range) !== JSON.stringify(u.exploration.budget.range)
            }
            onClick={() => update((x) => ({ ...x, budget: structuredClone(u.exploration.budget) }))}
          />
        </>
      ),
    },
    {
      id: 'interests',
      title: 'What are you into on this trip?',
      subtitle: 'We started with your usual interests. Add or remove anything for this destination.',
      isValid: (t) => t.interests.length > 0,
      blockedReason: 'Pick at least one.',
      render: (t, update) => (
        <>
          <Choices
            multiple
            legend="Interests for this trip"
            hideLegend
            layout="tile"
            columns={3}
            options={INTEREST_OPTIONS}
            values={t.interests}
            onChange={(interests) => update((x) => ({ ...x, interests }))}
          />
          <UseMyUsual show={!sameSet(t.interests, u.interests)} onClick={() => update((x) => ({ ...x, interests: [...u.interests] }))} />
        </>
      ),
    },
    {
      id: 'activities',
      title: 'What do you want to see and do?',
      subtitle: 'Pre-filled from your must-see list.',
      isValid: (t) => t.activities.length > 0,
      blockedReason: 'Pick at least one.',
      render: (t, update) => (
        <>
          <Choices
            multiple
            legend="Experiences for this trip"
            hideLegend
            layout="tile"
            columns={3}
            options={ATTRACTION_OPTIONS}
            values={t.activities}
            onChange={(activities) => update((x) => ({ ...x, activities }))}
          />
          <UseMyUsual
            show={!sameSet(t.activities, u.exploration.attractions)}
            onClick={() => update((x) => ({ ...x, activities: [...u.exploration.attractions] }))}
          />
        </>
      ),
    },
    {
      id: 'access',
      title: 'Anything extra for this trip?',
      subtitle: 'Optional and private. You never need to say why.',
      optional: true,
      isAnswered: (t) => t.accessibility.needs.length > 0 || t.accessibility.notes.trim() !== '',
      isValid: () => true,
      render: (t, update) => {
        const usual = labelsFor(ACCESSIBILITY_OPTIONS, u.accessibility.needs)
        const setA = (patch: Partial<TouristTrip['accessibility']>) =>
          update((x) => ({ ...x, accessibility: { ...x.accessibility, ...patch } }))
        return (
          <>
            {usual.length > 0 && (
              <Card tone="bubble-light">
                <p>
                  <strong>Already in your profile:</strong> {usual.join(', ')}. Those still apply.
                </p>
              </Card>
            )}
            <Choices
              multiple
              legend="Also helpful on this trip"
              options={ACCESSIBILITY_OPTIONS.filter((o) => !u.accessibility.needs.includes(o.value))}
              values={t.accessibility.needs}
              onChange={(needs) => setA({ needs })}
            />
            <TextArea
              label="Anything else for this trip?"
              optional
              maxLength={NOTE_MAX_LENGTH}
              placeholder="e.g. Travelling with a stroller."
              value={t.accessibility.notes}
              onChange={(notes) => setA({ notes })}
            />
          </>
        )
      },
    },
  ]
}

export default function TouristSetupPage() {
  const { account, profile, saveTrip } = useStore()
  const navigate = useNavigate()
  const { tripId } = useParams()
  const nav = useLocation().state as SetupNavState

  if (!account) return <Navigate to="/onboarding" replace />
  if (!profile || !hasUniversalProfile(profile) || !profile.universal) return <Navigate to="/onboarding/questions" replace />

  const universal = profile.universal
  const existing = tripId ? profile.tourist.trips.find((t) => t.id === tripId) : undefined
  if (tripId && !existing) return <Navigate to="/trips" replace />

  // New trips started from a mode switch become the active trip and turn Tourist mode on.
  const activate = nav?.activate ?? !existing
  const returnTo = nav?.returnTo ?? (activate ? '/map' : '/trips')
  const cancelTo = nav?.returnTo ?? (existing ? '/trips' : '/mode')

  return (
    <SetupFlow<TouristTrip>
      key={tripId ?? 'new'}
      label={existing ? 'Edit trip' : 'New trip'}
      steps={tripSteps(universal)}
      initial={existing ? structuredClone(existing) : newTrip(universal)}
      startAtReview={!!existing}
      intro={
        <MascotSays fill="var(--color-sun)" className="mb-6">
          <p>
            Ooh, a trip! 🧳 Tell me where you’re headed. I’ve pre-filled the rest from your profile, so it only takes a
            minute.
          </p>
        </MascotSays>
      }
      reviewTitle={existing ? 'Your trip' : 'Trip ready!'}
      reviewSubtitle="Your general profile stays exactly as it is."
      renderReview={(trip, edit) => (
        <SummaryList title={trip.destination || 'Your trip'} items={tripItems(trip)} onEdit={(id) => edit(stepIdOf(id))} />
      )}
      saveLabel={existing ? 'Save trip' : activate ? 'Start exploring' : 'Save trip'}
      onSave={async (trip) => {
        await saveTrip(trip, { activate })
        navigate(returnTo, { replace: true })
      }}
      onCancel={() => navigate(cancelTo)}
    />
  )
}
