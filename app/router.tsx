import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ThemeProvider } from '~/components/layout/theme-provider'
import { Navbar } from '~/components/layout/navbar'
import { Sidebar } from '~/components/layout/sidebar'
import { StatsBar } from '~/components/dashboard/stats-bar'
import { ApplicationsTable } from '~/components/dashboard/applications-table'
import { ResumeUpload } from '~/components/resume/resume-upload'
import { ChatInterview } from '~/components/resume/chat-interview'
import { Plus, FileText, MessageSquare } from 'lucide-react'

// Root layout
const rootRoute = createRootRoute({
  component: () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-page text-text-primary">
          <Navbar onMenuToggle={() => setSidebarCollapsed(prev => !prev)} />
          <div className="flex">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </ThemeProvider>
    )
  },
})

import { Outlet, Link } from '@tanstack/react-router'

// Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 text-text-primary">Applications</h1>
        <Link
          to="/resume/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 shadow-card"
        >
          <Plus className="h-4 w-4" />
          New Resume
        </Link>
      </div>
      <StatsBar />
      <div className="mt-6">
        <ApplicationsTable />
      </div>
    </div>
  ),
})

const resumeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/resume',
  component: () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 text-text-primary">My Resumes</h1>
        <Link
          to="/resume/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 shadow-card"
        >
          <Plus className="h-4 w-4" />
          New Resume
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-card">
        <div className="mx-auto h-12 w-12 rounded-xl bg-page flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-text-tertiary" />
        </div>
        <p className="text-body text-text-secondary">No resumes yet. Create your first one.</p>
      </div>
    </div>
  ),
})

const resumeNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/resume/new',
  component: NewResumePage,
})

function NewResumePage() {
  const [mode, setMode] = useState<'upload' | 'chat' | null>(null)

  if (!mode) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <h1 className="text-h1 text-text-primary text-center">Create Your Resume</h1>
        <p className="mt-2 text-body text-text-secondary text-center">Do you have an existing resume?</p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => setMode('upload')} className="rounded-xl border border-border bg-surface p-5 text-left hover:border-accent hover:shadow-card transition-all duration-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-page flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-body font-[510] text-text-primary">Yes, upload my resume</p>
                <p className="text-body-compact text-text-secondary mt-0.5">Upload PDF, DOCX, or TXT. AI extracts the data.</p>
              </div>
            </div>
          </button>
          <button onClick={() => setMode('chat')} className="rounded-xl border border-border bg-surface p-5 text-left hover:border-accent hover:shadow-card transition-all duration-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-page flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-body font-[510] text-text-primary">No, build from scratch</p>
                <p className="text-body-compact text-text-secondary mt-0.5">Chat with AI. Answer questions about your experience.</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      {mode === 'upload' ? <ResumeUpload /> : <ChatInterview />}
    </div>
  )
}

const jobsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/jobs',
  component: () => (
    <div>
      <h1 className="text-h1 text-text-primary mb-6">Jobs</h1>
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-card">
        <p className="text-body text-text-secondary">Job search coming soon. Paste a job URL to get started.</p>
      </div>
    </div>
  ),
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => (
    <div>
      <h1 className="text-h1 text-text-primary mb-6">Settings</h1>
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <p className="text-body text-text-secondary">Settings coming soon.</p>
      </div>
    </div>
  ),
})

function LandingPage() {
  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-var(--header-height))]">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-20 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-caption text-text-secondary mb-8 shadow-card">
          ✨ AI-powered resume builder
        </div>
        <h1 className="text-display-xl text-text-primary font-[650] tracking-[-1.4px] leading-[1.0]">
          Your resume, tailored to{' '}
          <span className="text-accent">every job</span>
        </h1>
        <p className="mt-4 text-body-lg text-text-secondary max-w-xl mx-auto">
          Upload your resume once. Paste any job link. Get an optimized version in 30 seconds. No more rewriting for every application.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center rounded-xl bg-accent px-5 py-2.5 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 shadow-card"
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-[510] text-text-primary hover:bg-hover active:scale-[0.97] transition-all duration-150 shadow-card"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="w-full max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Upload or Chat', desc: 'Upload your existing resume or build one by chatting with AI. It takes 2 minutes.' },
            { step: '02', title: 'Paste a Job Link', desc: 'Any job from Indeed, JobDB, LinkedIn. AI scrapes the requirements automatically.' },
            { step: '03', title: 'Get Tailored Resume', desc: 'AI rewrites your resume to match. Preview, tweak, download PDF. All in one place.' },
          ].map((f) => (
            <div key={f.step} className="rounded-xl border border-border bg-surface p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
              <span className="text-caption font-[600] text-accent">{f.step}</span>
              <h3 className="mt-3 text-h3 text-text-primary">{f.title}</h3>
              <p className="mt-2 text-body-compact text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoginPage() {
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
    <div className="flex items-center justify-center min-h-[calc(100vh-var(--header-height))] px-6">
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
              Don't have an account?{' '}
              <Link to="/register" className="text-accent hover:text-accent-hover font-[510]">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { authClient } = await import('~/lib/auth-client')
      const { data, error: authError } = await authClient.signUp.email({ name, email, password })
      if (authError) {
        setError(authError.message || 'Registration failed')
      } else if (data) {
        window.location.href = '/resume/new'
      }
    } catch {
      setError('Auth server not configured.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-var(--header-height))] px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-surface p-8 shadow-card">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 rounded-xl bg-accent flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-h1 text-text-primary">Create Account</h1>
            <p className="mt-1 text-body-compact text-text-secondary">
              Start tailoring resumes in 30 seconds
            </p>
          </div>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-caption font-[510] text-text-secondary">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full rounded-lg border border-border bg-page px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150"
              />
            </div>

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
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full rounded-lg border border-border bg-page px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] disabled:opacity-50 transition-all duration-150 shadow-card"
            >
              {loading ? 'Creating account...' : 'Create Account'}
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
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:text-accent-hover font-[510]">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

// Router
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  resumeRoute,
  resumeNewRoute,
  jobsRoute,
  settingsRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
