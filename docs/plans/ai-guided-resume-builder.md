# AI-Guided Resume Builder — Implementation Plan (v2)

> **For the execution agent:** Follow EVERY step in order. Do NOT skip steps. Do NOT make up your own implementation. Every file path, import, function name, and type is specified exactly. Copy-paste the code blocks. Read the ENTIRE file before editing it.

## Architecture Overview

```
User clicks "Build from Template"
  → Step 1: TemplatePicker (visual gallery, pick template)
  → Step 2: RoleInput (enter target role + industry)
  → ChatView enters BUILD_MODE (buildData state set + ref set synchronously)
    → Transport sends mode: 'build' with every message (via ref, not closure)
    → System prompt switches to "resume building" mode
    → AI guides conversation, asks role-specific questions
    → AI recommends custom sections when it detects keywords
    → Progress bar in banner shows sections covered
    → User clicks "Save Resume" or "Switch to Manual" (escape hatch)
  → SAVE: /api/resume/from-chat (extracts structured data from messages)
    → Returns full Resume object (NO hallucination — extraction only)
    → addResume() to store → Redirect to /resume/[id] editor
  → ESCAPE: Creates blank resume with template + role → Opens editor
```

## Critical Implementation Rules (READ FIRST)

1. **ALL dynamic values used inside `useMemo([])` or `useCallback([])` MUST go through refs.** Closures capture values at creation time. If you use `buildData` directly inside the transport `useMemo([])`, it will always be `null`. Always use `buildDataRef.current`.

2. **`setBuildData()` is ASYNC.** When you call `setBuildData(data)` followed immediately by `sendMessage()`, the ref has NOT updated yet. You MUST set `buildDataRef.current = data` SYNCHRONOUSLY before calling `sendMessage()`.

3. **The extraction API must NEVER invent metrics.** If the user said "did frontend work," the bullet is "Did frontend work" — NOT "Led frontend development serving 2M users." Fabrication gets users rejected from jobs.

