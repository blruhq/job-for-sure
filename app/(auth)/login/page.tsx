'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // ── DEV BYPASS: admin / 123 ──
    if (email === 'admin' && password === '123') {
      localStorage.setItem('jfs_auth', JSON.stringify({
        user: { name: 'Admin', email: 'admin@jobforsure.app' },
        ts: Date.now(),
      }))
      router.push('/chat')
      return
    }

    // ── Better Auth: email/password ──
    try {
      const { authClient } = await import('~/lib/auth-client')
      const { data, error: authError } = await authClient.signIn.email({ email, password })
      if (authError) {
        setError(authError.message || 'Invalid credentials')
      } else if (data) {
        router.push('/chat')
      }
    } catch {
      setError('Auth not configured. Use admin / 123 to demo.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      const { authClient } = await import('~/lib/auth-client')
      await authClient.signIn.social({ provider: 'google' })
    } catch {
      setError('Google OAuth not configured. Use admin / 123 to demo.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex cursor-pointer items-center gap-2 no-underline">
            <div className="h-4 w-4 rounded-[3px] bg-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="text-center">
            <h1
              className="text-2xl text-foreground"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-3.5">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-[10px] text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full cursor-pointer rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
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
          </button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="cursor-pointer font-medium text-primary hover:opacity-80">
              Sign up
            </Link>
          </p>
        </div>

        {/* Dev hint */}
        <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground/40">
          Demo? Use <span className="text-muted-foreground/70">admin</span> / <span className="text-muted-foreground/70">123</span>
        </p>
      </div>
    </div>
  )
}
