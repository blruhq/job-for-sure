# PLAN: Fix Upload Flow (A) + Chat AI Context (B)

## Problem Summary
1. **Upload shows no feedback** — no skeleton, no inline jobs, input not locked
2. **AI chat is blind** — receives zero resume context, can't see experience/projects/education
3. **JobPreview is orphaned** — 329-line component never imported or rendered
4. **Client hardcodes role** — `parsed.role || 'Software Engineer'` still in client code

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Use `bottomContent` on AgentChat | Renders inline at end of message list, scrolls with content (message-list.tsx L630) |
| Use `DefaultChatTransport` for context | Sends `body` with EVERY request automatically, no per-call changes needed |
| Stage-based state machine | Clear phases: parsing → jobs-loading → done |
| Refs for stable callbacks | Transport and InputBar use `useCallback([], [])` — need refs for current values |
| `onLoadComplete` callback on JobPreview | Chat needs to know when jobs are done to unlock input |

---

## Step 1: Add `onLoadComplete` callback to JobPreview

**File:** `app/components/chat/job-preview.tsx`

### 1a. Change the props signature

FIND (line 37):
```tsx
export function JobPreview({ resume, onDismiss }: { resume: Resume; onDismiss?: () => void }) {
```

REPLACE with:
```tsx
export function JobPreview({ resume, onDismiss, onLoadComplete }: { resume: Resume; onDismiss?: () => void; onLoadComplete?: () => void }) {
```

### 1b. Add effect to fire callback when loading finishes

FIND (line 75):
```
  useEffect(() => {
    fetchJobs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
```

INSERT AFTER it:
```tsx

  // Notify parent when loading completes (success or error)
  const onLoadCompleteRef = useRef(onLoadComplete)
  onLoadCompleteRef.current = onLoadComplete
  useEffect(() => {
    if (!loading) {
      onLoadCompleteRef.current?.()
    }
  }, [loading])
```

### 1c. Add `useRef` to imports

FIND (line 3):
```tsx
import { useState, useEffect, useCallback } from 'react'
```

REPLACE with:
```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
```

---

## Step 2: Add DefaultChatTransport import + activeResume ref

**File:** `app/components/chat/chat-view.tsx`

### 2a. Add import for DefaultChatTransport

FIND (line 5):
```tsx
import { useChat } from '@ai-sdk/react'
```

REPLACE with:
```tsx
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
```

### 2b. Add import for JobPreview

FIND (line 13):
```tsx
import { PasteJDModal } from '~/components/chat/paste-jd-modal'
```

INSERT AFTER it:
```tsx
import { JobPreview } from '~/components/chat/job-preview'
```

### 2c. Add activeResume ref + transport

FIND (line 38):
```tsx
  const { messages, status, sendMessage, stop } = useChat({ messages: savedMessages })
```

REPLACE with:
```tsx
  // Ref to always have current activeResume for transport body
  const activeResumeRef = useRef(activeResume)
  activeResumeRef.current = activeResume

  // Transport sends resume context with every chat request
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      body: () => ({
        context: {
          activeResume: activeResumeRef.current
            ? {
                name: activeResumeRef.current.name,
                role: activeResumeRef.current.role,
                persona: activeResumeRef.current.persona,
                email: activeResumeRef.current.email,
                phone: activeResumeRef.current.phone,
                location: activeResumeRef.current.location,
                github: activeResumeRef.current.github,
                summary: activeResumeRef.current.summary,
                skills: activeResumeRef.current.skills,
                experience: activeResumeRef.current.experience,
                education: activeResumeRef.current.education,
                projects: activeResumeRef.current.projects,
                certifications: activeResumeRef.current.certifications,
                languages: activeResumeRef.current.languages,
                customSections: activeResumeRef.current.customSections,
              }
            : null,
        },
      }),
    })
  }, [])

  const { messages, status, sendMessage, stop, setMessages } = useChat({ transport, messages: savedMessages })
```

---

## Step 3: Add upload stage state

**File:** `app/components/chat/chat-view.tsx`

FIND (line 23):
```tsx
  const [processing, setProcessing] = useState(false)
```

REPLACE with:
```tsx
  const [processing, setProcessing] = useState(false)
  // Upload flow stages: idle → parsing → jobs-loading → done
  const [uploadStage, setUploadStage] = useState<'idle' | 'parsing' | 'jobs-loading' | 'done'>('idle')
  const [uploadedResume, setUploadedResume] = useState<Resume | null>(null)
```

