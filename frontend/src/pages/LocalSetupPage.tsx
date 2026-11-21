// /mode/local: set up or edit Local mode (hosting visitors in your home city).
// The home city is typed by the person. We never assume it from GPS.
import { Navigate, useLocation, useNavigate } from 'react-router'
import { MascotSays } from '../components/illustrations/Mascot'
import SetupFlow, { type SetupStep } from '../components/layout/SetupFlow'
import Choices from '../components/ui/Choices'
import { TagInput, TextArea, TextField } from '../components/ui/Fields'
import LanguageFields from '../features/profile/components/LanguageFields'
import SummaryList from '../features/profile/components/SummaryList'
import { localItems, stepIdOf } from '../features/profile/contextSummary'
import { hasUniversalProfile, type SetupNavState } from '../features/profile/flow'
import { newLocal } from '../features/profile/model'
import {
  AREA_MAX_LENGTH,
  ATTRACTION_OPTIONS,
  AVAILABILITY_OPTIONS,
  CITY_MAX_LENGTH,
  DURATION_OPTIONS,
  GEMS_MAX_LENGTH,
  HOST_ACTIVITY_OPTIONS,
  MAX_AREAS,
  TRANSPORT_OPTIONS,
} from '../features/profile/options'
import type { LocalContext } from '../features/profile/types'
import { useStore } from '../store/useStore'

const STEPS: SetupStep<LocalContext>[] = [
  {
    id: 'home',
    title: 'Where’s home?',
    subtitle: 'The city you’d show a visitor around. We never guess it from your location.',
    isValid: (l) => l.homeCity.trim().length > 0,
    blockedReason: 'Add your home city.',
    render: (l, update) => (
      <>
        <TextField
          label="Home city"
          value={l.homeCity}
          onChange={(homeCity) => update((x) => ({ ...x, homeCity }))}
          maxLength={CITY_MAX_LENGTH}
          placeholder="e.g. Montréal"
          autoComplete="address-level2"
        />
        <TextField
          label="Neighbourhood"
          optional
          value={l.neighbourhood}
          onChange={(neighbourhood) => update((x) => ({ ...x, neighbourhood }))}
          maxLength={CITY_MAX_LENGTH}
          placeholder="e.g. Plateau-Mont-Royal"
          hint="🔒 Private. Only used to suggest nearby meeting spots."
        />
      </>
    ),
  },
  {
    id: 'turf',
    title: 'Show off your turf',
    subtitle: 'The corners you know best and the things you love recommending.',
    optional: true,
    isAnswered: (l) => l.knownAreas.length + l.recommendations.length > 0 || l.hiddenGems.trim() !== '',
    isValid: () => true,
    render: (l, update) => (
      <>
        <TagInput
          label="Areas I know really well"
          values={l.knownAreas}
          onChange={(knownAreas) => update((x) => ({ ...x, knownAreas }))}
          placeholder="e.g. Mile End"
          maxLength={AREA_MAX_LENGTH}
          max={MAX_AREAS}
          hint="Type one and press Enter."
        />
        <Choices
          multiple
          layout="chip"
          legend="I love recommending"
          options={ATTRACTION_OPTIONS}
          values={l.recommendations}
          onChange={(recommendations) => update((x) => ({ ...x, recommendations }))}
        />
        <TextArea
          label="A few hidden gems"
          optional
          maxLength={GEMS_MAX_LENGTH}
          placeholder="The bakery with no sign, the rooftop with the best sunset…"
          value={l.hiddenGems}
          onChange={(hiddenGems) => update((x) => ({ ...x, hiddenGems }))}
          hint="🔒 Private. MIGO uses these to plan hunts with your visitors."
        />
      </>
    ),
  },
  {
    id: 'hosting',
    title: 'What would you happily do with a visitor?',
    subtitle: 'Pick everything you’d be comfortable with.',
    isValid: (l) => l.activities.length > 0,
    blockedReason: 'Pick at least one.',
    render: (l, update) => (
      <Choices
        multiple
        legend="Activities with visitors"
        hideLegend
        layout="tile"
        columns={3}
        options={HOST_ACTIVITY_OPTIONS}
        values={l.activities}
        onChange={(activities) => update((x) => ({ ...x, activities }))}
      />
    ),
  },
  {
    id: 'languages',
    title: 'Which languages could you host in?',
    subtitle: 'Pre-filled from your profile. Keep the ones you’re comfortable showing someone around in.',
    isValid: (l) => l.languages.length > 0,
    blockedReason: 'Add at least one language.',
    render: (l, update) => (
      <>
        <LanguageFields
          legend="Comfortable hosting in"
          values={l.languages}
          onChange={(languages) => update((x) => ({ ...x, languages }))}
        />
        <Choices
          multiple
          layout="chip"
          legend="Getting around with visitors"
          options={TRANSPORT_OPTIONS}
          values={l.transport}
          onChange={(transport) => update((x) => ({ ...x, transport }))}
        />
      </>
    ),
  },
  {
    id: 'time',
    title: 'When are you usually free?',
    subtitle: 'Just a general idea. You’ll always confirm before a hunt.',
    isValid: (l) => l.availability.length > 0 && l.duration !== null,
    blockedReason: 'Pick when you’re free and how long you like to go for.',
    render: (l, update) => (
      <>
        <Choices
          multiple
          layout="tile"
          columns={2}
          legend="Usually free"
          options={AVAILABILITY_OPTIONS}
          values={l.availability}
          onChange={(availability) => update((x) => ({ ...x, availability }))}
        />
        <Choices
          layout="tile"
          columns={2}
          legend="A typical outing lasts"
          options={DURATION_OPTIONS}
          value={l.duration}
          onChange={(duration) => update((x) => ({ ...x, duration }))}
        />
      </>
    ),
  },
]

export default function LocalSetupPage() {
  const { account, profile, saveLocal } = useStore()
  const navigate = useNavigate()
  const nav = useLocation().state as SetupNavState

  if (!account) return <Navigate to="/onboarding" replace />
  if (!profile || !hasUniversalProfile(profile) || !profile.universal) return <Navigate to="/onboarding/questions" replace />

  const existing = profile.local
  const activate = nav?.activate ?? !existing
  const returnTo = nav?.returnTo ?? (activate ? '/hunts' : '/profile')

  return (
    <SetupFlow<LocalContext>
      label={existing ? 'Local profile' : 'Local setup'}
      steps={STEPS}
      initial={existing ? structuredClone(existing) : newLocal(profile.universal)}
      startAtReview={!!existing}
      intro={
        <MascotSays fill="var(--color-bubble)" className="mb-6">
          <p>A local! 📍 Visitors are going to love you. A few quick things about your city and how you like to host.</p>
        </MascotSays>
      }
      reviewTitle={existing ? 'Your local profile' : 'Ready to host!'}
      reviewSubtitle="Change this any time. Your general profile stays the same."
      renderReview={(local, edit) => (
        <SummaryList title={local.homeCity || 'Your city'} items={localItems(local)} onEdit={(id) => edit(stepIdOf(id))} />
      )}
      saveLabel={existing ? 'Save local profile' : activate ? 'Start hosting' : 'Save'}
      onSave={async (local) => {
        await saveLocal(local, { activate })
        navigate(returnTo, { replace: true })
      }}
      onCancel={() => navigate(nav?.returnTo ?? (existing ? '/profile' : '/mode'))}
    />
  )
}
