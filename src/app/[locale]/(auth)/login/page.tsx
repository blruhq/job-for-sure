'use client'

import { useState, Suspense, useEffect } from 'react'
import { Link, useRouter } from '~/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { authClient } from '~/lib/auth-client'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'
  const redirectTo = searchParams.get('redirect') || '/chat'

  // Auto-redirect if already signed in (e.g. after Google OAuth callback)
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user) {
        router.push(redirectTo)
      }
    })
  }, [router, redirectTo])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await authClient.signIn.email({ email, password })
      if (authError) {
        setError(authError.message || 'Invalid credentials')
      } else if (data) {
        try {
          const posthog = (await import('posthog-js')).default
          const plan = (data.user as { plan?: string }).plan ?? 'free'
          posthog.identify(data.user.id, { email, plan })
          posthog.capture('user_signed_in', { method: 'email' })
        } catch {
          // PostHog not loaded — skip
        }
        router.push(redirectTo)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to sign in. Check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: redirectTo,
      })
    } catch {
      setError('Google OAuth not configured.')
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
          <div className="text-center">
            <h1 className="text-2xl text-foreground font-display">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-3.5">
            {resetSuccess && (
              <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                Password reset successfully. Sign in with your new password.
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-md px-3 py-2 text-sm"
                neumorphic
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="mb-1 cursor-pointer text-[10px] font-medium text-primary hover:opacity-80"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="neuro-surface px-2 text-[10px] text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            className="w-full rounded-md border-border text-sm font-medium active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </span>
          </Button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="cursor-pointer font-medium text-primary hover:opacity-80">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground/40">
          Your data is synced across devices.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center neuro-surface">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
