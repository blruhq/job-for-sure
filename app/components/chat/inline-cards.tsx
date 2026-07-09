'use client'

import { Bookmark, ExternalLink, Upload, FileText, ClipboardList } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import type { Company, Resume } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// INLINE MATCH LIST — shows job matches inside a chat bubble
// ═══════════════════════════════════════════════════════════════

function companyKey(c: Company) {
  return (c.name + c.role).replace(/\s+/g, '-').toLowerCase()
}

export function InlineMatchRow({ company }: { company: Company }) {
  const { isBookmarked, bookmarkJob, activeResume } = useAppStore()
  const key = companyKey(company)
  const bookmarked = isBookmarked(key)

  return (
    <div className="flex items-center gap-2.5 border-b border-border/50 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-background">
      <a
        href={company.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs font-mono text-[9px] font-bold text-white"
        style={{ background: company.color }}
      >
        {company.logo}
      </a>
      <a
        href={company.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <div className="text-xs font-semibold">{company.name} — {company.role}</div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {company.loc} · {company.work}{company.visa ? ' · visa' : ''} · {company.salary}
        </div>
      </a>
      <span
        className={cn(
          'shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-xs font-semibold',
          company.level === 'high' ? 'bg-success-soft text-success' : 'bg-warn-soft text-[var(--warn)]',
        )}
      >
        {company.score}%
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!bookmarked) {
            bookmarkJob({
              key,
              logo: company.logo,
              color: company.color,
              company: company.name,
              title: company.role,
              loc: company.loc,
              score: company.score,
              level: company.level,
              time: 'just now',
              url: company.url,
              resume: activeResume?.name ?? '',
            })
          }
        }}
        disabled={bookmarked}
        className={cn(
          'shrink-0 rounded-xs border px-2 py-1 text-[11px] font-medium transition-all',
          bookmarked
            ? 'border-primary bg-primary text-white'
            : 'border-primary/15 bg-accent-soft text-primary hover:bg-primary hover:text-white',
        )}
      >
        {bookmarked ? (
          <span className="flex items-center gap-1">
            <Bookmark size={10} fill="currentColor" /> Bookmarked
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Bookmark size={10} /> Bookmark
          </span>
        )}
      </button>
    </div>
  )
}

export function InlineMatchList({ companies, title }: { companies: Company[]; title?: string }) {
  if (!companies || companies.length === 0) return null
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border">
      {title && (
        <div className="bg-card px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
      )}
      <div className="flex flex-col">
        {companies.map((c) => (
          <InlineMatchRow key={companyKey(c)} company={c} />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// INLINE RESUME PREVIEW — shows a mini resume inside chat
// ═══════════════════════════════════════════════════════════════

export function InlineResumePreview({ resume }: { resume: Resume }) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border">
      <div className="resume-paper p-6">
        <div className="mb-0.5 text-center text-base font-normal">{resume.persona || 'Your Name'}</div>
        <div className="mb-3 text-center font-mono text-[9px] text-muted-foreground">
          {resume.email || 'john@email.com'} · {resume.location || 'San Francisco, CA'}
        </div>
        <div className="mb-2.5">
          <div className="mb-1 border-b border-border pb-0.5 text-[9px] font-bold uppercase tracking-wider">Summary</div>
          <div className="text-muted-foreground">{resume.summary || `Professional with experience in ${resume.skills.slice(0, 3).join(', ')}.`}</div>
        </div>
        <div className="mb-2.5">
          <div className="mb-1 border-b border-border pb-0.5 text-[9px] font-bold uppercase tracking-wider">Skills</div>
          <div className="flex flex-wrap gap-1">
            {resume.skills.map((s) => (
              <span key={s} className="rounded-xs border border-border bg-background px-1.5 py-px text-[9px]">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ENTRY CARDS — welcome screen options
// ═══════════════════════════════════════════════════════════════

export function EntryCards({ onUpload, onWizard, onPasteJD }: {
  onUpload: () => void
  onWizard: () => void
  onPasteJD: () => void
}) {
  const cards = [
    { icon: Upload, title: 'Upload Resume', sub: 'PDF or DOCX', onClick: onUpload },
    { icon: FileText, title: 'Build from Template', sub: 'No resume? Start here', onClick: onWizard },
    { icon: ClipboardList, title: 'Paste Job Posting', sub: 'Analyze a JD', onClick: onPasteJD },
  ]
  return (
    <div className="mt-2 flex flex-wrap gap-2.5">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <button
            key={card.title}
            onClick={card.onClick}
            className="flex min-w-[140px] max-w-[200px] flex-1 flex-col items-center rounded-md border border-border bg-card p-4 text-center transition-all hover:border-primary hover:-translate-y-px"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-accent-soft text-primary">
              <Icon size={18} />
            </div>
            <div className="text-xs font-semibold">{card.title}</div>
            <div className="text-[11px] text-muted-foreground">{card.sub}</div>
          </button>
        )
      })}
    </div>
  )
}
