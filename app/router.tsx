import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { ThemeProvider } from '~/components/layout/theme-provider'
import { Navbar } from '~/components/layout/navbar'
import { Sidebar } from '~/components/layout/sidebar'
import { StatsBar } from '~/components/dashboard/stats-bar'
import { ApplicationsTable } from '~/components/dashboard/applications-table'
import { ResumeUpload } from '~/components/resume/resume-upload'
import { ChatInterview } from '~/components/resume/chat-interview'
import { FileText, Upload, Briefcase, Settings, LayoutDashboard, Plus } from 'lucide-react'

// Root layout
const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider>
      <div className="min-h-screen bg-page text-text-primary">
        <RootNavbar />
        <div className="flex">
          <RootSidebar />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  ),
})

import { Outlet, Link } from '@tanstack/react-router'

function RootNavbar() {
  const { theme, toggle } = (() => {
    const ctx = (window as any).__themeContext
    return ctx || { theme: 'dark', toggle: () => {} }
  })()

  return (
    <header className="flex h-[52px] items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-accent" />
        <span className="text-sm font-[510] text-text-primary">AutoResume</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 rounded-full bg-accent-muted flex items-center justify-center">
          <span className="text-xs font-[510] text-accent">U</span>
        </div>
      </div>
    </header>
  )
}

function RootSidebar() {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' as const },
    { label: 'Resumes', icon: FileText, to: '/resume' as const },
    { label: 'Jobs', icon: Briefcase, to: '/jobs' as const },
    { label: 'Settings', icon: Settings, to: '/settings' as const },
  ]

  return (
    <aside className="w-[240px] shrink-0 border-r border-border">
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: 'bg-accent-muted text-accent' }}
            className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-text-secondary transition-colors duration-150"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

// Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-52px)]">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h1 className="text-h2 text-text-primary text-center">Sign In</h1>
        <p className="mt-1 text-body-compact text-text-secondary text-center">TODO: Better Auth UI here</p>
      </div>
    </div>
  ),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-52px)]">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h1 className="text-h2 text-text-primary text-center">Create Account</h1>
        <p className="mt-1 text-body-compact text-text-secondary text-center">TODO: Better Auth UI here + onboarding wizard</p>
      </div>
    </div>
  ),
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
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-[510] text-white hover:bg-accent-hover active:scale-97 transition-all duration-150"
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
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-[510] text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          New Resume
        </Link>
      </div>
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
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

import { useState } from 'react'
function NewResumePage() {
  const [mode, setMode] = useState<'upload' | 'chat' | null>(null)

  if (!mode) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <h1 className="text-h1 text-text-primary text-center">Create Your Resume</h1>
        <p className="mt-2 text-body text-text-secondary text-center">Do you have an existing resume?</p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => setMode('upload')} className="rounded-lg border border-border bg-surface p-5 text-left hover:border-border-hover">
            <p className="text-body font-[510] text-text-primary">Yes, upload my resume</p>
            <p className="text-body-compact text-text-secondary mt-1">Upload PDF, DOCX, or TXT. AI extracts the data.</p>
          </button>
          <button onClick={() => setMode('chat')} className="rounded-lg border border-border bg-surface p-5 text-left hover:border-border-hover">
            <p className="text-body font-[510] text-text-primary">No, build from scratch</p>
            <p className="text-body-compact text-text-secondary mt-1">Chat with AI. Answer questions about your experience.</p>
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
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-body text-text-secondary">Job scraping coming soon. Paste a job URL to get started.</p>
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
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-body text-text-secondary">Settings coming soon.</p>
      </div>
    </div>
  ),
})

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-52px)] px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-display-xl text-text-primary font-[510] tracking-[-1.4px] leading-[1.0]">
          Your resume, tailored to{' '}
          <span className="text-accent">every job</span>
        </h1>
        <p className="mt-4 text-body-lg text-text-secondary max-w-lg mx-auto">
          Paste a job link. Get an optimized resume in 30 seconds.
          Powered by AI. No more rewriting for every application.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-[510] text-white hover:bg-accent-hover transition-all duration-150"
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-[510] text-text-primary hover:bg-hover transition-all duration-150"
          >
            Sign In
          </Link>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-3 gap-4 max-w-3xl w-full">
        {[
          { title: 'Upload or Chat', desc: 'Upload your existing resume or build one by chatting with AI.' },
          { title: 'Paste a Job Link', desc: 'Any job from Indeed, JobDB, LinkedIn. AI scrapes the requirements.' },
          { title: 'Get Tailored Resume', desc: 'AI rewrites your resume to match. Preview, tweak, download PDF.' },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-h3 text-text-primary">{f.title}</h3>
            <p className="mt-2 text-body-compact text-text-secondary">{f.desc}</p>
          </div>
        ))}
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
