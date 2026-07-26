'use client'

import { useState } from 'react'
import { Link } from '~/i18n/routing'
import { Mail } from 'lucide-react'
import { authClient } from '~/lib/auth-client'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (authError) {
        setError(authError.message || 'Failed to send reset email')
      } else {
        setSent(true)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to send reset email. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center neuro-surface px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex cursor-pointer items-center gap-2 no-underline">
            <div className="h-4 w-4 rounded-[3px] bg-brand" />
            <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
          </Link>
        </div>

        <div className="rounded-lg neuro-card p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail size="24" className="text-primary" />
              </div>
                <h1 className="text-2xl text-foreground font-display">
                  Check your email
                </h1>
              <p className="mt-2 text-xs text-muted-foreground">
                We sent a password reset link to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                Click the link to set a new password.
              </p>
              <p className="mt-4 text-xs text-muted-foreground/60">
                Didn&apos;t get an email? Check your spam folder.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block cursor-pointer text-xs font-medium text-primary hover:opacity-80"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl text-foreground font-display">
                  Forgot password?
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="forgot-email" className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Email
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-md px-3 py-2 text-sm"
                    neumorphic
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md text-sm font-medium active:scale-[0.98]"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                Remember your password?{' '}
                <Link href="/login" className="cursor-pointer font-medium text-primary hover:opacity-80">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
