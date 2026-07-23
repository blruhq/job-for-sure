# PLAN: Inject Upload Cards as a Chat Message

## Problem

The resume card + job cards currently render via `bottomContent` — which is always glued to the BOTTOM of the message list. When the user sends a new chat message, it appears ABOVE the cards. The cards should stay frozen at their upload position, with new chat flowing BELOW them.

## Solution

Instead of `bottomContent`, inject the upload cards as a **synthetic user message** in the chat stream. The message carries a `data-upload` part with the resumeId. A custom `UserMessage` renderer detects this part and renders the resume card + JobPreview instead of a text bubble. New chat messages naturally appear below.

```
BEFORE (broken):                  AFTER (correct):
┌──────────────────────┐          ┌──────────────────────┐
│ User: Summarize...   │          │ 📄 [Resume Card]      │ ← message #1 (frozen)
│ AI: Here's a summary │          │ [Job 1] [Job 2] ...   │
│ ─────────────────── │          │ ──────────────────── │
│ [Resume Card]        │ ← glued  │ User: Summarize...    │ ← message #2 (below)
│ [Job Cards]          │   to     │ AI: Here's a summary  │ ← message #3 (below)
└──────────────────────┘ bottom   └──────────────────────┘
```

---

## Architecture

| Decision | Rationale |
|----------|-----------|
| Inject as `role: 'user'` message with `data-upload` part | `groupMessagesIntoTurns` in message-list.tsx only picks up user/assistant roles. Other roles are silently dropped. |
| Custom `UserMessage` slot on AgentChat | AgentChat already supports `slots.UserMessage` override. No changes needed to message-list.tsx or agent-chat.tsx. |
| Include a text part alongside data-upload | The AI SDK sends all messages to the API. A text part ensures the AI receives meaningful content (data parts may be dropped during conversion). |
| Resume data comes from the store (not the message) | The message only carries `resumeId`. The custom renderer looks up the full Resume object from `useAppStore`. This avoids duplicating large data in the message. |
| Keep `bottomContent` only for parsing skeleton | The parsing skeleton shows BEFORE the resume is parsed (no resumeId yet). Once parsed, inject the message and clear bottomContent. |
| Input unlocks after parsing (not after jobs) | Jobs load in the background independently. User can chat while jobs are loading. |

---

## Files Changed

| File | Action |
|------|--------|
| `app/components/chat/upload-card-message.tsx` | **NEW** — Custom UserMessage that renders resume card + JobPreview when it detects a `data-upload` part |
| `app/components/chat/chat-view.tsx` | **EDIT** — Add `setMessages`, inject message on upload, simplify uploadStage, add UserMessage slot, simplify bottomContent |

**No changes** to `job-preview.tsx`, `message-list.tsx`, `agent-chat.tsx`, or `route.ts`.

---

## Step 1: Create `app/components/chat/upload-card-message.tsx`

**CREATE this new file with EXACTLY this content:**

```tsx
'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import type { UIMessage } from 'ai'
import { UserMessage } from '@/components/agent-elements/user-message'
import { useAppStore } from '~/lib/store'
import { JobPreview } from '~/components/chat/job-preview'

type UploadCardMessageProps = {
  message: UIMessage
  className?: string
  enableImagePreview?: boolean
}

export const UploadCardMessage = memo(function UploadCardMessage({
  message,
  className,
  enableImagePreview = true,
}: UploadCardMessageProps) {
  const router = useRouter()
  const resumes = useAppStore((s) => s.resumes)

  // Check for data-upload part
  const uploadPart = (message.parts ?? []).find(
    (p: any) => p.type === 'data-upload'
  ) as { type: 'data-upload'; data: { resumeId: string } } | undefined

  if (uploadPart) {
    const resume = resumes.find((r) => r.id === uploadPart.data.resumeId)
    if (!resume) return null

    return (
      <div className="w-full space-y-3">
        {/* Resume summary card */}
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[13px] font-semibold text-foreground">{resume.persona || 'Your Name'}</span>
            {resume.role && (
              <span className="text-[11px] text-primary">· {resume.role}</span>
            )}
          </div>
          {resume.summary && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{resume.summary}</p>
          )}
          {resume.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {resume.skills.slice(0, 12).map((s, i) => (
                <span key={i} className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">{s}</span>
              ))}
              {resume.skills.length > 12 && (
                <span className="text-[9px] text-muted-foreground">+{resume.skills.length - 12} more</span>
              )}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => router.push(`/resume/${resume.id}`)}
              className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
            >
              View Resume →
            </button>
            <button
              onClick={() => router.push(`/resume/${resume.id}?tab=editor`)}
              className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Edit Resume →
            </button>
          </div>
        </div>
        {/* Job preview — manages its own loading */}
        <JobPreview resume={resume} />
      </div>
    )
  }

  // Normal user message — delegate to default renderer
  return <UserMessage message={message} className={className} enableImagePreview={enableImagePreview} />
})
```

