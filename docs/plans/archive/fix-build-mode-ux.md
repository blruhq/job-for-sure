# UX Fix Plan: AI-Guided Resume Builder — Flow Overhaul (v2)

> **For the execution agent:** Follow EVERY step in order. Do NOT skip steps. Do NOT make up your own implementation. Every file path, import, function name, and type is specified exactly. Copy-paste the code blocks. Read the ENTIRE file before editing it.

## What This Plan Fixes

The build flow was implemented but has **3 functional bugs** and **8 UX issues**. This plan fixes all of them AND adds AI-driven progress tracking.

---

## Issues Being Fixed

| # | Type | Issue | Fix |
|---|------|-------|-----|
| 1 | BUG | `handleSend` appends target company context during build mode | Skip context injection when `buildDataRef.current` is set |
| 2 | BUG | PostHog CSP blocks `us-assets.i.posthog.com` in `connect-src` | Add domain to CSP `connect-src` |
| 3 | BUG | AgentChat suggestions shown during build mode (irrelevant) | Pass `[]` when in build mode |
| 4 | UX | Entry card says "Build from Template" — misleading | Change to "Build with AI" |
| 5 | UX | "Manual" escape hatch creates BLANK resume, destroys conversation data, no explanation | Extract partial data, show confirm dialog, toast on redirect |
| 6 | UX | Status bar (Profile/Target dropdowns) visible during build mode | Hide status bar when `buildData` is set |
| 7 | UX | "New Chat" during build mode silently destroys build state | Show confirm dialog |
| 8 | UX | Pill bar button says "Build Template" | Change to "Build with AI" |
| 9 | UX | Save button gate uses client-side keyword matching (false positives) | Always enabled |
| 10 | UX | **No progress indicator during build conversation** — user doesn't know what step they're on or how much is left | **AI-driven progress marker** (Option B) |
| 11 | UX | Banner shows template name (irrelevant info) | Show role · industry only |

---

## Architecture: AI-Driven Progress Tracking (Option B)

```
AI system prompt instructs the AI to append a progress marker
at the end of EVERY response:

    <!--jfs-progress:STEP-->

Where STEP is one of:
  - experience    (asking about work history)
  - education     (asking about education)
  - skills        (asking about skills)
  - summary       (offering to write summary)
  - complete      (user finished all sections)

Client parses the LAST assistant message after streaming completes,
extracts the step, and updates the progress indicator in the banner.

The marker is an HTML comment — invisible in markdown rendering.
User never sees it in the chat. The client strips nothing — it just
parses and leaves the comment in place (already invisible).

Progress display in banner:
  ✓ Experience  → Education  ○ Skills  ○ Summary

When complete:
  ✓ Experience  ✓ Education  ✓ Skills  ✓ Summary — Ready to save!
```

---

## Files to Modify

| File | Change |
|------|--------|
| `app/components/chat/build-wizard.tsx` | Already has 2-step wizard (template + role). Keep as-is. |
| `app/api/chat/route.ts` | Add progress marker instructions to build system prompt |
| `app/components/chat/chat-view.tsx` | All fixes: progress state, hide UI in build mode, fix escape hatch, fix labels, add confirm dialogs |
| `next.config.ts` | Add `us-assets.i.posthog.com` to CSP `connect-src` |

---

## Step 1: Keep BuildWizard As-Is (2-step: template + role)

### File: `app/components/chat/build-wizard.tsx`

**DO NOT CHANGE THIS FILE.** The current wizard already has:
- Step 1: Template gallery picker
- Step 2: Role + industry input

This is correct. The user wants template selection available upfront. No edits needed.

---

## Step 2: Add Progress Marker Instructions to Chat API

### File: `app/api/chat/route.ts`

