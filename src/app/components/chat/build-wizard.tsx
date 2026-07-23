'use client'

import { useState } from 'react'
import { X, ArrowRight, Check } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { TemplateGallery } from '~/components/resume/templates/template-gallery'
import type { ResumeTemplate } from '~/types/resume'

interface WizardData {
  template: ResumeTemplate
  role: string
  industry: string
}

interface BuildWizardProps {
  open: boolean
  onClose: () => void
  onComplete: (data: WizardData) => void
}

export function BuildWizard({ open, onClose, onComplete }: BuildWizardProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>({
    template: 'minimalist',
    role: '',
    industry: '',
  })

  if (!open) return null

  const reset = () => {
    setStep(0)
    setData({ template: 'minimalist', role: '', industry: '' })
  }

  const handleClose = () => { reset(); onClose() }

  const handleComplete = () => {
    onComplete(data)
    reset()
  }

  const canProceed = [
    true, // Step 0: template always has default
    data.role.trim().length > 0, // Step 1: role required
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold text-primary">STEP {step + 1} / 2</span>
            <span className="text-sm font-semibold text-foreground">
              {['Choose Template', 'Your Target Role'][step]}
            </span>
          </div>
           <Button variant="ghost" size="icon" onClick={handleClose} className="h-6 w-6 rounded-sm p-1 text-muted-foreground hover:bg-muted">
             <X size={14} />
           </Button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-3">
          {[0, 1].map(i => (
            <div
              key={i}
              className={cn(
                'h-0.5 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>

        {/* Body */}
        <div className="p-5">
          {step === 0 && (
            <div className="space-y-3">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Pick a template for your resume
              </label>
              <TemplateGallery
                value={data.template}
                onChange={(t: ResumeTemplate) => setData({ ...data, template: t })}
              />
              <p className="text-[10px] text-muted-foreground italic">
                You can change the template anytime without losing your content.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  What role are you applying for? *
                </label>
                <Input
                  value={data.role}
                  onChange={(e) => setData({ ...data, role: e.target.value })}
                  placeholder="e.g. Senior Product Designer, Registered Nurse, Marketing Manager"
                  className="w-full rounded-md px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  What industry? <span className="text-muted-foreground/50">(optional — helps tailor questions)</span>
                </label>
                <Input
                  value={data.industry}
                  onChange={(e) => setData({ ...data, industry: e.target.value })}
                  placeholder="e.g. Tech, Healthcare, Finance, Education"
                  className="w-full rounded-md px-3 py-2 text-sm"
                />
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                After this, our AI assistant will guide you through building your resume step by step.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 1 ? (
            <Button
              variant="default"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed[step]}
              className="flex items-center gap-1 rounded-md px-4 py-1.5 text-xs"
            >
              Next <ArrowRight size={12} />
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleComplete}
              disabled={!canProceed[1]}
              className="flex items-center gap-1 rounded-md px-4 py-1.5 text-xs"
            >
              <Check size={12} /> Start Building
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export type { WizardData }