Also add `Resume` type import. FIND (line 12):
```tsx
import { BuildWizard, type WizardData } from '~/components/chat/build-wizard'
```

INSERT BEFORE it:
```tsx
import type { Resume } from '~/types/resume'
```

---

## Step 4: Rewrite `handleFileChange` — no AI call, stage-based

**File:** `app/components/chat/chat-view.tsx`

FIND the ENTIRE `handleFileChange` function (lines 82-163) and REPLACE the whole thing with:

```tsx
  // ── UPLOAD RESUME ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Size limit: 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      notify({ message: 'File too large. Maximum size is 5MB.', type: 'error' })
      return
    }

    setUploadStage('parsing')
    setUploadedResume(null)
    try {
      // Send file to server — server handles text extraction + AI parsing
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to parse resume')
      }
      const parsed = await res.json()

      // Create resume from parsed data — no role fallback fabrication
      const resume = createResume({
        name: file.name.replace(/\.(pdf|docx|txt|md)$/i, ''),
        role: parsed.role || '',
        persona: parsed.name || 'Your Name',
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        github: parsed.github,
        summary: parsed.summary,
        skills: parsed.skills?.length > 0 ? parsed.skills : [],
        experience: parsed.experience?.map((e: any) => ({
          company: e.company || '',
          role: e.role || '',
          dates: e.dates || '',
          bullets: e.bullets || [],
        })),
        education: parsed.education?.map((e: any) => ({
          institution: e.institution || '',
          degree: e.degree || '',
          field: e.field || '',
          dates: e.dates || '',
        })),
        projects: parsed.projects?.map((p: any) => ({
          name: p.name || '',
          description: p.description || '',
          techStack: p.techStack || [],
          link: p.link || '',
        })),
        certifications: parsed.certifications?.map((c: any) => ({
          name: c.name || '',
          issuer: c.issuer || '',
          date: c.date || '',
        })),
        languages: parsed.languages?.map((l: any) => ({
          name: l.name || '',
          proficiency: l.proficiency || '',
        })),
        customSections: parsed.customSections?.map((cs: any) => ({
          title: cs.title || '',
          bullets: cs.bullets || [],
        })),
      })

      addResume(resume)
      setActiveResumeId(resume.id)
      setUploadedResume(resume)
      setUploadStage('jobs-loading')
      // JobPreview will auto-fetch jobs on mount.
      // When done, onLoadComplete fires → stage becomes 'done' → input unlocks.
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to process resume. Try Build from Template instead.', type: 'error' })
      setUploadStage('idle')
    }
  }
```

Key changes:
- **No `sendMessage` call** — no AI call during upload
- **No `setProcessing`** — uses `setUploadStage` instead
- **`role: parsed.role || ''`** — empty string, NOT `'Software Engineer'`
- **`skills: parsed.skills?.length > 0 ? parsed.skills : []`** — empty array, NOT `['JavaScript', 'Git']`
- **`setActiveResumeId(resume.id)`** — makes the new resume the active profile immediately

---

## Step 5: Rewrite `handleWizardComplete` — same pattern

**File:** `app/components/chat/chat-view.tsx`

FIND the ENTIRE `handleWizardComplete` function (lines 166-193) and REPLACE with:

```tsx
  // ── BUILD FROM TEMPLATE WIZARD ──
  const handleWizardComplete = async (data: WizardData) => {
    setUploadStage('parsing')
    setUploadedResume(null)
    try {
      const resume = createResume({
        name: data.role,
        role: data.role,
        persona: data.name,
        email: data.email,
        location: data.location,
        summary: data.summary || `Professional with experience in ${data.skills.slice(0, 3).join(', ')}.`,
        skills: data.skills,
        experience: [{
          company: data.company,
          role: data.companyRole || data.role,
          dates: data.dates,
          bullets: data.bullets.split('\n').filter(Boolean),
        }],
      })

      addResume(resume)
      setActiveResumeId(resume.id)
      setUploadedResume(resume)
      setUploadStage('jobs-loading')
    } catch (err) {
      console.error(err)
      notify({ message: 'Failed to create resume from wizard', type: 'error' })
      setUploadStage('idle')
    }
  }
```

Key changes:
- **No `sendMessage` call**
- **No `setProcessing`**

---

## Step 6: Update `handlePasteJD` — remove `processing` dependency

**File:** `app/components/chat/chat-view.tsx`

The existing `handlePasteJD` (lines 196-203) does not use `processing` or `sendMessage` with resume context injection, so it works fine as-is. **No changes needed.**

---