Find the build system prompt string (starts with `` `You are Job For Sure — an AI resume building assistant. ``).

Find the line that says:

```
- Respond in the same language the user uses.`
```

This is the LAST line of the build prompt (right before the closing backtick).

Insert IMMEDIATELY BEFORE that last line:

```
## PROGRESS TRACKING (MANDATORY — DO NOT SKIP)
At the very END of EVERY response, append this exact HTML comment on its own line:
<!--jfs-progress:STEP-->
Where STEP is your current topic:
- "experience" — currently asking about or discussing work history
- "education" — currently asking about or discussing education
- "skills" — currently asking about or discussing skills
- "summary" — offering to write or discussing the professional summary
- "complete" — the user has covered all sections and should click Save Resume

Example end of response: "Got it! Now let's talk about your education.\n<!--jfs-progress:education-->"
NEVER forget this marker. It MUST appear on EVERY response, including the first one.
```

So the final lines of the build prompt become:

```
- When they finish a section, briefly acknowledge and move to the next: "Got it. Now let's talk about..."
- If they want to skip a section, let them. Say "No problem, we can add it later."
- If they say "done" or "finished" or "that's everything", say: "Great! Whenever you're ready, click **Save Resume** in the bar above to create your resume. You can also tell me what else to add." AND set progress to complete.
- NEVER say "I'll save your resume" or "Let me create your resume" — you CANNOT save. Only the user can save by clicking the button.

## PROGRESS TRACKING (MANDATORY — DO NOT SKIP)
At the very END of EVERY response, append this exact HTML comment on its own line:
<!--jfs-progress:STEP-->
Where STEP is your current topic:
- "experience" — currently asking about or discussing work history
- "education" — currently asking about or discussing education
- "skills" — currently asking about or discussing skills
- "summary" — offering to write or discussing the professional summary
- "complete" — the user has covered all sections and should click Save Resume

Example end of response: "Got it! Now let's talk about your education.\n<!--jfs-progress:education-->"
NEVER forget this marker. It MUST appear on EVERY response, including the first one.

- Respond in the same language the user uses.`
```

---

## Step 3: All ChatView Fixes

### File: `app/components/chat/chat-view.tsx`

This has many sub-steps. Follow them ALL precisely.

### 3.1: Add ConfirmDialog import

Find the imports section. Find this line:

```typescript
import { PasteJDModal } from '~/components/chat/paste-jd-modal'
```

Add IMMEDIATELY AFTER it:

```typescript
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
```

### 3.2: Add build progress state

Find the line `const [savingResume, setSavingResume] = useState(false)` (around line 41).

Add IMMEDIATELY AFTER it:

```typescript
  const [showCancelBuildDialog, setShowCancelBuildDialog] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [buildStep, setBuildStep] = useState<string>('experience')
```

### 3.3: Replace BUILD_SECTIONS with fixed step list (no keyword matching)

Find the `BUILD_SECTIONS` constant with keywords (around line 76-84):

OLD:
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

NEW:
```typescript
  // ── BUILD PROGRESS STEPS ──
  // Fixed order. Driven by AI progress marker (<!--jfs-progress:STEP-->),
  // NOT by keyword matching. The AI knows what step it's on.
  const BUILD_STEPS = [
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'summary', label: 'Summary' },
  ] as const
```

### 3.4: Replace covered sections computation with AI marker parser

Find the block after `useChat` that recomputes covered sections (around line 122):

OLD:
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

NEW:
```typescript
  // ── Parse AI progress marker from last assistant message ──
  // The AI appends <!--jfs-progress:STEP--> to every response.
  // We scan the last assistant message (after streaming completes)
  // and update the progress indicator.
  useEffect(() => {
    if (!buildDataRef.current) return
    if (status === 'streaming' || status === 'submitted') return
    // Find the last assistant message
    const lastAssistant = [...messages].reverse().find((m: any) => m.role === 'assistant')
    if (!lastAssistant) return
    const text = lastAssistant.parts?.map((p: any) => p.text || '').join('') || ''
    // Match ALL progress markers, take the LAST one (in case AI included multiple)
    const matches = text.matchAll(/<!--jfs-progress:(\w+)-->/g)
    const matchesArray = Array.from(matches)
    if (matchesArray.length > 0) {
      const step = matchesArray[matchesArray.length - 1][1]
      if (['experience', 'education', 'skills', 'summary', 'complete'].includes(step)) {
        setBuildStep(step)
      }
    }
  }, [messages, status])
