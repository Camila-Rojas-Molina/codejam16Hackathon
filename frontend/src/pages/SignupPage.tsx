// /signup: email + password to create a login. Then either "check your email" (when the backend
// asks for confirmation) or straight on to /onboarding for your name and avatar.
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import AuthScreen from '../components/auth/AuthScreen'
import { signedInDestination } from '../components/auth/signedInDestination'
import { emailError, errorMessage, PASSWORD_MIN_LENGTH } from '../components/auth/validation'
import Icon from '../components/icons/Icon'
import Button, { ArrowCell } from '../components/ui/Button'
import { arrowLabel, arrowRowClasses } from '../components/ui/buttonStyles'
import Card from '../components/ui/Card'
import { ErrorText, TextField } from '../components/ui/Fields'
import { APP_NAME } from '../lib/config'
import { cn } from '../lib/cn'
import { useStore } from '../store/useStore'

export default function SignupPage() {
  const { authEnabled, session, account, profile, signUp } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (!authEnabled) return <Navigate to="/onboarding" replace />
  // Already signed in (and not mid-submit, where we navigate ourselves).
  if (session && !busy) return <Navigate to={account ? signedInDestination(account, profile, location.state) : '/onboarding'} replace />

  if (sentTo) {
    return (
      <AuthScreen
        eyebrow="Almost there"
        title="Check your email"
        pose="read"
        say={<p>I sent you a letter! Well, an email. Same thing.</p>}
      >
        <Card tone="teal-soft" role="status" className="space-y-3">
          <p className="flex items-start gap-2">
            <Icon name="check" accent="none" strokeWidth={2.6} className="mt-0.5 size-5 shrink-0" />
            <span>
              We sent a confirmation link to <strong className="break-all">{sentTo}</strong>.
            </span>
          </p>
          <p>Click the link in that email to confirm your account, then come back and log in.</p>
          <p className="text-sm">Can’t find it? Check your spam folder.</p>
        </Card>
        <Link to="/login" className={cn(arrowRowClasses, 'min-h-14 w-full text-base')}>
          <span className={arrowLabel}>Log in</span>
          <ArrowCell />
        </Link>
      </AuthScreen>
    )
  }

  const emailErr = submitted ? emailError(email) : null
  const passwordErr = submitted && password.length < PASSWORD_MIN_LENGTH ? `Use at least ${PASSWORD_MIN_LENGTH} characters.` : null
  const confirmErr = submitted && !passwordErr && confirm !== password ? 'The passwords don’t match.' : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    if (emailError(email) || password.length < PASSWORD_MIN_LENGTH || confirm !== password) return
    setBusy(true)
    setError(null)
    try {
      const { needsConfirmation } = await signUp(email.trim(), password)
      if (needsConfirmation) {
        setSentTo(email.trim())
        setBusy(false)
      } else {
        navigate('/onboarding', { replace: true })
      }
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      eyebrow="New account"
      title="Sign up"
      subtitle={`One ${APP_NAME} account for both modes: tourist at the weekend, local on Monday.`}
      pose="cheer"
      say={<p>Hey there! I’m Migo. Let’s get you set up, it only takes a minute.</p>}
      footer={{ text: 'Already have an account?', to: '/login', label: 'Log in' }}
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
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={setPassword}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          error={passwordErr}
          required
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={confirmErr}
          required
        />
        <div className="space-y-2 pt-2">
          <ErrorText>{error}</ErrorText>
          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
            {!busy && <Icon name="arrow-right" accent="none" strokeWidth={2.4} className="size-5" />}
          </Button>
        </div>
      </form>
    </AuthScreen>
  )
}