## Step 7: Add refs for InputBar disabled state

**File:** `app/components/chat/chat-view.tsx`

FIND (line 208-209):
```tsx
  const showPillBar = messages.length > 0
  const showPillBarRef = useRef(false)
  showPillBarRef.current = showPillBar
```

INSERT AFTER it:
```tsx

  // Ref for disabling input during upload flow
  const isUploading = uploadStage === 'parsing' || uploadStage === 'jobs-loading'
  const isUploadingRef = useRef(isUploading)
  isUploadingRef.current = isUploading
```

---

## Step 8: Disable InputBar during upload

**File:** `app/components/chat/chat-view.tsx`

FIND the `<InputBar` inside `CustomInputBar` (around line 249):
```tsx
        <InputBar
          {...inputBarProps}
          leftActions={
```

REPLACE with:
```tsx
        <InputBar
          {...inputBarProps}
          disabled={isUploadingRef.current}
          leftActions={
```

---

## Step 9: Wire up `bottomContent` with upload flow

**File:** `app/components/chat/chat-view.tsx`

### 9a. Build the bottomContent

FIND the `<AgentChat` component (around line 390):
```tsx
          <AgentChat
            messages={messages}
            status={status}
            onSend={handleSend}
            onStop={stop}
            slots={slots}
            suggestions={[
              { id: 'upload', label: '📎 Upload resume', value: 'I want to upload my resume' },
              { id: 'find-jobs', label: 'Find matching jobs', value: 'Find matching jobs for my resume' },
              { id: 'interview', label: 'Interview prep', value: 'Help me prepare for an interview' },
              { id: 'salary', label: 'Salary advice', value: 'Give me salary advice for my role' },
              { id: 'score', label: 'Score my resume', value: 'Can you score my resume and tell me how to improve it?' },
            ]}
            className="h-full chat-fade-in"
          />
```