```

### 3.5: Fix handleSend — skip target company context in build mode

Find the `handleSend` function (around line 170):

OLD:
```typescript
  const handleSend = (message: { role: 'user'; content: string }) => {
    let content = message.content
    if (targetCompanyKey !== 'none') {
```

NEW:
```typescript
  const handleSend = (message: { role: 'user'; content: string }) => {
    let content = message.content
    // Only append target company context in coach mode (not build mode)
    if (targetCompanyKey !== 'none' && !buildDataRef.current) {
```

### 3.6: Fix handleNewChat — confirm before canceling build

Find the `handleNewChat` function (around line 154):

OLD:
```typescript
  const handleNewChat = useCallback(() => {
    sessionStorage.removeItem('jfs-chat-messages')
    sessionStorage.removeItem('jfs-build-data')
    buildDataRef.current = null
    window.location.reload()
  }, [])
```

NEW:
```typescript
  const handleNewChat = useCallback(() => {
    // If in build mode, show confirm dialog instead of immediately clearing
    if (buildDataRef.current) {
      setShowCancelBuildDialog(true)
      return
    }
    sessionStorage.removeItem('jfs-chat-messages')
    sessionStorage.removeItem('jfs-build-data')
    window.location.reload()
  }, [])

  const handleConfirmCancelBuild = useCallback(() => {
    sessionStorage.removeItem('jfs-chat-messages')
    sessionStorage.removeItem('jfs-build-data')
    buildDataRef.current = null
    setShowCancelBuildDialog(false)
    window.location.reload()
  }, [])
```

### 3.7: Fix escape hatch — confirm dialog + extract partial data

Find the `handleSwitchToManual` function (around line 378).

Replace the ENTIRE function AND its ref line with:

```typescript
  // ── ESCAPE HATCH: Extract partial data, then open editor ──
  const handleSwitchToManual = useCallback(async () => {
    if (!buildDataRef.current) return
    setShowManualDialog(false)

    // If there are enough messages, try to extract partial data
    const userMessages = messages.filter((m: any) => m.role === 'user')
    if (userMessages.length >= 2) {
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

        if (res.ok) {
          const parsed = await res.json()
          const resume = createResume({
            name: `${buildDataRef.current.role} Resume`,
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

          buildDataRef.current = null
          setBuildData(null)
          sessionStorage.removeItem('jfs-build-data')

          notify({ message: 'Opened your resume in the editor', type: 'info' })
          router.push(`/resume/${resume.id}`)
          return
        }
      } catch {
        // Extraction failed — fall through to blank resume
      }
    }

    // Not enough data or extraction failed — create blank resume
    const resume = createResume({
      name: `${buildDataRef.current.role} Resume`,
      role: buildDataRef.current.role,
      persona: 'Your Name',
      skills: [],
      template: buildDataRef.current.template,
    })

    addResume(resume)
    setActiveResumeId(resume.id)

    buildDataRef.current = null
    setBuildData(null)
    sessionStorage.removeItem('jfs-build-data')

    notify({ message: 'Opened blank resume in editor', type: 'info' })
    router.push(`/resume/${resume.id}`)
  }, [messages, addResume, setActiveResumeId, router])

  const handleSwitchToManualRef = useRef(handleSwitchToManual)
  handleSwitchToManualRef.current = handleSwitchToManual
```

### 3.8: Rewrite CustomInputBar build banner

Inside the `CustomInputBar` useCallback (around line 428), find the ENTIRE build banner block.

Find this block:

OLD:
```typescript
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
```

NEW:
```typescript
        {/* ── Build mode banner ── */}
        {building && (
          <BuildBanner
            role={building.role}
            industry={building.industry}
            saving={saving}
            buildStep={buildStepRef.current}
            onSave={() => handleSaveResumeRef.current()}
            onManual={() => setShowManualDialogRef.current(true)}
          />
        )}
```

**Wait — `buildStepRef` and `setShowManualDialogRef` don't exist yet inside the `useCallback([])`. We need refs for them.**

**REVISED APPROACH:** Since the `CustomInputBar` has `useCallback([])` deps, we can't access `buildStep` state directly. But we CAN access it through a ref. And `setShowManualDialog` is a state setter which is stable, so we can use it directly inside the callback.

**Actually, state setters from `useState` ARE stable and can be used inside `useCallback([])`.** So `setShowManualDialog` can be called directly. Only `buildStep` (the value) needs a ref.

**Here is the CORRECTED replacement for the build banner block:**

OLD: (same block as above — the entire `{building && (...)}` block)

NEW:
```typescript
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
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setShowManualDialog(true)}
                  className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  title="Open what you have so far in the editor"
                >
                  <Pencil size={10} /> Edit Manually
                </button>
                <button
                  onClick={() => handleSaveResumeRef.current()}
                  disabled={saving}
                  className="flex cursor-pointer items-center gap-1 rounded-xs bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Save your resume"
                >
                  <Save size={10} /> {saving ? 'Saving...' : 'Save Resume'}
                </button>
              </div>
            </div>
            {/* Row 2: AI-driven progress steps */}
            <div className="mx-auto mt-1.5 flex max-w-an items-center gap-2.5">
              {BUILD_STEPS.map((s, i) => {
                const stepIndex = BUILD_STEPS.findIndex(x => x.id === buildStepRef.current)
                const isComplete = buildStepRef.current === 'complete'
                const done = isComplete || (stepIndex > -1 && i < stepIndex)
                const current = !isComplete && stepIndex === i
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      done ? 'bg-success' : current ? 'bg-primary' : 'bg-border',
                    )} />
                    <span className={cn(
                      'text-[9px] font-mono transition-colors',
                      done ? 'text-success' : current ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
              {buildStepRef.current === 'complete' && (
                <span className="text-[9px] font-mono text-success ml-1">✓ Ready to save!</span>
              )}
            </div>
          </div>
        )}
```

### 3.9: Add buildStepRef

Find the `savingResumeRef` declaration (around line 72-74):

```typescript
  const savingResumeRef = useRef(false)
  savingResumeRef.current = savingResume
```

Add IMMEDIATELY AFTER it:

```typescript
  // Build step ref — for stable CustomInputBar (useCallback[])
  const buildStepRef = useRef(buildStep)
  buildStepRef.current = buildStep
```

### 3.10: Fix pill bar button label

Inside `CustomInputBar`, find the pill bar button:

OLD:
```typescript
                  <FileText size={11} />
                  Build Template
```

NEW:
```typescript
                  <FileText size={11} />
                  Build with AI
```

### 3.11: Fix entry card label

Find the "Build from Template" entry card (around line 618):

OLD:
```typescript
              <div className="text-sm font-semibold text-foreground">Build from Template</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">No resume? Start here</div>
```

NEW:
```typescript
              <div className="text-sm font-semibold text-foreground">Build with AI</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Answer questions · 5 min</div>
```

### 3.12: Hide status bar during build mode

Find the status bar div. It starts with:

```typescript
      {/* Status bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card px-4 md:px-8 py-2.5 text-[11px]">
```

And ends with `</div>` right before `{/* Entry cards — shown when chat is empty */}`.

Wrap the ENTIRE block in a conditional:

OLD:
```typescript
      {/* Status bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card px-4 md:px-8 py-2.5 text-[11px]">
        ... (entire status bar content stays the same) ...
      </div>
```

NEW:
```typescript
      {/* Status bar — hidden during build mode */}
      {!buildData && (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card px-4 md:px-8 py-2.5 text-[11px]">
        ... (entire status bar content stays the same) ...
      </div>
      )}
```

**How to do this:** Add `{!buildData && (` on the line before the `<div>`, and `)}` on the line after the closing `</div>`. Do NOT change anything inside the status bar div itself.

### 3.13: Hide suggestions during build mode

Find the AgentChat `suggestions` prop (around line 654):

OLD:
```typescript
            suggestions={[
              { id: 'upload', label: '📎 Upload resume', value: 'I want to upload my resume' },
              { id: 'find-jobs', label: 'Find matching jobs', value: 'Find matching jobs for my resume' },
              { id: 'interview', label: 'Interview prep', value: 'Help me prepare for an interview' },
              { id: 'salary', label: 'Salary advice', value: 'Give me salary advice for my role' },
              { id: 'score', label: 'Score my resume', value: 'Can you score my resume and tell me how to improve it?' },
            ]}
```

NEW:
```typescript
            suggestions={buildData ? [] : [
              { id: 'upload', label: '📎 Upload resume', value: 'I want to upload my resume' },
              { id: 'find-jobs', label: 'Find matching jobs', value: 'Find matching jobs for my resume' },
              { id: 'interview', label: 'Interview prep', value: 'Help me prepare for an interview' },
              { id: 'salary', label: 'Salary advice', value: 'Give me salary advice for my role' },
              { id: 'score', label: 'Score my resume', value: 'Can you score my resume and tell me how to improve it?' },
            ]}
```

### 3.14: Add ConfirmDialogs to the JSX

Find the `<PasteJDModal>` near the bottom of the file (around line 697).

Add AFTER the `</PasteJDModal>` closing tag and BEFORE the final `</div>`:

```typescript
      {/* Cancel build confirm */}
      <ConfirmDialog
        open={showCancelBuildDialog}
        onClose={() => setShowCancelBuildDialog(false)}
        onConfirm={handleConfirmCancelBuild}
        title="Cancel Resume Build?"
        description="You'll lose the conversation progress. Your resume won't be created."
        confirmLabel="Yes, Cancel Build"
        variant="danger"
      />

      {/* Manual editor confirm */}
      <ConfirmDialog
        open={showManualDialog}
        onClose={() => setShowManualDialog(false)}
        onConfirm={() => handleSwitchToManualRef.current()}
        title="Open in Editor?"
        description="We'll create a resume with what you've shared so far and open it in the editor. You can continue editing there."
        confirmLabel="Open in Editor"
        variant="default"
      />
```

---

## Step 4: Fix PostHog CSP

### File: `next.config.ts`

Find the `connect-src` line (around line 26):

OLD:
```typescript
              "connect-src 'self' https://api.deepseek.com https://api.deepinfra.com https://us.i.posthog.com https://skilled-grizzly-159157.upstash.io",
```

NEW:
```typescript
              "connect-src 'self' https://api.deepseek.com https://api.deepinfra.com https://us.i.posthog.com https://us-assets.i.posthog.com https://skilled-grizzly-159157.upstash.io",
```

---

## Step 5: Verification

Run these commands in order:

```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. Unit tests
pnpm vitest run

# 3. Build
pnpm build
```

### Expected Results

- `npx tsc --noEmit`: Zero NEW errors (one pre-existing error in `tests/unit/resume-pdf.test.ts` is OK)
- `pnpm vitest run`: All tests pass (93/93 or more)
- `pnpm build`: Compiled successfully

### Manual Verification Checklist

1. **Entry card**: Shows "Build with AI" with subtitle "Answer questions · 5 min"
2. **Wizard**: 2 steps — template gallery (Step 1) + role/industry (Step 2)
3. **Build banner**: Shows "Building: [role] · [industry]" + progress steps + Save + Edit Manually
4. **Progress steps**: Update based on AI's `<!--jfs-progress:STEP-->` marker. First AI response should light up Experience as "current" (primary color dot). As conversation progresses, previous steps turn green (✓), current step turns primary, future steps stay muted.
5. **Complete state**: When AI sends `<!--jfs-progress:complete-->`, all steps show green + "✓ Ready to save!" text appears
6. **Status bar**: Hidden during build mode. Visible in coach mode.
7. **Suggestions**: Hidden during build mode. Visible in coach mode.
8. **New Chat during build**: Shows confirm dialog "Cancel Resume Build?"
9. **Edit Manually button**: Shows confirm dialog "Open in Editor?" with description explaining what happens. On confirm → extracts partial data → redirects to editor → toast "Opened your resume in the editor"
10. **Pill bar**: Button says "Build with AI" (not "Build Template")
11. **Target company context**: NOT appended to messages during build mode
12. **Save button**: Always enabled (no keyword gate). Only disabled during active save.
13. **HTML comment marker**: Check the chat messages — `<!--jfs-progress:xxx-->` should NOT be visible in the rendered chat (it's an HTML comment, invisible in markdown). If it IS visible, that's a bug — the markdown renderer doesn't handle HTML comments.

---

## GOTCHAS

1. **`buildData` vs `buildDataRef.current` in JSX:** `{!buildData && (...)}` uses the STATE variable — causes re-render when it changes. This is correct for conditional rendering. Inside `useCallback([])` functions (like `CustomInputBar`), use `buildDataRef.current` instead.

2. **`setShowManualDialog` is stable:** State setters from `useState` are stable references. They CAN be called inside `useCallback([])` without causing re-creation. This is why we use `setShowManualDialog(true)` directly inside `CustomInputBar` instead of a ref.

3. **`buildStepRef` is needed inside CustomInputBar:** Because `CustomInputBar` has `useCallback([])` deps, it captures the initial `buildStep` value forever. We use `buildStepRef.current` to always read the latest value.

4. **AI might not include the marker:** If the AI forgets to include `<!--jfs-progress:xxx-->`, the progress indicator stays at its last known step. This is acceptable — the indicator is frozen but not wrong. The AI is instructed to ALWAYS include it.

5. **AI might include the marker in the wrong format:** The regex `matchAll(/<!--jfs-progress:(\w+)-->/g)` handles variations in spacing as long as the core format matches. If the AI uses a different format entirely, the marker won't be detected.

6. **`handleSwitchToManual` is now triggered via confirm dialog:** The button calls `setShowManualDialog(true)`, NOT `handleSwitchToManualRef.current()`. The actual function is called from the ConfirmDialog's `onConfirm`. The ref pattern is kept because `handleSwitchToManual` is a `useCallback` that might change.

7. **Do NOT remove the `BUILD_STEPS` constant from inside `CustomInputBar`:** It references `BUILD_STEPS` which is defined in the component body (not inside the callback). Since `BUILD_STEPS` is created fresh every render but is structurally identical (it's `as const`), this works fine — `useCallback([])` captures the first render's reference, which has the same values.

8. **`cn` is still used in `chat-view.tsx`:** After all changes, `cn` is still used for conditional classes in the progress steps. Do NOT remove the `cn` import.

9. **Two ConfirmDialogs:** We use two separate `ConfirmDialog` instances — one for "Cancel Build" (New Chat) and one for "Open in Editor" (Manual). Both use the same component but with different props. The "Cancel Build" one uses `variant="danger"` (red button). The "Open in Editor" one uses `variant="default"` (neutral button).

---

## Summary of All Changes

| File | Action | Key Change |
|------|--------|-----------|
| `app/components/chat/build-wizard.tsx` | No change | Already has 2-step wizard (template + role) |
| `app/api/chat/route.ts` | Edit | Add `<!--jfs-progress:STEP-->` instructions to build system prompt |
| `app/components/chat/chat-view.tsx` | Edit (14 sub-edits) | AI-driven progress, hide UI in build mode, fix escape hatch with confirm, fix New Chat with confirm, fix labels, add buildStepRef |
| `next.config.ts` | Edit | Add `us-assets.i.posthog.com` to CSP `connect-src` |
