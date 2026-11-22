// SETTINGS: account, privacy, app preferences and data.
import { startTransition, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { PrivacyNote, Toggle } from '../components/ui/Fields'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/icons/Icon'
import { Mascot } from '../components/illustrations/Mascot'
import { ACCESSIBILITY_OPTIONS, labelsFor } from '../features/profile/options'
import { profileStorage } from '../lib/api'
import { useStore } from '../store/useStore'

const sectionTitle = 'mb-4 flex items-center gap-3 text-3xl'

export default function SettingsPage() {
  const { account, profile, saveUniversal, saveTrip, deleteAccount, demoMode, setDemoMode, session, signOut } = useStore()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<null | 'access' | 'account'>(null)
  const [busy, setBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState('')

  if (!account || !profile?.universal) return null
  const universal = profile.universal
  const storage = profileStorage()

  async function act(action: () => Promise<unknown>, done: string) {
    setBusy(true)
    try {
      await action()
      setMessage(done)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      // One transition for both: the router applies navigations as transitions, so the sign-out
      // must join it or this page would render signed-out first and get bounced to /login.
      let done: Promise<void> = Promise.resolve()
      startTransition(() => {
        navigate('/', { replace: true })
        done = signOut()
      })
      await done
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.')
      setSigningOut(false)
    }
  }

  const hasAccessInfo =
    universal.accessibility.needs.length > 0 ||
    universal.accessibility.notes.trim() !== '' ||
    profile.tourist.trips.some((t) => t.accessibility.needs.length > 0 || t.accessibility.notes.trim() !== '')

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <header>
        <PageHeader eyebrow="Account & app" title="Settings" aside={<Mascot pose="read" className="h-28" />} />
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
        {message && (
          <p role="status" className="mt-4 flex items-center gap-2 border-2 border-ink bg-teal-soft px-4 py-2 font-semibold">
            <Icon name="check" accent="none" strokeWidth={2.6} className="size-5" />
            {message}
          </p>
        )}
      </header>

      <section aria-labelledby="s-account">
        <h2 id="s-account" className={sectionTitle}>
          <Icon name="user" className="size-8" />
          Account
        </h2>
        <Card className="space-y-4">
          {session ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-4">
              <p className="min-w-0">
                Signed in as <strong className="break-all">{session.email}</strong>
              </p>
              <Button variant="dark" disabled={signingOut} aria-busy={signingOut || undefined} onClick={handleSignOut}>
                {signingOut ? 'Logging out…' : 'Log out'}
              </Button>
            </div>
          ) : null}
          <p>
            {session ? 'Your profile name is' : 'Signed in as'} <strong>{account.name}</strong>. One account for both modes, so
            switching never creates a second profile.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/profile?tab=style" className={buttonClasses({ variant: 'secondary' })}>
              Change name & avatar
            </Link>
            <Link to="/profile?tab=answers" className={buttonClasses({ variant: 'secondary' })}>
              Edit questionnaire answers
            </Link>
            <Link to="/trips" className={buttonClasses({ variant: 'secondary' })}>
              Manage trips
            </Link>
          </div>
          <p className="flex items-start gap-2 text-sm">
            <Icon name={storage === 'supabase' ? 'cloud' : 'info'} accent="teal" className="size-5" />
            {storage === 'supabase'
              ? 'Your profile is saved to MIGO’s servers.'
              : 'Your profile is saved on this device. Connecting the MIGO backend will sync it to your account.'}
          </p>
        </Card>
      </section>

      <section aria-labelledby="s-privacy">
        <h2 id="s-privacy" className={sectionTitle}>
          <Icon name="lock" className="size-8" />
          Privacy
        </h2>
        <Card className="space-y-5">
          <Toggle
            label="Share my access needs with matches"
            description={
              universal.accessibility.needs.length > 0
                ? `Currently: ${labelsFor(ACCESSIBILITY_OPTIONS, universal.accessibility.needs).join(', ')}. Notes are never shared.`
                : 'You haven’t added any. Nothing is shared.'
            }
            checked={universal.accessibility.shareWithMatches}
            onChange={(on) =>
              act(
                () => saveUniversal({ ...universal, accessibility: { ...universal.accessibility, shareWithMatches: on } }),
                on ? 'Your access needs will be shown to matches.' : 'Your access needs are private again.',
              )
            }
          />
          {hasAccessInfo &&
            (confirm === 'access' ? (
              <div role="alertdialog" aria-label="Remove accessibility info?" className="border-2 border-dashed border-ink bg-sheet p-3">
                <p className="font-semibold">Remove all accessibility info from your profile and trips?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        await saveUniversal({ ...universal, accessibility: { needs: [], notes: '', shareWithMatches: false } })
                        for (const t of profile.tourist.trips) {
                          if (t.accessibility.needs.length > 0 || t.accessibility.notes) await saveTrip({ ...t, accessibility: { needs: [], notes: '' } })
                        }
                      }, 'Accessibility info removed.')
                    }
                  >
                    Yes, remove
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirm(null)} autoFocus>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setConfirm('access')}>
                Remove my accessibility info
              </Button>
            ))}
          <p className="text-sm">
            <PrivacyNote kind="private">
              Budget, food and dietary needs, transport, neighbourhood, hidden gems and notes only help MIGO choose places and
              people. They’re never shown to anyone. Public answers are marked on your profile.
            </PrivacyNote>
          </p>
        </Card>
      </section>

      <section aria-labelledby="s-app">
        <h2 id="s-app" className={sectionTitle}>
          <Icon name="cog" className="size-8" />
          App
        </h2>
        <Card>
          <Toggle
            label="Demo mode"
            description="Adds a “Simulate arrival” button to hunts, for trying MIGO indoors."
            checked={demoMode}
            onChange={setDemoMode}
          />
        </Card>
      </section>

      <section aria-labelledby="s-danger" className="pb-4">
        <h2 id="s-danger" className={sectionTitle}>
          <Icon name="trash" className="size-8" />
          Delete account
        </h2>
        {confirm === 'account' ? (
          <Card role="alertdialog" aria-label="Delete your account?">
            <p className="font-semibold">
              Delete your account? Your profile, trips, local details, points, items and messages are erased for good.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await deleteAccount(() => navigate('/', { replace: true }))
                }}
              >
                Delete everything
              </Button>
              <Button variant="secondary" onClick={() => setConfirm(null)} autoFocus>
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="danger" icon="trash" onClick={() => setConfirm('account')}>
            Delete my account
          </Button>
        )}
      </section>
    </div>
  )
}