REPLACE with:
```tsx
          <AgentChat
            messages={messages}
            status={status}
            onSend={handleSend}
            onStop={stop}
            slots={slots}
            suggestions={[
              { id: 'upload', label: '📎 Upload resume', value: 'I want to upload my resume' },
              { id: 'find-jobs', label: 'Find matching jobs', value: 'Find matching jobs for my resume' },
              { id: 'interview', label: 'Interview prep', value: 'Help me prepare for an interview' },
              { id: 'salary', label: 'Salary advice', value: 'Give me salary advice for my role' },
              { id: 'score', label: 'Score my resume', value: 'Can you score my resume and tell me how to improve it?' },
            ]}
            bottomContent={
              uploadStage === 'parsing' ? (
                <div className="mx-auto max-w-an w-full px-4 py-3">
                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={12} className="animate-spin text-primary" />
                      <span className="font-mono text-[11px]">Parsing your resume…</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-2.5 w-4/5" />
                      <Skeleton className="h-2.5 w-2/5" />
                    </div>
                  </div>
                </div>
              ) : uploadStage === 'jobs-loading' && uploadedResume ? (
                <div className="mx-auto max-w-an w-full px-4 py-3 space-y-3">
                  {/* Resume summary card */}
                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[13px] font-semibold text-foreground">{uploadedResume.persona || 'Your Name'}</span>
                      {uploadedResume.role && (
                        <span className="text-[11px] text-primary">· {uploadedResume.role}</span>
                      )}
                    </div>
                    {uploadedResume.summary && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{uploadedResume.summary}</p>
                    )}
                    {uploadedResume.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {uploadedResume.skills.slice(0, 12).map((s, i) => (
                          <span key={i} className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">{s}</span>
                        ))}
                        {uploadedResume.skills.length > 12 && (
                          <span className="text-[9px] text-muted-foreground">+{uploadedResume.skills.length - 12} more</span>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/resume/${uploadedResume.id}`)}
                        className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                      >
                        View Resume →
                      </button>
                      <button
                        onClick={() => router.push(`/resume/${uploadedResume.id}?tab=editor`)}
                        className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Edit Resume →
                      </button>
                    </div>
                  </div>
                  {/* Job preview (shows its own loading then jobs) */}
                  <JobPreview
                    resume={uploadedResume}
                    onLoadComplete={() => setUploadStage('done')}
                  />
                </div>
              ) : uploadStage === 'done' && uploadedResume ? (
                <div className="mx-auto max-w-an w-full px-4 py-3 space-y-3">
                  {/* Resume summary card stays visible */}
                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[13px] font-semibold text-foreground">{uploadedResume.persona || 'Your Name'}</span>
                      {uploadedResume.role && (
                        <span className="text-[11px] text-primary">· {uploadedResume.role}</span>
                      )}
                    </div>
                    {uploadedResume.summary && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{uploadedResume.summary}</p>
                    )}
                    {uploadedResume.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {uploadedResume.skills.slice(0, 12).map((s, i) => (
                          <span key={i} className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">{s}</span>
                        ))}
                        {uploadedResume.skills.length > 12 && (
                          <span className="text-[9px] text-muted-foreground">+{uploadedResume.skills.length - 12} more</span>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/resume/${uploadedResume.id}`)}
                        className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                      >
                        View Resume →
                      </button>
                      <button
                        onClick={() => router.push(`/resume/${uploadedResume.id}?tab=editor`)}
                        className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Edit Resume →
                      </button>
                    </div>
                  </div>
                  {/* Job preview stays visible with results */}
                  <JobPreview resume={uploadedResume} />
                </div>
              ) : undefined
            }
            className="h-full chat-fade-in"
          />
```

---

## Step 10: Replace the skeleton conditional with always-render AgentChat

**File:** `app/components/chat/chat-view.tsx`

FIND the skeleton/AgentChat conditional (around lines 374-406):
```tsx
      <div className="flex-1 overflow-hidden">
        {processing && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="w-full max-w-[680px] space-y-3 animate-fade-up">
              <SkeletonChatMessage />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={10} className="animate-spin text-primary" />
                <span className="font-mono text-[10px]">AI is analyzing your resume…</span>
              </div>
            </div>
          </div>
        ) : (
          <AgentChat
```

This entire conditional needs to be replaced. The AgentChat should ALWAYS render (the bottomContent handles the upload flow).

FIND:
```tsx
        {processing && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="w-full max-w-[680px] space-y-3 animate-fade-up">
              <SkeletonChatMessage />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={10} className="animate-spin text-primary" />
                <span className="font-mono text-[10px]">AI is analyzing your resume…</span>
              </div>
            </div>
          </div>
        ) : (
          <AgentChat
```

REPLACE with:
```tsx
          <AgentChat
```

And find the matching closing of the ternary. FIND:
```tsx
            className="h-full chat-fade-in"
          />
        )}
      </div>
```

REPLACE with:
```tsx
            className="h-full chat-fade-in"
          />
      </div>
```

(Just remove the `)}` that closes the ternary)

### 10a. Update showEntryCards

FIND (around line 268):
```tsx
  const showEntryCards = messages.length === 0 && !processing
```

REPLACE with:
```tsx
  const showEntryCards = messages.length === 0 && uploadStage === 'idle'
```

---

## Step 11: Add Skeleton import

**File:** `app/components/chat/chat-view.tsx`

FIND (line 14):
```tsx
import { SkeletonChatMessage, SkeletonCard } from '~/components/ui/skeleton'
```

REPLACE with:
```tsx
import { Skeleton } from '~/components/ui/skeleton'
```

(We no longer use `SkeletonChatMessage` or `SkeletonCard` — the upload skeleton is custom HTML using `<Skeleton>` directly)

---

## Step 12: Expand the chat API system prompt — Fix B

**File:** `app/api/chat/route.ts`

FIND the entire system prompt block (lines 30-57):
```tsx
  const systemPrompt = `You are Job For Sure — an AI career coach embedded in a job search app.

Your capabilities:
- Analyze resumes and give specific, actionable feedback
- Suggest improvements to skills, summary, and experience descriptions
- Tailor resumes for specific job descriptions
- Provide interview preparation advice
- Give salary negotiation guidance
- Help users decide which roles to target

${context?.activeResume ? `
The user's active resume profile:
- Display Name: ${context.activeResume.name}
- Target Role: ${context.activeResume.role}
- Candidate Name: ${context.activeResume.persona}
- Skills: ${context.activeResume.skills?.join(', ') || 'None listed'}
- Summary: ${context.activeResume.summary || 'Not provided'}
` : ''}

Rules:
- Be concise and direct. No fluff.
- Use markdown formatting (bold, lists) for readability.
- Reference the user's skills and experience from the conversation.
- For salary advice, give specific bands and negotiation tips.
- For interview prep, give specific questions based on their skills.
- If the user shares their resume details, remember them for the conversation.
- Keep responses under 200 words unless the user asks for detail.
- Respond in the same language the user uses to chat with you (e.g., if they write in Thai, reply in Thai. If they write in English, reply in English). Never switch languages mid-conversation unless the user explicitly asks you to translate something.`
```

REPLACE with:
```tsx
  // ── Build full resume context string ──
  const r = context?.activeResume
  const resumeContext = r ? `
The user's FULL resume data (use this for ALL questions about their resume):

## Personal Info
- Name: ${r.persona || 'Not specified'}
- Target Role: ${r.role || 'Not specified'}
- Location: ${r.location || 'Not specified'}
- Email: ${r.email || 'N/A'}
- Phone: ${r.phone || 'N/A'}
- GitHub/Portfolio: ${r.github || 'N/A'}

## Professional Summary
${r.summary || 'Not provided'}

## Skills
${r.skills?.join(', ') || 'None listed'}

## Work Experience
${r.experience?.map((exp: any, i: number) => `${i + 1}. ${exp.role || 'Unknown Role'} at ${exp.company || 'Unknown Company'} (${exp.dates || 'N/A'})
${exp.bullets?.map((b: string) => `   - ${b}`).join('\n') || '   (No details)'}`).join('\n\n') || 'None listed'}

## Education
${r.education?.map((edu: any) => `- ${edu.degree || ''} ${edu.field || ''}, ${edu.institution || ''} (${edu.dates || 'N/A'})`).join('\n') || 'None listed'}

## Projects
${r.projects?.map((p: any, i: number) => `${i + 1}. ${p.name || 'Untitled'}${p.link ? ` (${p.link})` : ''}
   ${p.description || 'No description'}
   Tech: ${p.techStack?.join(', ') || 'N/A'}`).join('\n\n') || 'None listed'}

## Certifications
${r.certifications?.map((c: any) => `- ${c.name || ''} — ${c.issuer || ''} (${c.date || 'N/A'})`).join('\n') || 'None listed'}

## Languages
${r.languages?.map((l: any) => `- ${l.name || ''} (${l.proficiency || ''})`).join('\n') || 'None listed'}

## Additional Sections
${r.customSections?.map((s: any) => `### ${s.title}\n${s.bullets?.map((b: string) => `- ${b}`).join('\n') || '(empty)'}`).join('\n\n') || 'None'}
` : ''

  const systemPrompt = `You are Job For Sure — an AI career coach embedded in a job search app.

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

---

## Step 13: Remove unused imports

**File:** `app/components/chat/chat-view.tsx`

After all changes, the following imports are no longer used and MUST be removed:

- `SkeletonChatMessage` — no longer used (was in the old skeleton conditional)
- `SkeletonCard` — no longer used

The import line should now read:
```tsx
import { Skeleton } from '~/components/ui/skeleton'
```

Also check if `processing` state is still used anywhere. If the only references were in the old skeleton conditional and `showEntryCards`, remove the `processing` state entirely. Search for `processing` and `setProcessing` — if zero usages remain, remove the declaration:
```tsx
const [processing, setProcessing] = useState(false)  // ← DELETE THIS LINE if unused
```

---

## Step 14: Verify and commit

Run these commands in order:

```bash
npx tsc --noEmit
pnpm build
git add -A && git commit -m "fix: redesign upload flow with inline skeleton+jobs, pass full resume context to AI chat"
git push
```

If `tsc` or `build` fails, DO NOT commit. Read the error, fix it, re-run.

---

## Summary of Changes

| File | What Changes |
|------|-------------|
| `app/components/chat/job-preview.tsx` | Add `onLoadComplete` callback + `useRef` import |
| `app/components/chat/chat-view.tsx` | New state (uploadStage, uploadedResume), transport with resume context, rewrite handleFileChange + handleWizardComplete (no AI call), bottomContent with skeleton→resume card→JobPreview, disable input during upload, always render AgentChat, remove old skeleton conditional, fix role fallback |
| `app/api/chat/route.ts` | Expand system prompt with FULL resume data (experience, projects, education, certifications, languages, custom sections) |

## What This Fixes

| Before | After |
|--------|-------|
| Upload is silent for 10 seconds | Inline skeleton "Parsing your resume…" appears instantly |
| No job cards shown after upload | JobPreview renders 5 inline job cards |
 | Input active during upload | Input disabled until jobs loaded |
| AI sees 5 fields (name, role, skills, summary, location) | AI sees FULL resume (all sections, all details) |
| Client hardcodes `'Software Engineer'` fallback | Client passes empty string if parser returns empty |
| `sendMessage` fires AI call automatically | No AI call during upload — user asks when ready |
| `context.activeResume` always undefined on server | Transport sends `activeResume` with every request |
