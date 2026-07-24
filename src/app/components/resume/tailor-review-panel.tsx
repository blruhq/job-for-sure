'use client'

import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { useUIStore } from '~/hooks/use-ui'
import type { Resume, TailorChange } from '~/types/resume'

// ── Pure function: apply only accepted changes to produce the previewed resume ──
function applyAcceptedChanges(base: Resume, optimized: Resume, changes: TailorChange[], accepted: Set<string>): Resume {
  // Start from the base resume
  let result: Resume = { ...base }

  for (const change of changes) {
    if (!accepted.has(change.id)) continue

    switch (change.field) {
      case 'summary':
        result = { ...result, summary: change.after }
        break
      case 'role':
        result = { ...result, role: change.after }
        break
      case 'skill-add':
        result = { ...result, skills: [...(result.skills || []), change.after] }
        break
      case 'skill-remove':
        result = { ...result, skills: (result.skills || []).filter(s => s !== change.before) }
        break
      case 'bullet': {
        if (change.anchor?.experienceIndex === undefined || change.anchor?.bulletIndex === undefined) break
        const expIdx = change.anchor.experienceIndex
        const bulletIdx = change.anchor.bulletIndex
        const experiences = [...(result.experience || [])]
        if (expIdx < experiences.length) {
          const exp = { ...experiences[expIdx] }
          const bullets = [...(exp.bullets || [])]
          if (bulletIdx < bullets.length) {
            bullets[bulletIdx] = change.after
          } else {
            bullets.push(change.after)
          }
          exp.bullets = bullets
          experiences[expIdx] = exp
        }
        result = { ...result, experience: experiences }
        break
      }
    }
  }

  return result
}

export function TailorReviewPanel({ onApply, onCancel }: { onApply: (variant: Resume) => void; onCancel: () => void }) {
  const pendingTailor = useUIStore((s) => s.pendingTailor)
  const toggleAcceptedChange = useUIStore((s) => s.toggleAcceptedChange)

  // ── Hooks MUST be before any early return ──
  const pending = pendingTailor // local alias for readability
  // Wrap fallback values in useMemo so the downstream useMemo deps are stable
  // (an inline `?? []` creates a new array every render and busts the memo).
  const changes = useMemo(() => pending?.changes ?? [], [pending?.changes])
  const accepted = useMemo<Set<string>>(() => pending?.accepted ?? new Set(), [pending?.accepted])
  const opt = pending?.optimized
  const base = pending?.baseResume

  const previewedResume = useMemo(
    () => {
      if (!base || !opt) return {} as Resume
      return applyAcceptedChanges(base, opt, changes, accepted)
    },
    [base, opt, changes, accepted]
  )

  if (!pending || !base || !opt) return null

  const acceptedCount = accepted.size
  const totalCount = changes.length

  const handleApply = () => {
    // Create a variant resume from the previewed state
    const variant: Resume = {
      ...previewedResume,
      id: crypto.randomUUID(),
      name: pending.jobContext
        ? `${base.name} → ${pending.jobContext.company || 'Tailored'}`
        : `${base.name} (Optimized)`,
      baseResumeId: base.id,
      isVariant: true,
      variantLabel: pending.jobContext
        ? `Tailored for ${pending.jobContext.company || ''} — ${pending.jobContext.title || ''}`.trim()
        : 'AI Optimized',
      updated: 'just now',
      score: base.score,
    }

    onApply(variant)
  }

  const handleAcceptAll = () => {
    changes.forEach(c => {
      if (!accepted.has(c.id)) toggleAcceptedChange(c.id)
    })
  }

  const handleRejectAll = () => {
    accepted.forEach(id => toggleAcceptedChange(id))
  }

  return (
    <div className="flex h-full flex-col neuro-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between neuro-divider px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Review AI Changes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {acceptedCount} of {totalCount} changes accepted — preview updates live
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            onClick={handleAcceptAll}
            className="px-2.5 py-1.5 text-xs"
          >
            Accept all
          </Button>
          <Button
            variant="outline"
            onClick={handleRejectAll}
            className="px-2.5 py-1.5 text-xs"
          >
            Reject all
          </Button>
        </div>
      </div>

      {/* Change list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {changes.map((change) => {
          const isAccepted = accepted.has(change.id)
          return (
            <div
              key={change.id}
              className={cn(
                'rounded-sm border p-3 transition-colors',
                isAccepted ? 'border-primary/30 bg-primary/5' : 'neuro-inset opacity-60',
              )}
            >
              {/* Toggle row */}
              <div className="flex items-start gap-2">
                <Button
                  variant={isAccepted ? 'default' : 'outline'}
                  onClick={() => toggleAcceptedChange(change.id)}
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs p-0',
                  )}
                >
                  {isAccepted && <Check size={10} strokeWidth={3} />}
                </Button>

                <div className="flex-1 min-w-0">
                  {/* Label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                      {change.field}
                    </span>
                    <span className="text-xs font-medium text-foreground">{change.label}</span>
                  </div>

                  {/* Before → After */}
                  <div className="space-y-1">
                    {change.before && (
                      <div className="rounded-xs bg-destructive/5 border border-destructive/10 px-2 py-1">
                        <span className="text-xs text-muted-foreground line-through opacity-70">
                          {change.before}
                        </span>
                      </div>
                    )}
                    {change.after && (
                      <div className="rounded-xs bg-success/5 border border-success/10 px-2 py-1">
                        <span className="text-xs text-foreground">{change.after}</span>
                      </div>
                    )}
                  </div>

                  {/* Rationale */}
                  {change.rationale && (
                    <p className="mt-1 text-[10px] text-muted-foreground italic">
                      {change.rationale}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {changes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-muted-foreground">No changes proposed by AI.</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">Your resume is already well-optimized.</p>
          </div>
        )}
      </div>

      {/* Footer with apply/cancel */}
      <div className="flex shrink-0 items-center gap-2 neuro-divider p-3">
        <Button
          variant="default"
          onClick={handleApply}
          disabled={acceptedCount === 0}
          className="flex-1 px-3 py-2 text-sm font-medium"
        >
          Apply {acceptedCount > 0 ? `${acceptedCount} ` : ''}change{acceptedCount === 1 ? '' : 's'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="px-3 py-2 text-sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
