// /onboarding/questions: the universal questionnaire (Get to know you → Your exploration style → review).
// First time: intros from Migo, progress autosaved as a draft so a reload doesn't lose answers.
// Editing later (?step=<id> from the profile page): jumps straight to that question, then the review.
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { MascotSays } from '../components/illustrations/Mascot'
import StepScreen, { type ProgressSegment } from '../components/layout/StepScreen'
import Icon from '../components/icons/Icon'
import Card from '../components/ui/Card'
import { VisibilityTag } from '../features/profile/components/SummaryList'
import { SECTIONS, questionsIn, type QuestionStep, type SectionId } from '../features/onboarding/questionnaire'
import UniversalSummary from '../features/profile/components/UniversalSummary'
import { hasUniversalProfile } from '../features/profile/flow'
import { emptyUniversal, isUniversalComplete, normalizeUniversal } from '../features/profile/model'
import type { UniversalProfile } from '../features/profile/types'
import { readJSON, removeKey, writeJSON } from '../lib/storage'
import { useStore } from '../store/useStore'

type Item = { kind: 'intro'; section: SectionId } | { kind: 'question'; step: QuestionStep } | { kind: 'review' }

const draftKey = (accountId: string) => `migo:draft:${accountId}`
type SavedDraft = { draft: unknown; index: number }

function buildItems(editing: boolean): Item[] {
  const qs = (section: SectionId): Item[] => questionsIn(section).map((step) => ({ kind: 'question', step }))
  if (editing) return [...qs('you'), ...qs('style'), { kind: 'review' }]
  return [{ kind: 'intro', section: 'you' }, ...qs('you'), { kind: 'intro', section: 'style' }, ...qs('style'), { kind: 'review' }]
}