4. **The AI must NEVER promise to save.** It cannot trigger a save. Only the user clicking "Save Resume" triggers it. The AI should say "Click Save Resume when ready" — NOT "Let me save your resume."

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/api/resume/from-chat/route.ts` | Extract structured resume from chat messages |

## Files to Modify

| File | Change |
|------|--------|
| `app/types/resume.ts` | Add `CustomSectionItem`, `CustomSectionType`, update `ResumeCustomSection` |
| `app/lib/company-data.ts` | Update `createResume` to accept `template` param |
| `app/components/chat/build-wizard.tsx` | Rewrite: template picker (Step 1) + role/industry input (Step 2) |
| `app/components/chat/chat-view.tsx` | Add BUILD_MODE state + refs, build banner with progress + save + escape, call from-chat API |
| `app/api/chat/route.ts` | Accept `mode: 'build'` in body → switch to resume-building system prompt |
| `app/components/resume/templates/*.pdf.tsx` | All 5 templates: render new custom section item format |
| `app/components/resume/resume-detail.tsx` | Update custom sections editor for new item format |

---

## Step 1: Update Data Model

### Step 1.1: `app/types/resume.ts`

Replace the `ResumeCustomSection` interface (lines 55-58):

OLD:
```typescript
export interface ResumeCustomSection {
  title: string
  bullets: string[]
}
```

NEW:
```typescript
export interface CustomSectionItem {
  title: string
  subtitle: string
  date: string
  description: string
  link: string
}

export type CustomSectionType = 'bullets' | 'dated-items' | 'grid'

export interface ResumeCustomSection {
  title: string
  type?: CustomSectionType       // Optional — old resumes don't have this
  items?: CustomSectionItem[]    // Optional — old resumes use bullets instead
  bullets: string[]              // Backward compat — kept for existing resumes
}
```

### Step 1.2: Update `app/lib/company-data.ts`

Change the import (line 1):

OLD:
```typescript
import type { Resume } from '~/types/resume'
```

NEW:
```typescript
import type { Resume, ResumeTemplate } from '~/types/resume'
```

Add `template?: ResumeTemplate` to the `createResume` input type (after `customSections?: Resume['customSections']`):

```typescript
  customSections?: Resume['customSections']
  template?: ResumeTemplate
}): Resume {
```

Add `template: data.template,` to the return object (after `stretch: [],`):

```typescript
    companies: [],
    stretch: [],
    template: data.template,
  }
```

---

## Step 2: Rewrite BuildWizard as Template Picker + Role Input

### File: `app/components/chat/build-wizard.tsx`

Replace the ENTIRE file with:

```typescript
'use client'

import { useState } from 'react'
import { X, ArrowRight, Check } from 'lucide-react'
import { cn } from '~/lib/utils'
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
          <button onClick={handleClose} className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted">
            <X size={14} />
          </button>
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
                <input
                  value={data.role}
                  onChange={(e) => setData({ ...data, role: e.target.value })}
                  placeholder="e.g. Senior Product Designer, Registered Nurse, Marketing Manager"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  What industry? <span className="text-muted-foreground/50">(optional — helps tailor questions)</span>
                </label>
                <input
                  value={data.industry}
                  onChange={(e) => setData({ ...data, industry: e.target.value })}
                  placeholder="e.g. Tech, Healthcare, Finance, Education"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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
          <button
            onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
            className="cursor-pointer flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed[step]}
              className="cursor-pointer flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed[1]}
              className="cursor-pointer flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={12} /> Start Building
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export type { WizardData }
```

---

## Step 3: Update Chat API for Build Mode

### File: `app/api/chat/route.ts`

#### 3.1: Update the request body schema

Find lines 10-13:

OLD:
```typescript
const ChatBody = z.object({
  messages: z.array(z.any()),
  context: z.any().optional(),
})
```

NEW:
```typescript
const ChatBody = z.object({
  messages: z.array(z.any()),
  context: z.any().optional(),
  mode: z.enum(['coach', 'build']).optional().default('coach'),
  buildRole: z.string().optional().default(''),
  buildIndustry: z.string().optional().default(''),
})
```

#### 3.2: Add build-mode system prompt

Find the `systemPrompt` variable (around line 71). Insert this BEFORE the `systemPrompt` declaration:

```typescript
  const mode = body.data.mode || 'coach'
  const buildRole = body.data.buildRole || ''
  const buildIndustry = body.data.buildIndustry || ''

  // ── Build-mode system prompt ──
  // Used when user is building a new resume from scratch via chat.
  // The AI guides them through each section conversationally.
  const buildSystemPrompt = `You are Job For Sure — an AI resume building assistant. The user is building a new resume from scratch${buildRole ? ` for a ${buildRole} role` : ''}${buildIndustry ? ` in the ${buildIndustry} industry` : ''}.

## Your Process (follow this order):
1. In your FIRST response, set expectations: "I'll ask about your experience, education, and skills — one section at a time. Should take about 5 minutes." Then ask about their MOST RECENT job: "What was your title, company, and dates?"
2. After they answer, ask for 2-3 key achievements in that role
3. Ask if they have previous roles to add (one at a time)
4. Ask about education: institution, degree, field, dates
5. Ask about their key skills
6. Offer to write a professional summary based on what they've shared

## Custom Section Detection:
Throughout the conversation, listen for keywords that suggest additional sections:
- "speaking", "conference", "talk" → suggest "Speaking Engagements"
- "volunteer", "community" → suggest "Volunteer Work"
- "published", "article", "paper" → suggest "Publications"
- "open source", "contributed to" → suggest "Open Source"
- "award", "won", "recognized" → suggest "Awards"
- "certification", "certified", "licensed" → add to Certifications
- "fluent", "bilingual", "speak [language]" → add to Languages

When you detect an opportunity, ask: "💡 I noticed you mentioned [topic]. Want me to add a [Section Name] section?" Only suggest if the user clearly has relevant experience.

## Rules:
- Ask ONE question at a time. Never list multiple questions.
- Keep your responses SHORT — 2-3 sentences max. This is a conversation, not a lecture.
- Do NOT write long bullet points for them — ask them for their achievements and let them answer.
- Be encouraging but not overly enthusiastic.
- When they finish a section, briefly acknowledge and move to the next: "Got it. Now let's talk about..."
- If they want to skip a section, let them. Say "No problem, we can add it later."
- If they say "done" or "finished" or "that's everything", say: "Great! Whenever you're ready, click **Save Resume** in the bar above to create your resume. You can also tell me what else to add."
- NEVER say "I'll save your resume" or "Let me create your resume" — you CANNOT save. Only the user can save by clicking the button.
- Respond in the same language the user uses.`

  const systemPrompt = mode === 'build'
    ? buildSystemPrompt
    : `You are Job For Sure — an AI career coach embedded in a job search app.

Your capabilities:
- Analyze resumes and give specific, actionable feedback
- Suggest improvements to skills, summary, and experience descriptions
- Tailor resumes for specific job descriptions
- Provide interview preparation advice
- Give salary negotiation guidance
- Help users decide which roles to target
${resumeContext}
Rules:
- You have the user's FULL resume data above. Reference specific experience, projects, and education when giving feedback.
- NEVER say "No experience" or "No projects" if the data above contains them.
- Be concise and direct. No fluff.
- Use markdown formatting (bold, lists) for readability.
- For salary advice, give specific bands and negotiation tips.
- For interview prep, give specific questions based on their skills and experience.
- Keep responses under 200 words unless the user asks for detail.
- Respond in the same language the user uses to chat with you (e.g., if they write in Thai, reply in Thai. If they write in English, reply in English). Never switch languages mid-conversation unless the user explicitly asks you to translate something.`
```

#### 3.3: Update the analytics event

Find the `captureServerEvent` call (around line 91):

OLD:
```typescript
  await captureServerEvent(user.id, 'chat_message_sent')
```

NEW:
```typescript
  await captureServerEvent(user.id, mode === 'build' ? 'resume_build_chat' : 'chat_message_sent')
```

---

## Step 4: Update ChatView for Build Mode (BIGGEST CHANGE)

### File: `app/components/chat/chat-view.tsx`

This step has multiple sub-steps. Follow them ALL precisely.

#### 4.1: Update imports

Find line 18:

OLD:
```typescript
import { Upload, FileText, ClipboardList, Loader2, Paperclip, RotateCcw } from 'lucide-react'
```

NEW:
```typescript
import { Upload, FileText, ClipboardList, Loader2, Paperclip, RotateCcw, Sparkles, Save, Pencil } from 'lucide-react'
```

#### 4.2: Add build-mode state + refs

Find line 27 (`const [uploadStage, setUploadStage] = useState<'idle' | 'parsing'>('idle')`).

Add IMMEDIATELY AFTER it:

```typescript
  // ── BUILD MODE ──
  // Restore from sessionStorage on mount (survives refresh)
  const [buildData, setBuildData] = useState<WizardData | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = sessionStorage.getItem('jfs-build-data')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [savingResume, setSavingResume] = useState(false)
```

Find line 42-43 (the `activeResumeRef`):

```typescript
  const activeResumeRef = useRef(activeResume)
  activeResumeRef.current = activeResume
```

Add IMMEDIATELY AFTER it (BEFORE the transport useMemo):

```typescript
  // Build-mode ref — MUST be set synchronously before sendMessage
  const buildDataRef = useRef<WizardData | null>(buildData)
  buildDataRef.current = buildData

  // Persist buildData to sessionStorage (survives refresh)
  useEffect(() => {
    if (buildData) {
      sessionStorage.setItem('jfs-build-data', JSON.stringify(buildData))
    } else {
      sessionStorage.removeItem('jfs-build-data')
    }
  }, [buildData])

  // Saving ref — for stable CustomInputBar
  const savingResumeRef = useRef(false)
  savingResumeRef.current = savingResume
```

#### 4.2b: Add build progress detection

Add this AFTER the refs block (after `savingResumeRef`), BEFORE the transport useMemo:

```typescript
  // ── BUILD PROGRESS DETECTION ──
  // Scans USER messages for keywords to detect which sections have been covered.
  // Client-side only — no AI calls. "Good enough" heuristic.
  const BUILD_SECTIONS = [
    { id: 'experience', label: 'Experience', keywords: ['job', 'work', 'company', 'role at', 'my title', 'position', 'employer', 'worked at', 'hired', 'my boss', 'colleague', 'salary', 'promotion'] },
    { id: 'education', label: 'Education', keywords: ['school', 'university', 'degree', 'studied', 'graduated', 'college', 'bachelor', 'master', 'phd', 'diploma', 'gpa', 'student'] },
    { id: 'skills', label: 'Skills', keywords: ['skill', 'technolog', 'tools', 'framework', 'proficient', 'i know', 'i use', 'experienced with', 'familiar with', 'i work with'] },
    { id: 'summary', label: 'Summary', keywords: ['summary', 'about me', 'professional summary', 'years of experience', 'passionate about'] },
  ] as const

  const coveredSectionsRef = useRef<Set<string>>(new Set())
```

Then, AFTER the `useChat` hook (after line 74 `const { messages, status, sendMessage, stop, setMessages } = useChat(...)`), add this computation:

```typescript
  // Recompute covered sections whenever messages change
  if (buildDataRef.current) {
    const userText = messages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.parts?.map((p: any) => p.text || '').join(' ') || '')
      .join(' ')
      .toLowerCase()
    const covered = new Set<string>()
    for (const section of BUILD_SECTIONS) {
      if (section.keywords.some(kw => userText.includes(kw))) {
        covered.add(section.id)
      }
    }
    coveredSectionsRef.current = covered
  }
```

#### 4.3: Fix transport to use refs

Find the transport `useMemo` (line 46). The `body` function must use `buildDataRef.current`:

OLD:
```typescript
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      body: () => ({
        context: {
          activeResume: activeResumeRef.current
```

NEW:
```typescript
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      body: () => ({
        mode: buildDataRef.current ? 'build' : 'coach',
        buildRole: buildDataRef.current?.role || '',
        buildIndustry: buildDataRef.current?.industry || '',
        context: {
          activeResume: activeResumeRef.current
```

#### 4.4: Replace handleWizardComplete

Find `handleWizardComplete` (line 224). Replace the ENTIRE function with:

```typescript
  // ── BUILD FROM TEMPLATE (NEW FLOW) ──
  const handleWizardComplete = (data: WizardData) => {
    // Set ref SYNCHRONOUSLY before sendMessage so transport reads correct mode
    buildDataRef.current = data
    setBuildData(data)
    setWizardOpen(false)

    // Send initial message to start the guided conversation
    sendMessage({ text: `I want to build a resume for a ${data.role} role${data.industry ? ` in ${data.industry}` : ''}.` })
  }
```

Also find the `handleNewChat` function (around line 92) and update it to clear build data:

OLD:
```typescript
  const handleNewChat = useCallback(() => {
    sessionStorage.removeItem('jfs-chat-messages')
    window.location.reload()
  }, [])
```

NEW:
```typescript
  const handleNewChat = useCallback(() => {
    sessionStorage.removeItem('jfs-chat-messages')
    sessionStorage.removeItem('jfs-build-data')
    buildDataRef.current = null
    window.location.reload()
  }, [])
```

#### 4.5: Add handleSaveResume function

Add AFTER `handleWizardComplete`:

```typescript
  // ── SAVE RESUME FROM CHAT ──
  const handleSaveResumeRef = useRef<() => void>(() => {})

  const handleSaveResume = useCallback(async () => {
    if (!buildDataRef.current || savingResumeRef.current) return
    savingResumeRef.current = true
    setSavingResume(true)

    try {
      const res = await fetch('/api/resume/from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.parts?.map((p: any) => p.text || '').join(' ') || '',
          })),
          template: buildDataRef.current.template,
          role: buildDataRef.current.role,
          industry: buildDataRef.current.industry,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to build resume')
      }

      const parsed = await res.json()

      const resume = createResume({
        name: `${parsed.persona || buildDataRef.current.role} Resume`,
        role: buildDataRef.current.role,
        persona: parsed.persona || 'Your Name',
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        github: parsed.github,
        summary: parsed.summary,
        skills: parsed.skills || [],
        experience: parsed.experience || [],
        education: parsed.education || [],
        projects: parsed.projects || [],
        certifications: parsed.certifications || [],
        languages: parsed.languages || [],
        customSections: parsed.customSections || [],
        template: buildDataRef.current.template,
      })

      addResume(resume)
      setActiveResumeId(resume.id)

      const ackText = `✅ Resume saved! I've created your **${buildDataRef.current.role}** resume with the **${buildDataRef.current.template}** template. You can open the editor to make any changes.`
      setMessages((prev: any[]) => [...prev, {
        id: `save-ack-${Date.now()}`,
        role: 'assistant',
        parts: [{ type: 'text', text: ackText }],
        createdAt: new Date(),
      } as any])

      // Exit build mode
      buildDataRef.current = null
      setBuildData(null)
      sessionStorage.removeItem('jfs-build-data')

      notify({ message: 'Resume created!', type: 'success' })

      setTimeout(() => router.push(`/resume/${resume.id}`), 600)
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to build resume', type: 'error' })
    } finally {
      savingResumeRef.current = false
      setSavingResume(false)
    }
  }, [messages, addResume, setActiveResumeId, setMessages, router])

  // Keep ref in sync so CustomInputBar (useCallback[]) always calls latest version
  handleSaveResumeRef.current = handleSaveResume
```

#### 4.6: Add escape hatch function

Add AFTER `handleSaveResume`:

```typescript
  // ── ESCAPE HATCH: Switch to manual editor ──
  const handleSwitchToManual = useCallback(() => {
    if (!buildDataRef.current) return

    // Create a blank resume with the chosen template + role
    const resume = createResume({
      name: `${buildDataRef.current.role} Resume`,
      role: buildDataRef.current.role,
      persona: 'Your Name',
      skills: [],
      template: buildDataRef.current.template,
    })

    addResume(resume)
    setActiveResumeId(resume.id)

    // Exit build mode
    buildDataRef.current = null
    setBuildData(null)
    sessionStorage.removeItem('jfs-build-data')

    notify({ message: 'Opened blank resume in editor', type: 'info' })
    router.push(`/resume/${resume.id}`)
  }, [addResume, setActiveResumeId, router])

  const handleSwitchToManualRef = useRef(handleSwitchToManual)
  handleSwitchToManualRef.current = handleSwitchToManual
```

#### 4.7: Update CustomInputBar to show build banner

Find the `CustomInputBar` definition (around line 296). The current function returns a `<div>` with action pills and `<InputBar>`.

Replace the ENTIRE `CustomInputBar` `useCallback` with:

```typescript
  const CustomInputBar = useCallback(function CustomInputBar(props: InputBarProps) {
    const { onAttach, ...inputBarProps } = props

    const building = buildDataRef.current
    const saving = savingResumeRef.current

    return (
      <div>
        {/* ── Build mode banner ── */}
        {building && (
          <div className="border-t border-primary/20 bg-primary/5 px-4 py-2">
            {/* Row 1: info + buttons */}
            <div className="mx-auto flex max-w-an items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles size={12} className="shrink-0 text-primary" />
                <span className="truncate text-[11px] text-foreground">
                  Building: <strong>{building.role}</strong>
                  {building.industry ? ` · ${building.industry}` : ''}
                  {' · '}{building.template}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => handleSwitchToManualRef.current()}
                  className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  title="Switch to manual editor"
                >
                  <Pencil size={10} /> Manual
                </button>
                <button
                  onClick={() => handleSaveResumeRef.current()}
                  disabled={saving || !coveredSectionsRef.current.has('experience')}
                  className="flex cursor-pointer items-center gap-1 rounded-xs bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  title={!coveredSectionsRef.current.has('experience') ? 'Share at least one job experience first' : 'Save your resume'}
                >
                  <Save size={10} /> {saving ? 'Saving...' : 'Save Resume'}
                </button>
              </div>
            </div>
            {/* Row 2: Progress dots */}
            <div className="mx-auto mt-1.5 flex max-w-an items-center gap-3">
              {BUILD_SECTIONS.map((s) => {
                const done = coveredSectionsRef.current.has(s.id)
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      done ? 'bg-success' : 'bg-border',
                    )} />
                    <span className={cn(
                      'text-[9px] font-mono transition-colors',
                      done ? 'text-success' : 'text-muted-foreground',
                    )}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action pills — visible when chat has messages AND not in build mode */}
        {showPillBarRef.current && !building && (
          <div className="px-3">
            <div className="mx-auto max-w-an">
              <div className="flex items-center gap-1.5 pb-1.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/30 hover:bg-accent-soft"
                >
                  <Upload size={11} />
                  Upload Resume
                </button>
                <button
                  onClick={() => setWizardOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/30 hover:bg-accent-soft"
                >
                  <FileText size={11} />
                  Build Template
                </button>
                <button
                  onClick={() => setPasteOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/30 hover:bg-accent-soft"
                >
                  <ClipboardList size={11} />
                  Paste Job
                </button>
              </div>
            </div>
          </div>
        )}

        <InputBar
          {...inputBarProps}
          disabled={isUploadingRef.current || saving}
          leftActions={
            <button
              onClick={() => fileRef.current?.click()}
              className="size-7 rounded-full inline-flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
              aria-label="Attach file"
            >
              <Paperclip size={14} className="text-neutral-400 dark:text-neutral-600" />
            </button>
          }
        />
      </div>
    )
  }, [])
