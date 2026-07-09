'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { authClient } = await import('~/lib/auth-client')
      const { data, error: authError } = await authClient.signIn.email({ email, password })
      if (authError) {
        setError(authError.message || 'Invalid credentials')
      } else if (data) {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Auth server not configured.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-surface p-8 shadow-card">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 rounded-xl bg-accent flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-h1 text-text-primary">Sign In</h1>
            <p className="mt-1 text-body-compact text-text-secondary">
              Welcome back to Job For Sure
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-caption font-[510] text-text-secondary">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-border bg-page px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-caption font-[510] text-text-secondary">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-border bg-page px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] disabled:opacity-50 transition-all duration-150 shadow-card"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface px-2 text-text-tertiary">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  const { authClient } = await import('~/lib/auth-client')
                  await authClient.signIn.social({ provider: 'google' })
                } catch {
                  setError('Google OAuth not configured.')
                }
              }}
              className="w-full rounded-xl border border-border bg-page px-4 py-2.5 text-sm font-[510] text-text-primary hover:bg-hover active:scale-[0.97] transition-all duration-150"
            >
              Continue with Google
            </button>

            <p className="text-center text-body-compact text-text-tertiary">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-accent hover:text-accent-hover font-[510]">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
