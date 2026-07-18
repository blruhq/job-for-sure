'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter } from '~/i18n/routing'
import { FileText, Brain, KanbanSquare, CheckSquare, MessageSquare, Plus, ArrowRight, Mail } from 'lucide-react'
import { useResumes } from '~/hooks/use-resumes'
import { useApplications } from '~/hooks/use-apps'
import { useCoverLetters } from '~/hooks/use-cover-letters'
import { Skeleton } from '~/components/ui/skeleton'
import { EMPTY_APPLICATIONS } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { authClient } from '~/lib/auth-client'
import { useTranslations } from 'next-intl'

export function DashboardView() {
  const router = useRouter()
  const t = useTranslations('dashboard')
  const { data: resumes = [], isLoading: resumesLoading } = useResumes()
  const { data: applicationsData } = useApplications()
  const { data: coverLetters = [] } = useCoverLetters()
  const applications = applicationsData ?? EMPTY_APPLICATIONS
  const [userName, setUserName] = useState('')
  const [lastInterviewScore, setLastInterviewScore] = useState<number | null>(null)

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data } = await authClient.getSession()
        if (data?.user?.name) {
          setUserName(data.user.name.split(' ')[0])
        }
      } catch (err) {
        console.error('Failed to get session user name:', err)
      }
    }

    function loadInterviewScore() {
      try {
        const scoreVal = localStorage.getItem('last_interview_score')
        if (scoreVal) {
          const parsed = parseFloat(scoreVal)
          if (!isNaN(parsed)) {
            setLastInterviewScore(parsed)
          }
        }
      } catch (err) {
        console.error('Failed to get last interview score:', err)
      }
    }

    loadUserData()
    loadInterviewScore()
  }, [])

  const resumeCount = resumes.length
  const avgScore = resumeCount > 0
    ? Math.round(resumes.reduce((sum, r) => sum + r.score, 0) / resumeCount)
    : 0

  const applicationCounts = {
    bookmark: applications.bookmark.length,
    applied: applications.applied.length,
    interviewing: applications.interviewing.length,
    offers: applications.offers.length,
  }

  const applicationTotal = applicationCounts.bookmark + applicationCounts.applied + applicationCounts.interviewing + applicationCounts.offers
  const coverLetterCount = coverLetters.length
  const topResumes = [...resumes].sort((a, b) => b.score - a.score).slice(0, 3)

  // Loading State
  if (resumesLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="mx-auto max-w-[900px] space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-24 rounded-sm" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-24 rounded-sm" />
            <Skeleton className="h-24 rounded-sm" />
            <Skeleton className="h-24 rounded-sm" />
            <Skeleton className="h-24 rounded-sm" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-sm" />
            <Skeleton className="h-48 rounded-sm" />
          </div>
        </div>
      </div>
    )
  }

  // Empty State
  if (resumeCount === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-background">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft text-primary">
          <FileText size={24} />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">{t('noResumesTitle')}</h3>
        <p className="mb-6 max-w-sm text-xs text-muted-foreground">
          {t('noResumesDesc')}
        </p>
        <button
          onClick={() => router.push('/chat')}
          className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          {t('getStarted')} <ArrowRight size={13} />
        </button>
      </div>
    )
  }

  // Main Dashboard State
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="mx-auto max-w-[900px]">
        {/* Section A: Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {userName ? `${t('welcomeBack')}, ${userName}` : t('title')}
            </h1>
            <div className="text-xs text-muted-foreground">{t('jobSearchGlance')}</div>
          </div>
          <button
            onClick={() => router.push('/chat')}
            className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            <Plus size={13} /> {t('newResume')}
          </button>
        </div>

        {/* Section B: Stat Cards (4-column grid) */}
        <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Resumes */}
          <Link
            href={`/resume/${topResumes[0].id}`}
            className="rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary flex flex-col justify-between h-24"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{t('resumes')}</span>
              <FileText size={15} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{resumeCount}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {resumeCount === 1 ? t('resume') : t('resumes')} · {t('avg')} {avgScore}%
              </div>
            </div>
          </Link>

          {/* Card 2: Applications */}
          <Link
            href="/applications"
            className="rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary flex flex-col justify-between h-24"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{t('applications')}</span>
              <KanbanSquare size={15} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{applicationTotal}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {applicationCounts.applied} {t('applied')} · {applicationCounts.interviewing} {t('interviewing')}
              </div>
            </div>
          </Link>

          {/* Card 3: Interview */}
          <Link
            href="/interview"
            className="rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary flex flex-col justify-between h-24"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{t('interview')}</span>
              <Brain size={15} className="text-muted-foreground" />
            </div>
            <div>
              {lastInterviewScore !== null ? (
                <>
                  <div className="text-2xl font-bold text-foreground">{Math.round(lastInterviewScore * 10)}%</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t('lastInterviewScore')}</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-muted-foreground py-1">{t('noSessions')}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t('startPracticing')} →</div>
                </>
              )}
            </div>
          </Link>

          {/* Card 4: Cover Letters */}
          <Link
            href={coverLetters.length > 0 ? `/cover-letter` : '/chat'}
            className="rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary flex flex-col justify-between h-24"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{t('letters')}</span>
              <Mail size={15} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{coverLetterCount}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {coverLetterCount === 1 ? t('coverLetter') : t('coverLetters')}
              </div>
            </div>
          </Link>
        </div>

        {/* Section C: Two-column Panel (Top Resumes + Pipeline Snapshot) */}
        <div className="mb-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left card: Top Resumes */}
          <div className="rounded-sm border border-border bg-card p-4">
            <div className="label-mono mb-3 text-foreground font-semibold">{t('topResumes')}</div>
            <div className="space-y-2">
              {topResumes.map((r) => (
                <Link
                  key={r.id}
                  href={`/resume/${r.id}`}
                  className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 hover:bg-background transition-colors"
                >
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      r.score >= 85 ? 'bg-success' : r.score >= 70 ? 'bg-primary' : 'bg-[var(--warn)]'
                    )}
                  />
                  <span className="flex-1 truncate text-xs font-medium text-foreground">{r.name}</span>
                  <span className="font-mono text-[10px] font-semibold text-success">{r.score}%</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right card: Applications Snapshot */}
          <div className="rounded-sm border border-border bg-card p-4">
            <div className="label-mono mb-3 text-foreground font-semibold">{t('applications')}</div>
            <div className="space-y-2">
              {[
                { label: t('bookmarked'), count: applicationCounts.bookmark, color: 'bg-muted-foreground' },
                { label: t('applied'), count: applicationCounts.applied, color: 'bg-primary' },
                { label: t('interviewing'), count: applicationCounts.interviewing, color: 'bg-[var(--warn)]' },
                { label: t('offers'), count: applicationCounts.offers, color: 'bg-success' },
              ].map((stage) => (
                <Link
                  key={stage.label}
                  href="/applications"
                  className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 hover:bg-background transition-colors"
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', stage.color)} />
                  <span className="flex-1 text-xs font-medium text-foreground">{stage.label}</span>
                  <span className="font-mono text-[10px] font-semibold text-muted-foreground">{stage.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Section D: Quick Actions (4-column grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/chat"
            className="flex flex-col items-center gap-2 rounded-sm border border-border bg-card p-4 text-center transition-colors hover:border-primary"
          >
            <MessageSquare size={18} className="text-primary" />
            <span className="text-xs font-medium text-foreground">{t('chatWithCoach')}</span>
          </Link>

          <Link
            href="/interview"
            className="flex flex-col items-center gap-2 rounded-sm border border-border bg-card p-4 text-center transition-colors hover:border-primary"
          >
            <Brain size={18} className="text-primary" />
            <span className="text-xs font-medium text-foreground">{t('practiceInterview')}</span>
          </Link>

          <Link
            href="/ats"
            className="flex flex-col items-center gap-2 rounded-sm border border-border bg-card p-4 text-center transition-colors hover:border-primary"
          >
            <CheckSquare size={18} className="text-primary" />
            <span className="text-xs font-medium text-foreground">{t('atsOptimizer')}</span>
          </Link>

          <Link
            href="/applications"
            className="flex flex-col items-center gap-2 rounded-sm border border-border bg-card p-4 text-center transition-colors hover:border-primary"
          >
            <KanbanSquare size={18} className="text-primary" />
            <span className="text-xs font-medium text-foreground">{t('viewApplications')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