```

**Key changes from original:**
- Build banner with Sparkles icon, role/template info, "Manual" escape button, and "Save Resume" button
- Action pills hidden during build mode (cleaner UX — focus on building)
- InputBar disabled during save
- All dynamic values via refs — `useCallback` deps stay `[]`

---

## Step 5: Create Extraction API

### File: `app/api/resume/from-chat/route.ts` — NEW FILE

Create directory `app/api/resume/from-chat/` and the file `route.ts` inside it:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { z } from 'zod'
import { captureServerEvent, captureServerError } from '~/lib/posthog-server'

export const maxDuration = 60

const ChatExtractSchema = z.object({
  persona: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  github: z.string().default(''),
  summary: z.string().default(''),
  skills: z.array(z.string()).default([]),
  experience: z.array(
    z.object({
      company: z.string().default(''),
      role: z.string().default(''),
      dates: z.string().default(''),
      bullets: z.array(z.string()).default([]),
    })
  ).default([]),
  education: z.array(
    z.object({
      institution: z.string().default(''),
      degree: z.string().default(''),
      field: z.string().default(''),
      dates: z.string().default(''),
    })
  ).default([]),
  projects: z.array(
    z.object({
      name: z.string().default(''),
      description: z.string().default(''),
      techStack: z.array(z.string()).default([]),
      link: z.string().default(''),
    })
  ).default([]),
  certifications: z.array(
    z.object({
      name: z.string().default(''),
      issuer: z.string().default(''),
      date: z.string().default(''),
    })
  ).default([]),
  languages: z.array(
    z.object({
      name: z.string().default(''),
      proficiency: z.string().default(''),
    })
  ).default([]),
  customSections: z.array(
    z.object({
      title: z.string().default(''),
      type: z.enum(['bullets', 'dated-items', 'grid']).default('bullets'),
      items: z.array(
        z.object({
          title: z.string().default(''),
          subtitle: z.string().default(''),
          date: z.string().default(''),
          description: z.string().default(''),
          link: z.string().default(''),
        })
      ).default([]),
      bullets: z.array(z.string()).default([]),
    })
  ).default([]),
})

const RequestBody = z.object({
  messages: z.array(
    z.object({
      role: z.string(),
      content: z.string(),
    })
  ).min(2),
  template: z.string().optional(),
  role: z.string(),
  industry: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(user.id)
    if (limited) return limited

    const body = RequestBody.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: 'Invalid request. Provide messages array and target role.' },
        { status: 400 },
      )
    }

    const { messages, role, industry } = body.data

    // Format the conversation for extraction
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
      .join('\n\n')

    const parsed = await generateObjectWithFailover<z.infer<typeof ChatExtractSchema>>({
      system: `You are a resume data extractor. Read the conversation between a user and an AI career coach, and extract ALL resume information into structured JSON.

