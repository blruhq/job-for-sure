'use client'

import { useState } from 'react'
import { X, ArrowRight, ArrowLeft, Plus, Check } from 'lucide-react'
import { cn } from '~/lib/utils'

interface WizardData {
  role: string
  name: string
  email: string
  location: string
  summary: string
  company: string
  companyRole: string
  dates: string
  bullets: string
  skills: string[]
}

interface BuildWizardProps {
  open: boolean
  onClose: () => void
  onComplete: (data: WizardData) => void
}

const ROLE_PRESETS = [
  'Frontend Developer',
  'Full-Stack Engineer',
  'Backend Engineer',
  'Product Designer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
]

const SKILL_PRESETS = [
  'React', 'TypeScript', 'JavaScript', 'Python', 'Node.js',
  'CSS', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL',
  'Figma', 'Next.js', 'Vue', 'Go', 'Rust',
]

const EMPTY: WizardData = {
  role: '', name: '', email: '', location: '', summary: '',
  company: '', companyRole: '', dates: '', bullets: '', skills: [],
}

export function BuildWizard({ open, onClose, onComplete }: BuildWizardProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(EMPTY)
  const [skillInput, setSkillInput] = useState('')

  if (!open) return null

  const reset = () => { setStep(0); setData(EMPTY); setSkillInput('') }

  const handleClose = () => { reset(); onClose() }

  const handleComplete = () => {
    onComplete({
      ...data,
      bullets: data.bullets,
    })
    reset()
  }

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !data.skills.includes(trimmed)) {
      setData({ ...data, skills: [...data.skills, trimmed] })
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    setData({ ...data, skills: data.skills.filter(s => s !== skill) })
  }

  const canProceed = [
    data.role.trim().length > 0,
    data.name.trim().length > 0,
    data.company.trim().length > 0,
    data.skills.length >= 3,
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold text-primary">STEP {step + 1} / 4</span>
            <span className="text-sm font-semibold text-foreground">
              {['Your Role', 'About You', 'Experience', 'Skills'][step]}
            </span>
          </div>
          <button onClick={handleClose} className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted">
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'h-0.5 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="p-5">
          {step === 0 && (
            <div className="space-y-3">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                What role are you looking for?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PRESETS.map(r => (
                  <button
                    key={r}
                    onClick={() => setData({ ...data, role: r })}
                    className={cn(
                      'cursor-pointer rounded-xs border px-2.5 py-1 text-[11px] transition-all',
                      data.role === r
                        ? 'border-primary bg-accent-soft text-primary'
                        : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                value={data.role}
                onChange={(e) => setData({ ...data, role: e.target.value })}
                placeholder="Or type your own role…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Full Name</label>
                <input
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Email</label>
                  <input
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    placeholder="you@email.com"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Location</label>
                  <input
                    value={data.location}
                    onChange={(e) => setData({ ...data, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Summary</label>
                <textarea
                  value={data.summary}
                  onChange={(e) => setData({ ...data, summary: e.target.value })}
                  rows={2}
                  placeholder="6+ years building web apps…"
                  className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Company</label>
                  <input
                    value={data.company}
                    onChange={(e) => setData({ ...data, company: e.target.value })}
                    placeholder="Tech Corp"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Job Title</label>
                  <input
                    value={data.companyRole}
                    onChange={(e) => setData({ ...data, companyRole: e.target.value })}
                    placeholder="Senior Engineer"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Dates</label>
                <input
                  value={data.dates}
                  onChange={(e) => setData({ ...data, dates: e.target.value })}
                  placeholder="2020 - Present"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Key Achievements (one per line)</label>
                <textarea
                  value={data.bullets}
                  onChange={(e) => setData({ ...data, bullets: e.target.value })}
                  rows={4}
                  placeholder={'Built checkout that increased conversion 23%\nLed team of 5 engineers\nMigrated monolith to microservices'}
                  className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Your Key Skills ({data.skills.length} added)
              </label>
              {/* Skill tags */}
              <div className="flex min-h-[40px] flex-wrap gap-1.5 rounded-md border border-border bg-background p-2">
                {data.skills.map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-xs bg-accent-soft px-2 py-0.5 text-[11px] text-primary"
                  >
                    {s}
                    <button onClick={() => removeSkill(s)} className="cursor-pointer hover:opacity-70">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) }
                    if (e.key === 'Backspace' && !skillInput && data.skills.length) {
                      removeSkill(data.skills[data.skills.length - 1])
                    }
                  }}
                  placeholder={data.skills.length === 0 ? 'Type a skill and press Enter…' : 'Add more…'}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              {/* Quick add */}
              <div className="flex flex-wrap gap-1">
                {SKILL_PRESETS.filter(s => !data.skills.includes(s)).slice(0, 8).map(s => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="cursor-pointer inline-flex items-center gap-0.5 rounded-xs border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Plus size={8} /> {s}
                  </button>
                ))}
              </div>
              {data.skills.length >= 3 && (
                <p className="font-mono text-[10px] text-success">✓ Looks good! Ready to generate.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
            className="cursor-pointer flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft size={12} /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => canProceed[step] && setStep(step + 1)}
              disabled={!canProceed[step]}
              className="cursor-pointer flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed[3]}
              className="cursor-pointer flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={12} /> Generate Resume
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export type { WizardData }
