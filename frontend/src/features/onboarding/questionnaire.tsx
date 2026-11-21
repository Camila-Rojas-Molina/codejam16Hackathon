// The universal onboarding questionnaire: two sections, one question (or a small group) per screen.
// Nothing here assumes the person is a tourist or a local; both modes use these answers.
import type { ReactNode } from 'react'
import Choices from '../../components/ui/Choices'
import { TagInput, TextArea, TextField, Toggle } from '../../components/ui/Fields'
import BudgetFields from '../profile/components/BudgetFields'
import LanguageFields from '../profile/components/LanguageFields'
import { citiesFromNames, rangeError } from '../profile/model'
import {
  ACCESSIBILITY_OPTIONS,
  ADVENTURE_OPTIONS,
  ATTRACTION_OPTIONS,
  BUDGET_OPTIONS,
  CITY_MAX_LENGTH,
  DECISION_OPTIONS,
  DIETARY_OPTIONS,
  ENERGY_OPTIONS,
  FOOD_STYLE_OPTIONS,
  GROUP_OPTIONS,
  INTEREST_OPTIONS,
  MAX_CITIES,
  MAX_QUALITIES,
  NEW_PEOPLE_OPTIONS,
  NOTE_MAX_LENGTH,
  PACE_OPTIONS,
  PLANNING_OPTIONS,
  QUALITY_OPTIONS,
  TOPIC_OPTIONS,
  TRANSPORT_OPTIONS,
  labelFor,
  labelsFor,
  optionFor,
  type Option,
} from '../profile/options'
import type { UniversalProfile } from '../profile/types'

export type SectionId = 'you' | 'style'

export const SECTIONS: Record<SectionId, { title: string; intro: string; minutes: string }> = {
  you: {
    title: 'Get to know you',
    intro: 'Let’s figure out what kind of people you’d love exploring with. No wrong answers, promise.',
    minutes: 'about 2 minutes',
  },
  style: {
    title: 'Your exploration style',
    intro: 'Now, how do you like to explore? Think of your own city and somewhere new. Both count.',
    minutes: 'about 2 minutes',
  },
}

type Update = (change: (draft: UniversalProfile) => UniversalProfile) => void

export type QuestionStep = {
  id: string
  section: SectionId
  title: string
  subtitle?: ReactNode
  /** Optional steps are always valid; Continue reads "Skip for now" until they're answered. */
  optional?: boolean
  isAnswered?: (d: UniversalProfile) => boolean
  isValid: (d: UniversalProfile) => boolean
  blockedReason?: string
  render: (d: UniversalProfile, update: Update) => ReactNode
}

// Small immutable setters, so each step reads as "what changes".
const personality = (update: Update, patch: Partial<UniversalProfile['personality']>) =>
  update((d) => ({ ...d, personality: { ...d.personality, ...patch } }))
const companion = (update: Update, patch: Partial<UniversalProfile['companion']>) =>
  update((d) => ({ ...d, companion: { ...d.companion, ...patch } }))
const exploration = (update: Update, patch: Partial<UniversalProfile['exploration']>) =>
  update((d) => ({ ...d, exploration: { ...d.exploration, ...patch } }))