Target role: "${role}"${industry ? ` · Industry: ${industry}` : ''}

## EXTRACTION RULES — READ CAREFULLY:

1. **Extract ONLY what the USER said.** The ASSISTANT messages are questions and suggestions — do NOT extract the assistant's words as the user's experience.

2. **Do NOT invent metrics.** If the user said "improved performance," the bullet is "Improved performance" — NOT "Improved performance by 300% serving 2M users." Fabrication gets people fired.

3. **Clean up grammar only.** You may fix grammar, capitalize properly, and add strong action verbs at the start of bullets. But do NOT change the meaning or add details the user didn't provide.

4. **If the assistant suggested skills and the user AGREED**, include those skills. If the user didn't confirm, exclude them.

5. **Empty is OK.** If a section wasn't discussed, return empty string or empty array. Do NOT fill in defaults.

6. **Summary**: If the user didn't write one, write a 2-sentence summary using ONLY information they provided. Start with "Professional with X years..." based on their actual experience.

7. **Custom sections**: Extract any sections the user agreed to add during the conversation (Speaking, Volunteer, Publications, etc.). Set the "type":
   - "dated-items": items have dates (talks, publications, volunteer roles)
   - "grid": short labels (languages, tools)  
   - "bullets": default — general bullet lists
   Fill items with title/subtitle/date/description/link as available.