export default function QuestionnairePage() {
  const { account, profile, saveUniversal } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Fixed at mount: saving flips hasUniversalProfile, but this visit stays in the mode it started in.
  const [editing] = useState(() => hasUniversalProfile(profile))
  const items = useMemo(() => buildItems(editing), [editing])
  const reviewIndex = items.length - 1

  // Initial answers and position, computed once.
  const [initial] = useState(() => {
    if (!account) return { draft: emptyUniversal(), index: 0 }
    if (editing && profile?.universal) {
      const at = items.findIndex((it) => it.kind === 'question' && it.step.id === params.get('step'))
      return { draft: structuredClone(profile.universal), index: at >= 0 ? at : reviewIndex }
    }
    const saved = readJSON<SavedDraft>(draftKey(account.id))
    const draft = normalizeUniversal(saved?.draft) ?? emptyUniversal()
    const index = typeof saved?.index === 'number' ? Math.min(Math.max(0, saved.index), reviewIndex) : 0
    return { draft, index }
  })

  const [draft, setDraft] = useState<UniversalProfile>(initial.draft)
  const [index, setIndex] = useState(initial.index)
  // Came here from a "Change" button: Continue goes straight back to the review.
  const [returnToReview, setReturnToReview] = useState(editing && initial.index !== reviewIndex)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Autosave first-time progress on this device.
  useEffect(() => {
    if (account && !editing) writeJSON(draftKey(account.id), { draft, index } satisfies SavedDraft)
  }, [account, editing, draft, index])

  if (!account) return <Navigate to="/onboarding" replace />

  const item = items[index]
  const update = (change: (d: UniversalProfile) => UniversalProfile) => {
    setError(null)
    setDraft(change)
  }
  const goTo = (i: number) => {
    setError(null)
    setIndex(Math.min(Math.max(0, i), reviewIndex))
  }
  const exit = () => navigate('/profile?tab=answers')

  function back() {
    if (returnToReview && item.kind === 'question') {
      setReturnToReview(false)
      return goTo(reviewIndex)
    }
    if (index === 0) return editing ? exit() : navigate('/onboarding')
    goTo(index - 1)
  }

  function next() {
    if (item.kind === 'question' && returnToReview) {
      setReturnToReview(false)
      return goTo(reviewIndex)
    }
    goTo(index + 1)
  }

  async function submit() {
    if (!isUniversalComplete(draft)) {
      // Shouldn't happen (Continue is gated), but never save a half profile.
      const missing = items.findIndex((it) => it.kind === 'question' && !it.step.isValid(draft))
      setError('One answer still needs you.')
      if (missing >= 0) {
        setReturnToReview(true)
        goTo(missing)
      }
      return
    }
    setBusy(true)
    try {
      await saveUniversal(draft)
      if (editing) return navigate('/profile?tab=answers', { state: { saved: 'Profile updated.' } })
      removeKey(draftKey(account!.id))
      navigate('/mode', { state: { welcome: true } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t save that. Please try again.')
      setBusy(false)
    }
  }

  // ---- Progress ---------------------------------------------------------------------------
  const sectionOf = (it: Item): SectionId | null => (it.kind === 'intro' ? it.section : it.kind === 'question' ? it.step.section : null)
  const currentSection = sectionOf(item)
  const progress: ProgressSegment[] = (['you', 'style'] as SectionId[]).map((section) => {
    const qs = questionsIn(section)
    let value: number
    if (item.kind === 'review') value = 1
    else if (item.kind === 'question' && item.step.section === section) value = (qs.indexOf(item.step) + 1) / qs.length
    else value = section === 'you' && currentSection === 'style' ? 1 : 0
    return { label: SECTIONS[section].title, value, current: section === currentSection || (item.kind === 'review' && section === 'style') }
  })

  const common = {
    stepKey: item.kind === 'question' ? item.step.id : item.kind === 'intro' ? `intro-${item.section}` : 'review',
    progress,
    onBack: back,
    backLabel: index === 0 && editing ? 'Back to profile' : 'Back',
    onExit: editing ? exit : undefined,
    exitLabel: 'Cancel',
    error,
    busy,
  }

  // ---- Screens ----------------------------------------------------------------------------
  if (item.kind === 'intro') {
    const section = SECTIONS[item.section]
    const count = questionsIn(item.section).length
    const first = item.section === 'you'
    return (
      <StepScreen
        {...common}
        eyebrow={first ? 'Part 1 of 2' : 'Part 2 of 2'}
        title={section.title}
        counter={`${count} questions`}
        onContinue={next}
        continueLabel={first ? 'Let’s go' : 'Keep going'}
        hero={
          <MascotSays pose={first ? 'hello' : 'glide'} className="mb-6">
            {first ? (
              <p>
                Hi <strong>{account.name}</strong>! I’m Migo, your exploring sidekick. {section.intro}
              </p>
            ) : (
              <p>Nice one, {account.name}! {section.intro}</p>
            )}
          </MascotSays>
        }
      >
        {first && (
          <Card tone="saffron-soft" lifted>
            <h2 className="text-2xl">One account, two ways to explore</h2>
            <p className="mt-2">
              Be a{' '}
              <strong className="inline-flex items-center gap-1 align-middle">
                <Icon name="suitcase" className="size-5" />
                Tourist
              </strong>{' '}
              when you’re visiting somewhere, and a{' '}
              <strong className="inline-flex items-center gap-1 align-middle">
                <Icon name="pin" accent="teal" className="size-5" />
                Local
              </strong>{' '}
              when
              you’re showing someone your city. Switch whenever you like. These answers work for both.
            </p>
          </Card>
        )}
        <p className="eyebrow flex items-center gap-2">
          <Icon name="clock" className="size-5" />
          {count} quick questions · {section.minutes}
        </p>
      </StepScreen>
    )
  }

  if (item.kind === 'review') {
    return (
      <StepScreen
        {...common}
        eyebrow="Last step"
        title={editing ? 'Your profile' : 'Here’s you!'}
        subtitle="Check everything looks right. Tap Change to fix anything."
        onContinue={submit}
        continueLabel={editing ? 'Save changes' : 'Save my profile'}
        hero={
          !editing && (
            <MascotSays pose="read" className="mb-6">
              <p>Looking good, {account.name}! This is what I’ll use to find your people.</p>
            </MascotSays>
          )
        }
      >
        <Card tone="teal-soft">
          <h2 className="text-2xl">Who sees what</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <VisibilityTag visibility="public" /> answers appear on your profile card for people you match with.
            </li>
            <li>
              <VisibilityTag visibility="private" /> answers only help MIGO choose places and partners. Nobody else sees them.
            </li>
          </ul>
        </Card>
        <UniversalSummary
          universal={draft}
          onEdit={(stepId) => {
            const at = items.findIndex((it) => it.kind === 'question' && it.step.id === stepId)
            if (at < 0) return
            setReturnToReview(true)
            goTo(at)
          }}
        />
      </StepScreen>
    )
  }

  const { step } = item
  const sectionQs = questionsIn(step.section)
  const valid = step.isValid(draft)
  const skipping = step.optional && step.isAnswered && !step.isAnswered(draft)
  return (
    <StepScreen
      {...common}
      title={step.title}
      subtitle={step.subtitle}
      counter={`${sectionQs.indexOf(step) + 1} of ${sectionQs.length}`}
      eyebrow={step.optional ? 'Optional' : undefined}
      onContinue={next}
      canContinue={valid}
      blockedReason={step.blockedReason}
      continueLabel={returnToReview ? 'Back to review' : skipping ? 'Skip for now' : 'Continue'}
    >
      {step.render(draft, update)}
    </StepScreen>
  )
}
