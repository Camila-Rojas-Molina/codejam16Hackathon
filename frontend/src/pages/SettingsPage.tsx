// SETTINGS: account, privacy, app preferences and data.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Button from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { Toggle } from '../components/ui/Fields'
import { ACCESSIBILITY_OPTIONS, labelsFor } from '../features/profile/options'
import { profileStorage } from '../lib/api'
import { useStore } from '../store/useStore'

const sectionTitle = 'mb-3 text-3xl text-navy'

export default function SettingsPage() {
  const { account, profile, saveUniversal, saveTrip, deleteAccount, demoMode, setDemoMode } = useStore()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<null | 'access' | 'account'>(null)
  const [busy, setBusy] = useState(false)
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

  const hasAccessInfo =
    universal.accessibility.needs.length > 0 ||
    universal.accessibility.notes.trim() !== '' ||
    profile.tourist.trips.some((t) => t.accessibility.needs.length > 0 || t.accessibility.notes.trim() !== '')

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <header>
        <h1 className="text-4xl text-navy sm:text-5xl">Settings</h1>
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
        {message && (
          <p role="status" className="mt-3 rounded-2xl border-[3px] border-navy bg-sun px-4 py-2 text-ink">
            {message}
          </p>
        )}
      </header>

      <section aria-labelledby="s-account">
        <h2 id="s-account" className={sectionTitle}>
          Account
        </h2>
        <Card className="space-y-4">
          <p>
            Signed in as <strong>{account.name}</strong>. One account for both modes, so switching never creates a second
            profile.
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
          <p className="text-sm">
            {storage === 'supabase'
              ? '☁️ Your profile is saved to MIGO’s servers.'
              : '📱 Your profile is saved on this device. Connecting the MIGO backend will sync it to your account.'}
          </p>
        </Card>
      </section>

      <section aria-labelledby="s-privacy">
        <h2 id="s-privacy" className={sectionTitle}>
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
              <div role="alertdialog" aria-label="Remove accessibility info?" className="rounded-2xl border-[3px] border-dashed border-navy p-3">
                <p className="font-semibold">Remove all accessibility info from your profile and trips?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
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
            🔒 Private answers (budget, food and dietary needs, transport, neighbourhood, hidden gems, notes) only help MIGO
            choose places and people. They’re never shown to anyone. 👀 Public ones are marked on your profile.
          </p>
        </Card>
      </section>

      <section aria-labelledby="s-app">
        <h2 id="s-app" className={sectionTitle}>
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
          Delete account
        </h2>
        {confirm === 'account' ? (
          <Card role="alertdialog" aria-label="Delete your account?">
            <p className="font-semibold">
              Delete your account? Your profile, trips, local details, points, items and messages are erased for good.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await deleteAccount()
                  navigate('/', { replace: true })
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
          <Button variant="secondary" onClick={() => setConfirm('account')}>
            Delete my account
          </Button>
        )}
      </section>
    </div>
  )
}
