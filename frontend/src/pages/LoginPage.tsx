// /login: email + password. Afterwards you land where you left off: onboarding if your profile
// isn't finished, otherwise the page that sent you here (or the map).
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import AuthScreen from '../components/auth/AuthScreen'
import { signedInDestination } from '../components/auth/signedInDestination'
import { emailError, errorMessage } from '../components/auth/validation'
import Icon from '../components/icons/Icon'
import Button from '../components/ui/Button'
import { ErrorText, TextField } from '../components/ui/Fields'
import { APP_NAME } from '../lib/config'
import { useStore } from '../store/useStore'

export default function LoginPage() {
  const { authEnabled, session, account, profile, signIn } = useStore()
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!authEnabled) return <Navigate to="/onboarding" replace />
  if (session && account) return <Navigate to={signedInDestination(account, profile, location.state)} replace />
  // Signed in with no profile yet. While submitting we wait: the store may set the session a
  // moment before it loads the account, and that's not the same as having no profile.
  if (session && !busy) return <Navigate to="/onboarding" replace />

  const emailErr = submitted ? emailError(email) : null
  const passwordErr = submitted && !password ? 'Enter your password.' : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    if (emailError(email) || !password) return
    setBusy(true)
    setError(null)
    try {
      const { hasProfile } = await signIn(email.trim(), password)
      // With a profile, stay busy: the guard above redirects as soon as the account is in the store.
      if (!hasProfile) navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      eyebrow="Welcome back"
      title="Log in"
      subtitle={`Pick up where you left off in ${APP_NAME}.`}
      pose="hello"
      say={<p>Good to see you again! Your teammates missed you.</p>}
      footer={{ text: 'New here?', to: '/signup', label: 'Create an account' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate aria-busy={busy || undefined}>
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={setEmail}
          error={emailErr}
          required
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={passwordErr}
          required
        />
        <div className="space-y-2 pt-2">
          <ErrorText>{error}</ErrorText>
          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
            {!busy && <Icon name="arrow-right" accent="none" strokeWidth={2.4} className="size-5" />}
          </Button>
        </div>
      </form>
    </AuthScreen>
  )
}
