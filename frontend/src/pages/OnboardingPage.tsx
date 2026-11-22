// /onboarding: create your MIGO account (name + avatar). No role here: everyone can be a tourist
// and a local, so the mode is picked later and can change any time.
// Also used to edit your name/avatar (returning users land back where they came from).
import { useId, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { MascotSays } from '../components/illustrations/Mascot'
import Screen from '../components/layout/Screen'
import Icon from '../components/icons/Icon'
import Button from '../components/ui/Button'
import { ErrorText, fieldLabel, inputBase } from '../components/ui/Fields'
import { AVATARS, NAME_MAX_LENGTH } from '../features/onboarding/options'
import { nextOnboardingStep } from '../features/profile/flow'
import { avatarFor, DEFAULT_AVATAR, resolveAvatar } from '../lib/avatars'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

const labelClass = fieldLabel

export default function OnboardingPage() {
  const { account, profile, createAccount, updateAccount } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const fromProfile = (location.state as { from?: string } | null)?.from === 'profile'
  const nameId = useId()

  const [name, setName] = useState(account?.name ?? '')
  // New accounts start on the default avatar; old emoji avatars resolve to an image one.
  const [avatar, setAvatar] = useState<string | null>(account ? resolveAvatar(account.avatar) : DEFAULT_AVATAR)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const ready = trimmed.length > 0 && avatar !== null
  const missing = [!trimmed && 'add your name', !avatar && 'choose an avatar'].filter(Boolean)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      if (account) {
        await updateAccount({ name: trimmed, avatar })
        navigate(fromProfile ? '/profile' : (nextOnboardingStep(account, profile) ?? '/map'))
      } else {
        await createAccount({ name: trimmed, avatar })
        navigate('/onboarding/questions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Screen className="md:max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-7">
        {fromProfile && (
          <Button variant="ghost" icon="arrow-left" className="self-start px-0" onClick={() => navigate('/profile')}>
            Back to profile
          </Button>
        )}
        <header>
          <p className="eyebrow mb-2">{account ? 'Profile' : 'Step 1 of 3 · Your account'}</p>
          <h1 className="text-4xl sm:text-5xl">{account ? 'Your name & avatar' : 'Who are you?'}</h1>
          <p className="mt-2">
            {account
              ? 'This is how teammates see you.'
              : 'One account for everything. Tourist at the weekend, local on Monday.'}
          </p>
        </header>

        {!account && (
          <MascotSays pose="cheer">
            <p>Hey there! I’m Migo, your exploring sidekick. What should I call you?</p>
          </MascotSays>
        )}

        <div>
          <label htmlFor={nameId} className={labelClass}>
            My name is
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="given-name"
            placeholder="First name"
            className={cn(inputBase, 'min-h-14 px-4 text-lg')}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Pick an avatar</legend>
          <div className="grid grid-cols-4 border-t-2 border-l-2 border-ink">
            {AVATARS.map((id) => {
              const selected = avatar === id
              const { src, alt } = avatarFor(id)
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAvatar(id)}
                  className={cn(
                    'relative grid aspect-square min-h-14 place-items-center border-r-2 border-b-2 border-ink transition-colors',
                    selected ? 'bg-saffron' : 'sheet-grain hover:bg-saffron-soft',
                  )}
                >
                  {/* The image's alt text names the button ("Star avatar"). */}
                  <img src={src} alt={alt} className="aspect-square w-[82%] object-contain" />
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center bg-ink text-saffron" aria-hidden>
                      <Icon name="check" accent="none" strokeWidth={3.2} className="size-4" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-auto space-y-2 pt-2">
          <ErrorText>{error}</ErrorText>
          <Button type="submit" size="lg" fullWidth disabled={!ready || busy}>
            {busy ? 'Saving…' : account ? 'Save' : 'Create my profile'}
            {!busy && <Icon name="arrow-right" accent="none" strokeWidth={2.4} className="size-5" />}
          </Button>
          <p className="min-h-6 text-center text-sm font-semibold" aria-live="polite">
            {!ready && `To continue, ${missing.join(' and ')}.`}
          </p>
        </div>
      </form>
    </Screen>
  )
}