export const QUESTIONS: QuestionStep[] = [
  // ---- Get to know you ----------------------------------------------------------------------
  {
    id: 'home',
    section: 'you',
    title: 'Where do you call home?',
    subtitle: 'The city you live in, so visitors can meet you as a local. We never guess it from your location.',
    isValid: (d) => d.homeCity.trim().length > 0,
    blockedReason: 'Add your home city.',
    render: (d, update) => (
      <TextField
        label="Home city"
        value={d.homeCity}
        onChange={(homeCity) => update((x) => ({ ...x, homeCity }))}
        maxLength={CITY_MAX_LENGTH}
        placeholder="e.g. Montréal"
        autoComplete="address-level2"
        hint="👀 Shown on your profile (city only). You can change it any time."
      />
    ),
  },
  {
    id: 'energy',
    section: 'you',
    title: 'What’s your vibe when meeting someone new?',
    isValid: (d) => d.personality.energy !== null,
    blockedReason: 'Pick the one that feels most like you.',
    render: (d, update) => (
      <Choices
        legend="Your social energy"
        hideLegend
        options={ENERGY_OPTIONS}
        value={d.personality.energy}
        onChange={(energy) => personality(update, { energy })}
      />
    ),
  },
  {
    id: 'new-people',
    section: 'you',
    title: 'Exploring with someone you’ve never met. How does that sound?',
    subtitle: 'MIGO pairs you with new people, so we’ll match the pace to your comfort.',
    isValid: (d) => d.personality.newPeople !== null,
    blockedReason: 'Pick one to continue.',
    render: (d, update) => (
      <Choices
        legend="Meeting new people"
        hideLegend
        options={NEW_PEOPLE_OPTIONS}
        value={d.personality.newPeople}
        onChange={(newPeople) => personality(update, { newPeople })}
      />
    ),
  },
  {
    id: 'planning',
    section: 'you',
    title: 'Are you the type to plan every stop, or see where the day takes you?',
    isValid: (d) => d.personality.planning !== null,
    blockedReason: 'Pick one to continue.',
    render: (d, update) => (
      <Choices
        legend="Planning style"
        hideLegend
        options={PLANNING_OPTIONS}
        value={d.personality.planning}
        onChange={(planning) => personality(update, { planning })}
      />
    ),
  },
  {
    id: 'decisions',
    section: 'you',
    title: 'Time to pick the next stop. What do you do?',
    isValid: (d) => d.personality.decisions !== null,
    blockedReason: 'Pick one to continue.',
    render: (d, update) => (
      <Choices
        legend="Making decisions"
        hideLegend
        options={DECISION_OPTIONS}
        value={d.personality.decisions}
        onChange={(decisions) => personality(update, { decisions })}
      />
    ),
  },
  {
    id: 'interests',
    section: 'you',
    title: 'What lights you up?',
    subtitle: 'Pick as many as you like.',
    isValid: (d) => d.interests.length > 0,
    blockedReason: 'Pick at least one interest.',
    render: (d, update) => (
      <Choices
        multiple
        legend="Your interests"
        hideLegend
        layout="tile"
        columns={3}
        options={INTEREST_OPTIONS}
        values={d.interests}
        onChange={(interests) => update((x) => ({ ...x, interests }))}
      />
    ),
  },
  {
    id: 'qualities',
    section: 'you',
    title: 'What makes someone a great exploring buddy?',
    subtitle: `Your top ${MAX_QUALITIES}.`,
    optional: true,
    isValid: () => true,
    isAnswered: (d) => d.companion.qualities.length > 0,
    render: (d, update) => (
      <Choices
        multiple
        legend="Qualities you value in a companion"
        hideLegend
        layout="chip"
        max={MAX_QUALITIES}
        options={QUALITY_OPTIONS}
        values={d.companion.qualities}
        onChange={(qualities) => companion(update, { qualities })}
      />
    ),
  },
  {
    id: 'adventure',
    section: 'you',
    title: 'Paint us your ideal shared adventure',
    optional: true,
    isValid: () => true,
    isAnswered: (d) => d.companion.idealAdventure !== null || d.companion.idealAdventureNote.trim() !== '',
    render: (d, update) => (
      <>
        <Choices
          legend="Ideal shared adventure"
          hideLegend
          layout="tile"
          columns={2}
          options={ADVENTURE_OPTIONS}
          value={d.companion.idealAdventure}
          onChange={(idealAdventure) => companion(update, { idealAdventure })}
        />
        <TextArea
          label="In your own words"
          optional
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Bagels at dawn, then a bike ride along the canal…"
          value={d.companion.idealAdventureNote}
          onChange={(idealAdventureNote) => companion(update, { idealAdventureNote })}
          hint="Shown on your profile, so matches get a feel for you."
        />
      </>
    ),
  },
  {
    id: 'topics',
    section: 'you',
    title: 'What could you chat about for hours?',
    subtitle: 'Great conversation starters for your matches.',
    optional: true,
    isValid: () => true,
    isAnswered: (d) => d.companion.topics.length > 0,
    render: (d, update) => (
      <Choices
        multiple
        legend="Topics you enjoy"
        hideLegend
        layout="chip"
        options={TOPIC_OPTIONS}
        values={d.companion.topics}
        onChange={(topics) => companion(update, { topics })}
      />
    ),
  },

  // ---- Your exploration style ---------------------------------------------------------------
  {
    id: 'budget',
    section: 'style',
    title: 'What does a good day out usually cost you?',
    subtitle: 'Your usual. You can change it for any trip.',
    isValid: (d) => d.exploration.budget.level !== null && rangeError(d.exploration.budget.range) === null,
    blockedReason: 'Pick a budget that feels right (and check the range).',
    render: (d, update) => (
      <BudgetFields
        legend="Usual budget"
        hideLegend
        value={d.exploration.budget}
        onChange={(budget) => exploration(update, { budget })}
      />
    ),
  },
  {
    id: 'pace',
    section: 'style',
    title: 'How do you like to explore a place?',
    isValid: (d) => d.exploration.pace !== null,
    blockedReason: 'Pick a pace to continue.',
    render: (d, update) => (
      <Choices
        legend="Exploration pace"
        hideLegend
        options={PACE_OPTIONS}
        value={d.exploration.pace}
        onChange={(pace) => exploration(update, { pace })}
      />
    ),
  },
  {
    id: 'attractions',
    section: 'style',
    title: 'Which spots make your must-see list?',
    subtitle: 'Pick as many as you like.',
    isValid: (d) => d.exploration.attractions.length > 0,
    blockedReason: 'Pick at least one kind of spot.',
    render: (d, update) => (
      <Choices
        multiple
        legend="Places you like to visit"
        hideLegend
        layout="tile"
        columns={3}
        options={ATTRACTION_OPTIONS}
        values={d.exploration.attractions}
        onChange={(attractions) => exploration(update, { attractions })}
      />
    ),
  },
  {
    id: 'food',
    section: 'style',
    title: 'Let’s talk food',
    subtitle: 'So nobody drags you somewhere you can’t eat.',
    optional: true,
    isValid: () => true,
    isAnswered: (d) => {
      const f = d.exploration.food
      return f.styles.length + f.dietary.length > 0 || f.notes.trim() !== ''
    },
    render: (d, update) => {
      const food = d.exploration.food
      const setFood = (patch: Partial<typeof food>) => exploration(update, { food: { ...food, ...patch } })
      return (
        <>
          <Choices
            multiple
            legend="I love…"
            layout="chip"
            options={FOOD_STYLE_OPTIONS}
            values={food.styles}
            onChange={(styles) => setFood({ styles })}
          />
          <Choices
            multiple
            legend="Dietary needs"
            hint="Private. Only used to suggest places."
            layout="chip"
            options={DIETARY_OPTIONS}
            values={food.dietary}
            onChange={(dietary) => setFood({ dietary })}
          />
          <TextArea
            label="Anything else?"
            optional
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Allergies, foods you avoid, cuisines you love…"
            value={food.notes}
            onChange={(notes) => setFood({ notes })}
          />
        </>
      )
    },
  },
  {
    id: 'transport',
    section: 'style',
    title: 'How do you like to get around?',
    subtitle: 'Pick all that work for you.',
    isValid: (d) => d.exploration.transport.length > 0,
    blockedReason: 'Pick at least one way to get around.',
    render: (d, update) => (
      <Choices
        multiple
        legend="Getting around"
        hideLegend
        layout="tile"
        columns={3}
        options={TRANSPORT_OPTIONS}
        values={d.exploration.transport}
        onChange={(transport) => exploration(update, { transport })}
      />
    ),
  },
  {
    id: 'group',
    section: 'style',
    title: 'Who’s on your dream adventure team?',
    isValid: (d) => d.exploration.groupSize !== null,
    blockedReason: 'Pick one to continue.',
    render: (d, update) => (
      <Choices
        legend="Group size"
        hideLegend
        options={GROUP_OPTIONS}
        value={d.exploration.groupSize}
        onChange={(groupSize) => exploration(update, { groupSize })}
      />
    ),
  },
  {
    id: 'languages',
    section: 'style',
    title: 'Which languages do you speak?',
    subtitle: 'Any level counts. Even “I can order a coffee”.',
    isValid: (d) => d.languages.spoken.length > 0,
    blockedReason: 'Add at least one language.',
    render: (d, update) => {
      const spokenOptions: Option<string>[] = d.languages.spoken.map((l) => ({ value: l, label: l }))
      return (
        <>
          <LanguageFields
            legend="Languages I speak"
            values={d.languages.spoken}
            onChange={(spoken) =>
              update((x) => ({
                ...x,
                // Preferred languages must be ones you speak.
                languages: { spoken, preferred: x.languages.preferred.filter((l) => spoken.includes(l)) },
              }))
            }
          />
          {d.languages.spoken.length > 1 && (
            <Choices
              multiple
              layout="chip"
              legend="Rather use when meeting someone new"
              hint="Optional. Leave empty if any of them is fine."
              options={spokenOptions}
              values={d.languages.preferred}
              onChange={(preferred) => update((x) => ({ ...x, languages: { ...x.languages, preferred } }))}
            />
          )}
        </>
      )
    },
  },
  {
    id: 'cities',
    section: 'style',
    title: 'Where have you explored?',
    subtitle: 'Add cities you’ve discovered. They become stamps on your profile, and great conversation starters.',
    optional: true,
    isValid: () => true,
    isAnswered: (d) => d.citiesDiscovered.length > 0,
    render: (d, update) => (
      <TagInput
        label="Cities I’ve discovered"
        values={d.citiesDiscovered.map((c) => c.name)}
        onChange={(names) => update((x) => ({ ...x, citiesDiscovered: citiesFromNames(x.citiesDiscovered, names) }))}
        placeholder="e.g. Lisbon"
        maxLength={CITY_MAX_LENGTH}
        max={MAX_CITIES}
        hint="Type a city and press Enter. Add more from your profile later."
      />
    ),
  },
  {
    id: 'accessibility',
    section: 'style',
    title: 'Anything that makes a day out easier for you?',
    subtitle: (
      <>
        Totally optional, and you never need to tell us why. <strong>Private by default.</strong> We only use it
        to suggest places and partners that work for you.
      </>
    ),
    optional: true,
    isValid: () => true,
    isAnswered: (d) => d.accessibility.needs.length > 0 || d.accessibility.notes.trim() !== '',
    render: (d, update) => {
      const a = d.accessibility
      const setA = (patch: Partial<typeof a>) => update((x) => ({ ...x, accessibility: { ...x.accessibility, ...patch } }))
      return (
        <>
          <Choices
            multiple
            legend="Helpful for me"
            hideLegend
            options={ACCESSIBILITY_OPTIONS}
            values={a.needs}
            onChange={(needs) => setA({ needs })}
          />
          <TextArea
            label="Anything else?"
            optional
            maxLength={NOTE_MAX_LENGTH}
            placeholder="e.g. I can walk about 20 minutes before I need a break."
            value={a.notes}
            onChange={(notes) => setA({ notes })}
            hint="Private. Never shown on your profile."
          />
          <div className="rounded-[1.3rem_1.1rem_1.4rem_1rem] border-[3px] border-navy bg-paper p-4">
            <Toggle
              label="Share these needs with my matches"
              description="Off: only MIGO sees them, to pick suitable places. On: your teammate sees the list above (never your notes)."
              checked={a.shareWithMatches}
              onChange={(shareWithMatches) => setA({ shareWithMatches })}
            />
          </div>
        </>
      )
    },
  },
]

