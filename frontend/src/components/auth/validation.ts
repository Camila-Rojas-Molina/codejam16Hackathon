// Client-side checks for the auth forms. The server has the final say; these catch typos early.
export const PASSWORD_MIN_LENGTH = 6

export function emailError(email: string): string | null {
  const v = email.trim()
  if (!v) return 'Enter your email address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'That doesn’t look like an email address.'
  return null
}

export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.'
}
