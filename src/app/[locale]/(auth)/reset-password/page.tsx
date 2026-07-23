'use client'

import { useState, Suspense } from 'react'
import { Link, useRouter } from '~/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { authClient } from '~/lib/auth-client'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const hasError = searchParams.get('error') === 'invalid_token'

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Token invalid or expired — show error state
  if (hasError || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center neuro-surface px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <Link href="/" className="inline-flex cursor-pointer items-center gap-2 no-underline">
              <div className="h-4 w-4 rounded-[3px] bg-primary" />
              <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
            </Link>
          </div>
            <div className="rounded-lg neuro-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destructive">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground">Invalid or expired link</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              This password reset link is no longer valid. Request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block cursor-pointer text-xs font-medium text-primary hover:opacity-80"
            >
              Request new link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: password,
        token,
      })

      if (authError) {
        setError(authError.message || 'Failed to reset password')
      } else {
        router.push('/login?reset=success')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to reset password. Try again.')
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
            <div className="h-4 w-4 rounded-[3px] bg-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
          </Link>
        </div>

        <div className="rounded-lg neuro-card p-8">
          <div className="text-center">
            <h1
              className="text-2xl text-foreground"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Set new password
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                New Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full rounded-md px-3 py-2 text-sm"
                neumorphic
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
                className="w-full rounded-md px-3 py-2 text-sm"
                neumorphic
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-md text-sm font-medium active:scale-[0.98]"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link href="/login" className="cursor-pointer font-medium text-primary hover:opacity-80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center neuro-surface">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