8. **persona**: The user's name. CRITICAL — extract this if mentioned ANYWHERE.`,
      prompt: `Conversation:\n\n${conversationText.slice(0, 30000)}`,
      schema: ChatExtractSchema,
      temperature: 0.2,
      maxOutputTokens: 4000,
    })

    await captureServerEvent(user.id, 'resume_built_from_chat')
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[resume/from-chat] Error:', error)
    await captureServerError('anonymous', error, { route: '/api/resume/from-chat' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract resume from chat' },
      { status: 500 },
    )
  }
}
```

**Key difference from v1**: Temperature lowered to 0.2 (was 0.3). Extraction prompt explicitly says "Do NOT invent metrics" and "Extract ONLY what the USER said."

---

## Step 6: Update Templates for New Custom Section Format

### All 5 template files need the same change.

For each template file, find where they render `resume.customSections`. Replace the rendering block.

**Files:**
1. `app/components/resume/templates/minimalist-pdf.tsx`
2. `app/components/resume/templates/modern-pdf.tsx`
3. `app/components/resume/templates/classic-pdf.tsx`
4. `app/components/resume/templates/executive-pdf.tsx`
5. `app/components/resume/templates/photo-pdf.tsx`

In each file, find the custom sections rendering (search for `customSections`). The pattern looks like:

```tsx
{resume.customSections?.map((sec) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{sec.title}</Text>
    {sec.bullets?.map((b, i) => (
      <Text key={i} style={styles.bullet}>• {b}</Text>
    ))}
  </View>
))}
```

Replace with:

```tsx
{resume.customSections?.map((sec) => (
  <View style={styles.section} key={sec.title}>
    <Text style={styles.sectionTitle}>{sec.title}</Text>
    {sec.items && sec.items.length > 0 ? (
      sec.items.map((item, i) => (
        <View key={i} style={{ marginBottom: 4 }}>
          {(item.title || item.subtitle) && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 9, fontFamily: FONT_BODY, fontWeight: 600, color: COLOR_TEXT }}>
                {item.title}{item.subtitle ? ` — ${item.subtitle}` : ''}
              </Text>
              {item.date ? <Text style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: COLOR_MUTED }}>{item.date}</Text> : null}
            </View>
          )}
          {item.description ? (
            <Text style={{ fontSize: 9, fontFamily: FONT_BODY, color: COLOR_MUTED }}>• {item.description}</Text>
          ) : null}
          {item.link ? (
            <Text style={{ fontSize: 8, color: '#5B6ABF' }}>{item.link}</Text>
          ) : null}
        </View>
      ))
    ) : (
      sec.bullets?.map((b, i) => (
        <Text key={i} style={styles.bullet}>• {b}</Text>
      ))
    )}
  </View>
))}
```

**IMPORTANT — per-template variable names:** Each template uses different variable names for fonts and colors. Check the TOP of each template file for the correct variable names:

| Template | Body font variable | Text color variable | Muted color variable |
|----------|-------------------|--------------------|---------------------|
| minimalist | `'Inter'` | `COLORS.ink` | `COLORS.muted` |
| modern | `'Inter'` | `COLORS.ink` | `COLORS.muted` |
| classic | `'Lora'` | `COLORS.ink` | `COLORS.muted` |
| executive | `'Inter'` | `COLORS.ink` | `COLORS.muted` |
| photo | `'Inter'` | `COLORS.ink` | `COLORS.muted` |

All templates import `COLORS` from `./shared-pdf`. The font is always a string literal — check what the template uses for body text in its StyleSheet.

Replace `FONT_BODY` with the correct font string and `COLOR_TEXT`/`COLOR_MUTED` with the correct color variables for each template.

---

## Step 7: Update Editor for New Custom Section Types

### File: `app/components/resume/resume-detail.tsx`

Find the Custom Sections `EditableList` (search for `EditableList<ResumeCustomSection>`). Replace the entire `<EditableList<ResumeCustomSection>` block with:

```typescript
                  <EditableList<ResumeCustomSection>
                    items={editCustomSections}
                    onChange={setEditCustomSections}
                    label="Custom Sections"
                    createNew={() => ({ title: 'New Section', type: 'bullets' as const, items: [], bullets: [] })}
                    renderItem={(sec, _i, update) => (
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="label-mono mb-0.5 block text-[9px]">Section Title</label>
                          <input
                            value={sec.title}
                            onChange={(e) => update({ ...sec, title: e.target.value })}
                            placeholder="e.g. Speaking, Volunteer Work, Publications"
                            className="w-full rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
                          />
                        </div>
                        {/* Items editor (new format) */}
                        {sec.items && sec.items.length > 0 ? (
                          <div className="space-y-2">
                            {sec.items.map((item, idx) => (
                              <div key={idx} className="rounded-xs border border-border/50 bg-background p-2">
                                <div className="flex gap-1.5">
                                  <div className="flex-1">
                                    <label className="label-mono mb-0.5 block text-[8px]">Title</label>
                                    <input value={item.title} onChange={(e) => {
                                      const items = sec.items.map((it, j) => j === idx ? { ...it, title: e.target.value } : it)
                                      update({ ...sec, items })
                                    }} className="w-full rounded-xs border border-border bg-background px-1.5 py-0.5 text-[10px] outline-none focus:border-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="label-mono mb-0.5 block text-[8px]">Subtitle</label>
                                    <input value={item.subtitle} onChange={(e) => {
                                      const items = sec.items.map((it, j) => j === idx ? { ...it, subtitle: e.target.value } : it)
                                      update({ ...sec, items })
                                    }} className="w-full rounded-xs border border-border bg-background px-1.5 py-0.5 text-[10px] outline-none focus:border-primary" />
                                  </div>
                                  <div className="w-24">
                                    <label className="label-mono mb-0.5 block text-[8px]">Date</label>
                                    <input value={item.date} onChange={(e) => {
                                      const items = sec.items.map((it, j) => j === idx ? { ...it, date: e.target.value } : it)
                                      update({ ...sec, items })
                                    }} className="w-full rounded-xs border border-border bg-background px-1.5 py-0.5 text-[10px] outline-none focus:border-primary" />
                                  </div>
                                </div>
                                <div className="mt-1">
                                  <label className="label-mono mb-0.5 block text-[8px]">Description</label>
                                  <textarea value={item.description} onChange={(e) => {
                                    const items = sec.items.map((it, j) => j === idx ? { ...it, description: e.target.value } : it)
                                    update({ ...sec, items })
                                  }} rows={1} className="w-full resize-y rounded-xs border border-border bg-background px-1.5 py-0.5 text-[10px] outline-none focus:border-primary" />
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => update({ ...sec, items: [...(sec.items || []), { title: '', subtitle: '', date: '', description: '', link: '' }] })}
                              className="cursor-pointer rounded-xs border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                            >
                              + Add Item
                            </button>
                          </div>
                        ) : (
                          /* Legacy format: simple bullets textarea */
                          <div>
                            <label className="label-mono mb-0.5 block text-[9px]">Highlights (one per line)</label>
                            <textarea
                              value={sec.bullets?.join('\n') || ''}
                              onChange={(e) => update({ ...sec, bullets: e.target.value.split('\n').filter(Boolean) })}
                              rows={3}
                              className="w-full resize-y rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  />
```

---

## Step 8: Verification

Run these commands in order:

```bash
# 1. TypeScript check — must pass with ZERO errors
npx tsc --noEmit

# 2. Unit tests — must all pass
pnpm vitest run

# 3. Build — must succeed
pnpm build
```

If ANY step fails, fix the errors and re-run. Do NOT skip to manual testing.

### Manual verification checklist:

1. **Template picker**: Click "Build from Template" → see 5 template thumbnails → select one → Next
2. **Role input**: Enter a role (e.g. "Product Designer") → optionally enter industry → "Start Building"
3. **Build banner**: A banner appears at bottom showing role + template + "Save Resume" + "Manual" buttons
4. **AI conversation**: AI asks about most recent job FIRST (not skills, not summary)
5. **AI does NOT promise to save**: When user says "done", AI says "Click Save Resume when ready"
6. **Custom section suggestion**: If user mentions "I spoke at a conference", AI asks "Want me to add a Speaking section?"
7. **Save flow**: Click "Save Resume" → loading state → success notification → redirect to editor
8. **Editor shows data**: All sections pre-filled from conversation
9. **Escape hatch**: Click "Manual" → blank resume opens in editor with chosen template
10. **Action pills hidden**: During build mode, the Upload/Build/Paste pills are hidden
11. **Template switch**: In editor View tab, switch template → content still renders correctly
12. **Custom sections in PDF**: Export PDF → custom sections show with correct format (items or bullets)
13. **Progress indicator**: During build mode, dots light up green as user discusses each section (Experience → Education → Skills → Summary). Verify by chatting about a job and watching the Experience dot turn green.
14. **Save guardrail**: "Save Resume" button is DISABLED until the Experience dot turns green. Hover the disabled button → tooltip says "Share at least one job experience first".
15. **Refresh persistence**: During build mode, refresh the page → build banner reappears with role/template info. Progress dots reflect what was already discussed.
16. **First AI message sets expectations**: AI's first response says "I'll ask about your experience, education, and skills — one section at a time. Should take about 5 minutes." before asking the first question.

---

## GOTCHAS (READ ALL BEFORE IMPLEMENTING)

1. **Ref ordering**: `buildDataRef` MUST be declared BEFORE the `transport` useMemo. If it's declared after, the transport closure won't have access to it.

2. **Synchronous ref set**: In `handleWizardComplete`, set `buildDataRef.current = data` BEFORE calling `sendMessage()`. React's `setState` is async — if you rely on it, the first message will go in 'coach' mode.

3. **`handleSaveResume` uses refs**: The Save button is inside `CustomInputBar` which has `useCallback([])` deps. The function must be called via `handleSaveResumeRef.current()`, NOT `handleSaveResume()` directly.

4. **Action pills hidden during build**: When `buildDataRef.current` is truthy, hide the Upload/Build/Paste pills. This keeps the user focused on building.

5. **InputBar disabled during save**: When `savingResumeRef.current` is true, the input is disabled to prevent sending messages during extraction.

6. **Extraction temperature**: Use 0.2 (not 0.4 or 0.7). Lower temperature = more faithful extraction = less hallucination.

7. **Template fonts**: Each PDF template uses different font constants. Check the file before replacing — `'Inter'` for minimalist/modern/executive/photo, `'Lora'` for classic.

8. **Backward compat**: Old resumes stored with `bullets: string[]` and no `type` or `items` fields will still render. The template renderer checks `sec.items` first, falls back to `sec.bullets`.

9. **Do NOT change `store.tsx`**: The `addResume` function already handles the Resume type. Adding `template` to the data is just another field — no store changes needed.

10. **Do NOT change `parse-resume` route**: The existing PDF upload flow is unchanged. It still returns `bullets` format for custom sections. The new `items` format only comes from the chat extraction API.

11. **Progress detection is heuristic**: The `BUILD_SECTIONS` keyword scanner runs on every render when in build mode. It scans USER messages only (not assistant). It's intentionally simple — false positives (e.g., user says "I worked at" → Experience lights up even though they haven't given details) are fine. The goal is to give the user a sense of progress, not perfect tracking.

12. **`BUILD_SECTIONS` must be outside CustomInputBar**: The `BUILD_SECTIONS` constant and `coveredSectionsRef` are defined in the `ChatView` component body. Inside `CustomInputBar`, reference them via `coveredSectionsRef.current`. The constant itself is stable (defined with `as const` at component level), so it can be referenced directly inside `useCallback([])`.

13. **buildData persisted in sessionStorage**: Key is `'jfs-build-data'`. Set in a `useEffect` whenever `buildData` changes. Cleared on save, on escape, and on new chat. On mount, `useState` initializer reads from sessionStorage so build mode survives refresh.

14. **Save button guardrail**: The Save button checks `coveredSectionsRef.current.has('experience')`. Until the user mentions job/company/work keywords, the button is disabled with a tooltip explaining why. This prevents extracting a nearly-empty resume.

15. **Transport sends buildRole + buildIndustry**: The transport body includes `buildRole` and `buildIndustry` (read from `buildDataRef.current`). These are passed to the chat API and injected into the build system prompt so the AI knows the target role from the very first message.

---

## Summary of All Changes

| File | Action | Key Change |
|------|--------|-----------|
| `app/types/resume.ts` | Edit | Add `CustomSectionItem`, `CustomSectionType`, update `ResumeCustomSection` |
| `app/lib/company-data.ts` | Edit | Add `template` param + `ResumeTemplate` import |
| `app/components/chat/build-wizard.tsx` | Rewrite | 2-step: template gallery + role/industry input |
| `app/components/chat/chat-view.tsx` | Edit | Build mode state + refs, banner with progress dots + Save + Manual, fixed transport closure |
| `app/api/chat/route.ts` | Edit | Accept `mode`, build-mode system prompt (no save promises) |
| `app/api/resume/from-chat/route.ts` | **NEW** | Extraction API (temp 0.2, no hallucination) |
| `app/components/resume/templates/*.pdf.tsx` (×5) | Edit | New custom section item rendering + backward compat |
| `app/components/resume/resume-detail.tsx` | Edit | Custom section editor supports items + bullets |