export const questionsIn = (section: SectionId) => QUESTIONS.filter((q) => q.section === section)

// ---- Summary ----------------------------------------------------------------------------------

export type SummaryRow = {
  stepId: string
  section: SectionId
  label: string
  value: string
  /** Private rows are used for matching and suggestions, but never shown to other people. */
  visibility: 'public' | 'private'
}

const list = (items: string[], empty = 'Not answered') => (items.length > 0 ? items.join(', ') : empty)
const withEmoji = <T extends string>(options: Option<T>[], value: T | null) => {
  const o = optionFor(options, value)
  return o ? `${o.emoji ?? ''} ${o.label}`.trim() : 'Not answered'
}

export function formatRange(range: UniversalProfile['exploration']['budget']['range']) {
  if (!range || (range.min === null && range.max === null)) return ''
  if (range.min !== null && range.max !== null) return `${range.min}–${range.max} ${range.currency}`
  if (range.min !== null) return `from ${range.min} ${range.currency}`
  return `up to ${range.max} ${range.currency}`
}

export function summaryRows(u: UniversalProfile): SummaryRow[] {
  const budget = labelFor(BUDGET_OPTIONS, u.exploration.budget.level) || 'Not answered'
  const range = formatRange(u.exploration.budget.range)
  const food = [...labelsFor(FOOD_STYLE_OPTIONS, u.exploration.food.styles), ...labelsFor(DIETARY_OPTIONS, u.exploration.food.dietary)]
  if (u.exploration.food.notes.trim()) food.push(`“${u.exploration.food.notes.trim()}”`)
  const access = labelsFor(ACCESSIBILITY_OPTIONS, u.accessibility.needs)
  if (u.accessibility.notes.trim()) access.push('plus a private note')
  const adventure = [
    u.companion.idealAdventure ? withEmoji(ADVENTURE_OPTIONS, u.companion.idealAdventure) : '',
    u.companion.idealAdventureNote.trim() ? `“${u.companion.idealAdventureNote.trim()}”` : '',
  ].filter(Boolean)
  const langs = u.languages.preferred.length > 0 ? `${list(u.languages.spoken)} (prefers ${list(u.languages.preferred)})` : list(u.languages.spoken)

  return [
    { stepId: 'home', section: 'you', label: 'Home city', value: u.homeCity.trim() || 'Not answered yet', visibility: 'public' },
    { stepId: 'energy', section: 'you', label: 'Vibe', value: withEmoji(ENERGY_OPTIONS, u.personality.energy), visibility: 'public' },
    { stepId: 'new-people', section: 'you', label: 'Meeting new people', value: withEmoji(NEW_PEOPLE_OPTIONS, u.personality.newPeople), visibility: 'private' },
    { stepId: 'planning', section: 'you', label: 'Planning', value: withEmoji(PLANNING_OPTIONS, u.personality.planning), visibility: 'public' },
    { stepId: 'decisions', section: 'you', label: 'Deciding', value: withEmoji(DECISION_OPTIONS, u.personality.decisions), visibility: 'public' },
    { stepId: 'interests', section: 'you', label: 'Interests', value: list(labelsFor(INTEREST_OPTIONS, u.interests)), visibility: 'public' },
    { stepId: 'qualities', section: 'you', label: 'Great buddies are', value: list(labelsFor(QUALITY_OPTIONS, u.companion.qualities), 'Skipped'), visibility: 'private' },
    { stepId: 'adventure', section: 'you', label: 'Ideal adventure', value: list(adventure, 'Skipped'), visibility: 'public' },
    { stepId: 'topics', section: 'you', label: 'Could chat for hours about', value: list(labelsFor(TOPIC_OPTIONS, u.companion.topics), 'Skipped'), visibility: 'public' },
    { stepId: 'budget', section: 'style', label: 'Usual budget', value: range ? `${budget}, ${range}` : budget, visibility: 'private' },
    { stepId: 'pace', section: 'style', label: 'Pace', value: withEmoji(PACE_OPTIONS, u.exploration.pace), visibility: 'public' },
    { stepId: 'attractions', section: 'style', label: 'Must-see spots', value: list(labelsFor(ATTRACTION_OPTIONS, u.exploration.attractions)), visibility: 'public' },
    { stepId: 'food', section: 'style', label: 'Food', value: list(food, 'Skipped'), visibility: 'private' },
    { stepId: 'transport', section: 'style', label: 'Getting around', value: list(labelsFor(TRANSPORT_OPTIONS, u.exploration.transport)), visibility: 'private' },
    { stepId: 'group', section: 'style', label: 'Group size', value: withEmoji(GROUP_OPTIONS, u.exploration.groupSize), visibility: 'public' },
    { stepId: 'languages', section: 'style', label: 'Languages', value: langs, visibility: 'public' },
    { stepId: 'cities', section: 'style', label: 'Cities discovered', value: list(u.citiesDiscovered.map((c) => c.name), 'None yet'), visibility: 'public' },
    {
      stepId: 'accessibility',
      section: 'style',
      label: 'Access needs',
      value: list(access, 'None shared'),
      visibility: u.accessibility.shareWithMatches && u.accessibility.needs.length > 0 ? 'public' : 'private',
    },
  ]
}