---

## Step 2: Add imports to `chat-view.tsx`

**File:** `app/components/chat/chat-view.tsx`

### 2a. Add UploadCardMessage import

FIND (line 17):
```tsx
import { JobPreview } from '~/components/chat/job-preview'
```

REPLACE with:
```tsx
import { UploadCardMessage } from '~/components/chat/upload-card-message'
```

(JobPreview is no longer imported here — it's used inside upload-card-message.tsx instead)

---

## Step 3: Add `setMessages` to useChat destructure

**File:** `app/components/chat/chat-view.tsx`

FIND (line 75):
```tsx
  const { messages, status, sendMessage, stop } = useChat({ transport, messages: savedMessages })
```

REPLACE with:
```tsx
  const { messages, status, sendMessage, stop, setMessages } = useChat({ transport, messages: savedMessages })
```

---

## Step 4: Simplify uploadStage state

**File:** `app/components/chat/chat-view.tsx`

FIND (lines 26-28):
```tsx
  // Upload flow stages: idle → parsing → jobs-loading → done
  const [uploadStage, setUploadStage] = useState<'idle' | 'parsing' | 'jobs-loading' | 'done'>('idle')
  const [uploadedResume, setUploadedResume] = useState<Resume | null>(null)
```

REPLACE with:
```tsx
  // Upload flow: idle → parsing → idle (card injected as message)
  const [uploadStage, setUploadStage] = useState<'idle' | 'parsing'>('idle')
```

(`uploadedResume` state is REMOVED — the resume is now looked up from the store by the UploadCardMessage component)

---

## Step 5: Add UploadCardMessage to slots

**File:** `app/components/chat/chat-view.tsx`

FIND (line 314):
```tsx
  const slots = useMemo(() => ({ InputBar: CustomInputBar }), [])
```

REPLACE with:
```tsx
  const slots = useMemo(() => ({ InputBar: CustomInputBar, UserMessage: UploadCardMessage }), [])
```

---

## Step 6: Rewrite `handleFileChange` — inject message instead of setting state

**File:** `app/components/chat/chat-view.tsx`

FIND the ENTIRE `handleFileChange` function (lines 118-204, from `// ── UPLOAD RESUME ──` to the closing `}` before `// ── BUILD FROM TEMPLATE WIZARD ──`).

REPLACE the entire function with:

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

      // Inject upload card as a chat message — it stays frozen at this position.
      // New chat messages will naturally appear below it.
      const uploadText = `📎 Resume uploaded: ${resume.persona || 'Unknown'}${resume.role ? ` — ${resume.role}` : ''}`
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        parts: [
          { type: 'data-upload', data: { resumeId: resume.id } },
          { type: 'text', text: uploadText },
        ],
        createdAt: new Date(),
      } as any])

      setUploadStage('idle')
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to process resume. Try Build from Template instead.', type: 'error' })
      setUploadStage('idle')
    }
  }
```

Key changes:
- **No `setUploadedResume`** — removed
- **`setMessages` injects the card as a message** with `data-upload` + `text` parts
- **`setUploadStage('idle')` on success** — not 'jobs-loading' or 'done'
- **Input unlocks immediately after parsing** — jobs load in background

---

## Step 7: Rewrite `handleWizardComplete` — same inject pattern

**File:** `app/components/chat/chat-view.tsx`

FIND the ENTIRE `handleWizardComplete` function (lines 206-236, from `// ── BUILD FROM TEMPLATE WIZARD ──` to the closing `}` before `// ── PASTE JOB DESCRIPTION ──`).

REPLACE the entire function with:

```tsx
  // ── BUILD FROM TEMPLATE WIZARD ──
  const handleWizardComplete = async (data: WizardData) => {
    setUploadStage('parsing')
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

      // Inject upload card as a chat message
      const uploadText = `📎 Resume created: ${resume.persona || 'Unknown'}${resume.role ? ` — ${resume.role}` : ''}`
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        parts: [
          { type: 'data-upload', data: { resumeId: resume.id } },
          { type: 'text', text: uploadText },
        ],
        createdAt: new Date(),
      } as any])

      setUploadStage('idle')
    } catch (err) {
      console.error(err)
      notify({ message: 'Failed to create resume from wizard', type: 'error' })
      setUploadStage('idle')
    }
  }
```

---

## Step 8: Simplify `isUploading`

**File:** `app/components/chat/chat-view.tsx`

FIND (lines 254-257):
```tsx
  // Ref for disabling input during upload flow
  const isUploading = uploadStage === 'parsing' || uploadStage === 'jobs-loading'
  const isUploadingRef = useRef(isUploading)
  isUploadingRef.current = isUploading
```

REPLACE with:
```tsx
  // Ref for disabling input during resume parsing
  const isUploading = uploadStage === 'parsing'
  const isUploadingRef = useRef(isUploading)
  isUploadingRef.current = isUploading
```

---

## Step 9: Simplify `bottomContent` — parsing skeleton ONLY

**File:** `app/components/chat/chat-view.tsx`

FIND the ENTIRE `bottomContent={...}` prop on the AgentChat component (lines 437-538, starting from `bottomContent={` and ending with `}` before `className="h-full chat-fade-in"`).

The block starts with:
```tsx
            bottomContent={
              uploadStage === 'parsing' ? (
```

and ends with:
```tsx
            }
            className="h-full chat-fade-in"
```

REPLACE the ENTIRE `bottomContent={...}` block with:

```tsx
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
              ) : undefined
            }
```

This removes the `jobs-loading` and `done` stages from bottomContent. The resume card + job cards now live in the message stream via UploadCardMessage.

---

## Step 10: Verify no stale references remain

**File:** `app/components/chat/chat-view.tsx`

After all edits, search the file for these strings. If ANY of them appear, the edit is WRONG — go back and fix:

| Search for | Expected result |
|------------|----------------|
| `uploadedResume` | **0 matches** — state was removed |
| `jobs-loading` | **0 matches** — stage was removed |
| `'done'` (in uploadStage context) | **0 matches** — stage was removed |
| `setUploadedResume` | **0 matches** — state was removed |
| `JobPreview` | **0 matches** — moved to upload-card-message.tsx |

---

## Step 11: Verify and commit

Run these commands in order:

```bash
npx tsc --noEmit
pnpm build
```

If BOTH pass:
```bash
git add -A && git commit -m "fix: inject upload cards as chat message so new chat flows below them naturally" && git push
```

If `tsc` or `build` fails, DO NOT commit. Read the error, fix it, re-run.

---

## Summary

| Before | After |
|--------|-------|
| Cards glued to bottom via `bottomContent` | Cards injected as message in conversation stream |
| New chat appears ABOVE cards | New chat appears BELOW cards |
| Input locked during parsing + jobs loading | Input locked only during parsing (2-5s) |
| 3 upload stages (parsing/jobs-loading/done) | 2 upload stages (parsing/idle) |
| `uploadedResume` state in chat-view | Resume looked up from store by UploadCardMessage |
| JobPreview rendered in bottomContent | JobPreview rendered inside UploadCardMessage |

## How It Works (for the other agent's understanding)

```
1. User uploads PDF
   → uploadStage = 'parsing'
   → bottomContent shows skeleton ("Parsing...")
   → InputBar disabled

2. Parse API returns
   → createResume() → addResume() → setActiveResumeId()
   → setMessages() injects: { role: 'user', parts: [{ type: 'data-upload', data: { resumeId } }, { type: 'text', text: '📎 Resume uploaded...' }] }
   → uploadStage = 'idle'
   → bottomContent clears (skeleton disappears)
   → InputBar re-enabled

3. UploadCardMessage renders the injected message
   → Detects data-upload part
   → Finds resume in store by resumeId
   → Renders: resume card + <JobPreview> (which fetches jobs independently)

4. User types "Summarize my resume"
   → New user message added to messages array
   → Appears BELOW the upload card message (natural conversation order)
   → AI responds below that

5. User uploads SECOND resume
   → Another data-upload message injected at the bottom
   → Both card sets stay visible in their respective positions
```
