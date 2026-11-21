import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Screen from '../components/layout/Screen'
import Button from '../components/ui/Button'
import { AVATARS, NAME_MAX_LENGTH, ROLE_OPTIONS } from '../features/onboarding/options'
import { cn } from '../lib/cn'
import type { Role } from '../lib/types'
import { useStore } from '../store/useStore'

const labelClass = 'mb-2 block font-type text-sm tracking-wider uppercase'

export default function OnboardingPage() {
  const { user, setUser } = useStore()
  const navigate = useNavigate()
  const nameId = useId()

  const [role, setRole] = useState<Role | null>(user?.role ?? null)
  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null)

  const trimmed = name.trim()
  const ready = role !== null && trimmed.length > 0 && avatar !== null

  const missing = [!role && 'pick a role', !trimmed && 'add your name', !avatar && 'choose an avatar'].filter(Boolean)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    setUser({ id: `me-${Date.now().toString(36)}`, name: trimmed, avatar, role })
    navigate('/match')
  }

  return (
    <Screen>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-7">
        <header>
          <h1 className="text-4xl text-navy">Who are you?</h1>
          <p className="mt-1">Every team is one tourist and one local.</p>
        </header>

        <fieldset>
          <legend className={labelClass}>I'm a…</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((opt, i) => {
              const selected = role === opt.role
              return (
                <button
                  key={opt.role}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRole(opt.role)}
                  className={cn(
                    'flex min-h-44 flex-col items-center justify-center gap-2 rounded-[1.6rem_1.4rem_1.7rem_1.3rem] border-[3px] border-navy p-4 text-center transition-transform duration-100 active:scale-95',
                    i === 0 ? '-rotate-1' : 'rotate-1',
                    selected ? 'bg-sun text-ink motion-safe:animate-pop' : 'bg-paper text-navy',
                  )}
                >
                  <span className="text-5xl" aria-hidden>
                    {opt.emoji}
                  </span>
                  <span className="font-display text-2xl uppercase">{opt.title}</span>
                  <span className="text-sm leading-snug">{opt.blurb}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

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
            className="min-h-14 w-full rounded-full border-[3px] border-navy bg-paper px-5 text-lg text-navy placeholder:text-navy/60"
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Pick an avatar</legend>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((emoji) => {
              const selected = avatar === emoji
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Avatar ${emoji}`}
                  onClick={() => setAvatar(emoji)}
                  className={cn(
                    'grid aspect-square min-h-14 place-items-center rounded-full border-[3px] text-3xl transition-transform duration-100 active:scale-90',
                    selected ? 'scale-110 border-navy bg-sun' : 'border-navy/0 bg-paper',
                  )}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-auto space-y-2 pt-2">
          <Button type="submit" size="lg" fullWidth disabled={!ready}>
            Find my partner
          </Button>
          <p className="min-h-6 text-center text-sm" aria-live="polite">
            {!ready && `To continue, ${missing.join(', ')}.`}
          </p>
        </div>
      </form>
    </Screen>
  )
}
