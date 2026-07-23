# Implementation Spec & Plan: Full Neumorphism / Soft UI for Chat Page

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: User approved "Style B: Full Neumorphism / Soft UI" from a side-by-side prototype at `/neuro-test`. Neumorphism requires a consistent grey surface (`#E9ECEF`) — cards must be the SAME color as the background, with elevation created entirely by dual light/dark shadows. The current chat page uses `#F8F9FA` background with white cards and borders. Dark mode neumorphism is extremely difficult (light/dark shadow physics break down) — noted as a known limitation; dark mode keeps existing styling.

- **Chosen Architecture**: CSS-scoped utility classes applied to chat-page elements only. No global design token changes. A `.neuro-chat` scoping class on the ChatView root cascades CSS variable overrides for the agent-elements InputBar. Custom utility classes (`.neuro-card`, `.neuro-inset`, `.neuro-icon-well`, `.neuro-pill`, `.neuro-surface`, `.neuro-title`) are defined in `globals.css` and applied via className. Dark mode neutralizes all neumorphic effects back to flat shadows. This approach is zero-risk to other pages and fully reversible.

- **Discarded Alternatives**:
  - *Alternative A: Change global `--background` to `#E9ECEF`*. Rejected — would affect every page in the app, not just chat. Breaks the rest of the UI which is designed for `#F8F9FA`.
  - *Alternative B: Create a separate theme/css file*. Rejected — unnecessary complexity. The utility classes are ~50 lines of CSS and belong in `globals.css` alongside existing utility patterns.
  - *Alternative C: Inline styles on every element*. Rejected — not maintainable, can't handle hover/active states or dark mode overrides.

### 1. Target Files & Folder Structure

All paths relative to worktree root.

| File | Action | Purpose |
|------|--------|---------|
| `src/app/globals.css` | **MODIFY** | Add neumorphic utility classes + InputBar scoped overrides + dark mode neutralizers |
| `src/app/components/chat/chat-view.tsx` | **MODIFY** | Apply neumorphic classes to: root container, status bar, entry cards, icon wells, heading text, action pills, parsing card |
| `src/app/components/chat/paste-jd-modal.tsx` | **MODIFY** | Neumorphic dialog surface + inset textarea |
| `src/app/components/chat/build-wizard.tsx` | **MODIFY** | Neumorphic dialog surface + pass `neumorphic` to TemplateGallery |
| `src/app/components/layout/upload-modal.tsx` | **MODIFY** | Neumorphic dialog surface + drop zone + build button |
| `src/app/components/resume/templates/template-gallery.tsx` | **MODIFY** | Add optional `neumorphic` prop for soft-UI card styling |

### 2. Import Definitions & Dependencies

No new imports needed. All changes use existing:
- `cn` from `~/lib/utils` (already imported in all target files)
- `Button`, `Dialog`, `DialogContent` from existing ui components
- CSS classes defined in `globals.css` (globally available)
- No new npm packages

### 3. Database Schema Changes

**N/A** — Pure CSS/styling change. No data, API, or auth changes.

### 4. Step-by-Step Edits

---

#### ✅ STEP 1: `src/app/globals.css` — Add Neumorphic Utility Classes

Insert the following block AFTER the existing `/* ── Focus-visible ring ── */` section (after line 403, at end of file). This adds all neumorphic utility classes and scoped InputBar overrides.

```css
/* ═══════════════════════════════════════════════════════════════
   NEUMORPHISM / SOFT UI UTILITY CLASSES
   Light-mode only. Dark mode neutralizes back to flat shadows.
   Surface color: #E9ECEF (darker than --background #F8F9FA)
   ═══════════════════════════════════════════════════════════════ */

/* Surface — just the background color, no shadow */
.neuro-surface {
  background-color: #E9ECEF;
}

/* Card — raised/extruded dual shadow */
.neuro-card {
  background-color: #E9ECEF;
  box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.12), -6px -6px 12px rgba(255, 255, 255, 0.9);
}
.neuro-card:hover {
  box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.14), -8px -8px 16px rgba(255, 255, 255, 0.95);
}

/* Inset / pressed — recessed into surface */
.neuro-inset {
  background-color: #E9ECEF;
  box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.10), inset -4px -4px 8px rgba(255, 255, 255, 0.9);
}

/* Icon well — smaller inset for icon containers */
.neuro-icon-well {
  background-color: #E9ECEF;
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.10), inset -3px -3px 6px rgba(255, 255, 255, 0.9);
}

/* Pill / raised button — extruded with active press-down */
.neuro-pill {
  background-color: #E9ECEF;
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.12), -3px -3px 6px rgba(255, 255, 255, 0.9);
}
.neuro-pill:hover {
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.14), -4px -4px 8px rgba(255, 255, 255, 0.95);
}
.neuro-pill:active {
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.10), inset -2px -2px 4px rgba(255, 255, 255, 0.9);
}

/* Modal surface — larger, softer shadow for dialog overlays */
.neuro-modal {
  background-color: #E9ECEF;
  box-shadow: 8px 8px 24px rgba(0, 0, 0, 0.15), -8px -8px 24px rgba(255, 255, 255, 0.9);
}

/* Title text — softer than --foreground (#0F1115) for neumorphic context */
.neuro-title {
  color: #3A3F45;
}

/* ── Scoped overrides for agent-elements InputBar ── */
/* The InputBar is from agent-elements and styled via CSS variables.
   We scope overrides via .neuro-chat parent class. */
.neuro-chat {
  background-color: #E9ECEF;
  --an-input-background: #E9ECEF;
  --an-input-border-color: transparent;
  --an-input-border-radius: 16px;
  --an-border-radius: 16px;
  --an-message-border-radius: 16px;
  --an-background: #E9ECEF;
}

/* Input bar container — pressed/recessed inset shadow */
.neuro-chat .bg-an-input-background {
  border-color: transparent;
  box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.10), inset -4px -4px 8px rgba(255, 255, 255, 0.9);
}

/* Send button — extruded raised */
.neuro-chat .bg-an-send-button-bg {
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.12), -3px -3px 6px rgba(255, 255, 255, 0.9);
}

/* Suggestions bar in InputBar — match surface */
.neuro-chat .bg-an-background-secondary {
  background-color: #E9ECEF;
}

/* ── Dark mode: neutralize all neumorphic effects ── */
.dark .neuro-surface,
.dark .neuro-chat {
  background-color: var(--background);
}

.dark .neuro-card,
.dark .neuro-inset,
.dark .neuro-icon-well,
.dark .neuro-pill,
.dark .neuro-modal {
  background-color: var(--card);
  box-shadow: var(--shadow-md);
}

.dark .neuro-card:hover,
.dark .neuro-pill:hover {
  box-shadow: var(--shadow-lg);
}

.dark .neuro-pill:active {
  box-shadow: var(--shadow-sm);
}

.dark .neuro-title {
  color: var(--foreground);
}

.dark .neuro-chat {
  --an-input-background: var(--card);
  --an-input-border-color: var(--border);
  --an-input-border-radius: 6px;
  --an-border-radius: 6px;
  --an-message-border-radius: 6px;
  --an-background: var(--background);
}

.dark .neuro-chat .bg-an-input-background {
  border-color: var(--border);
  box-shadow: none;
}

.dark .neuro-chat .bg-an-send-button-bg {
  box-shadow: none;
}

.dark .neuro-chat .bg-an-background-secondary {
  background-color: var(--secondary);
}
```

---

#### ✅ STEP 2: `src/app/components/chat/chat-view.tsx` — Apply Neumorphic Classes

**2a. Root container (line ~644)**

Find:
```tsx
    <div className="flex h-full flex-col">
```
Replace with:
```tsx
    <div className="neuro-chat flex h-full flex-col">
```

**2b. Status bar (line ~647)**

Find:
```tsx
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card px-4 md:px-8 py-2.5 text-[11px]">
```
Replace with:
```tsx
      <div className="neuro-surface flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 md:px-8 py-2.5 text-[11px]">
```

**2c. Entry cards section — heading (line ~708)**

Find:
```tsx
          <div
            className="mb-6 animate-fade-up text-center text-2xl text-foreground"
            style={{ fontFamily: 'var(--font-instrument-serif), serif', animationDelay: '0ms', animationFillMode: 'both' }}
          >
```
Replace with:
```tsx
          <div
            className="neuro-title mb-6 animate-fade-up text-center text-2xl"
            style={{ fontFamily: 'var(--font-instrument-serif), serif', animationDelay: '0ms', animationFillMode: 'both' }}
          >
```

**2d. Entry card 1 — Upload Resume (lines ~715-725)**

Find the Upload card div (the one with `onClick={() => fileRef.current?.click()}`):
```tsx
            <div
              onClick={() => fileRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center rounded-lg border border-border bg-card p-5 text-center shadow-sm transition-all hover:border-primary/30 hover:shadow-md animate-fade-up"
              style={{ animationDelay: '100ms', animationFillMode: 'both' }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-primary transition-transform group-hover:scale-110">
                <Upload size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">Upload Resume</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">PDF, DOCX, or text</div>
            </div>
```
Replace with:
```tsx
            <div
              onClick={() => fileRef.current?.click()}
              className="neuro-card group flex cursor-pointer flex-col items-center rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5 active:translate-y-0 animate-fade-up"
              style={{ animationDelay: '100ms', animationFillMode: 'both' }}
            >
              <div className="neuro-icon-well mb-3 flex h-10 w-10 items-center justify-center rounded-full text-primary transition-transform group-hover:scale-110">
                <Upload size={18} />
              </div>
              <div className="neuro-title text-sm font-semibold">Upload Resume</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">PDF, DOCX, or text</div>
            </div>
```

**2e. Entry card 2 — Build with AI (lines ~728-738)**

Find:
```tsx
            <div
              onClick={() => setWizardOpen(true)}
              className="group flex cursor-pointer flex-col items-center rounded-lg border border-border bg-card p-5 text-center shadow-sm transition-all hover:border-primary/30 hover:shadow-md animate-fade-up"
              style={{ animationDelay: '200ms', animationFillMode: 'both' }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success transition-transform group-hover:scale-110">
                <FileText size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">Build with AI</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Answer questions · 5 min</div>
            </div>
```
Replace with:
```tsx
            <div
              onClick={() => setWizardOpen(true)}
              className="neuro-card group flex cursor-pointer flex-col items-center rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5 active:translate-y-0 animate-fade-up"
              style={{ animationDelay: '200ms', animationFillMode: 'both' }}
            >
              <div className="neuro-icon-well mb-3 flex h-10 w-10 items-center justify-center rounded-full text-success transition-transform group-hover:scale-110">
                <FileText size={18} />
              </div>
              <div className="neuro-title text-sm font-semibold">Build with AI</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Answer questions · 5 min</div>
            </div>
```

**2f. Entry card 3 — Paste Job Posting (lines ~741-751)**

Find:
```tsx
            <div
              onClick={() => setPasteOpen(true)}
              className="group flex cursor-pointer flex-col items-center rounded-lg border border-border bg-card p-5 text-center shadow-sm transition-all hover:border-primary/30 hover:shadow-md animate-fade-up"
              style={{ animationDelay: '300ms', animationFillMode: 'both' }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-warn-soft text-[var(--warn)] transition-transform group-hover:scale-110">
                <ClipboardList size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">Paste Job Posting</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Analyze a JD</div>
            </div>
```
Replace with:
```tsx
            <div
              onClick={() => setPasteOpen(true)}
              className="neuro-card group flex cursor-pointer flex-col items-center rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5 active:translate-y-0 animate-fade-up"
              style={{ animationDelay: '300ms', animationFillMode: 'both' }}
            >
              <div className="neuro-icon-well mb-3 flex h-10 w-10 items-center justify-center rounded-full text-[var(--warn)] transition-transform group-hover:scale-110">
                <ClipboardList size={18} />
              </div>
              <div className="neuro-title text-sm font-semibold">Paste Job Posting</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Analyze a JD</div>
            </div>
```

**2g. Action pills (lines ~582-604) — inside CustomInputBar**

Find the three action pill Buttons (Upload Resume, Build with AI, Paste Job pills):
```tsx
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium"
                >
                  <Upload size={11} />
                  Upload Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWizardOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium"
                >
                  <FileText size={11} />
                  Build with AI
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPasteOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium"
                >
                  <ClipboardList size={11} />
                  Paste Job
                </Button>
```
Replace with (change `variant="outline"` to `variant="ghost"`, add `neuro-pill rounded-xl` and `hover:bg-transparent hover:-translate-y-0.5`):
```tsx
                <Button
                  variant="ghost"
                  onClick={() => fileRef.current?.click()}
                  className="neuro-pill rounded-xl inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium hover:bg-transparent hover:-translate-y-0.5"
                >
                  <Upload size={11} />
                  Upload Resume
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setWizardOpen(true)}
                  className="neuro-pill rounded-xl inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium hover:bg-transparent hover:-translate-y-0.5"
                >
                  <FileText size={11} />
                  Build with AI
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPasteOpen(true)}
                  className="neuro-pill rounded-xl inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium hover:bg-transparent hover:-translate-y-0.5"
                >
                  <ClipboardList size={11} />
                  Paste Job
                </Button>
```

**2h. Parsing card (lines ~774-784) — the loading skeleton shown during upload**

Find:
```tsx
                  <div className="rounded-md border border-border bg-card p-4">
```
Replace with:
```tsx
                  <div className="neuro-card rounded-2xl p-4">
```

---

#### ✅ STEP 3: `src/app/components/chat/paste-jd-modal.tsx` — Neumorphic Modal

**3a. DialogContent (line ~32)**

Find:
```tsx
      <DialogContent className="max-w-lg">
```
Replace with:
```tsx
      <DialogContent className="neuro-modal max-w-lg rounded-2xl ring-0">
```

**3b. Textarea (line ~46)**

Find:
```tsx
          <Textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here…"
            className="w-full resize-y rounded-md px-3 py-2.5 text-sm leading-relaxed"
            autoFocus
          />
```
Replace with:
```tsx
          <Textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here…"
            className="neuro-inset w-full resize-y rounded-2xl border-0 px-3 py-2.5 text-sm leading-relaxed"
            autoFocus
          />
```

---

#### ✅ STEP 4: `src/app/components/chat/build-wizard.tsx` — Neumorphic Wizard

**4a. DialogContent (line ~53)**

Find:
```tsx
      <DialogContent className="max-w-2xl gap-0 p-0" showCloseButton={false}>
```
Replace with:
```tsx
      <DialogContent className="neuro-modal max-w-2xl gap-0 rounded-2xl p-0 ring-0" showCloseButton={false}>
```

**4b. TemplateGallery call (line ~87)**

Find:
```tsx
              <TemplateGallery
                value={data.template}
                onChange={(t: ResumeTemplate) => setData({ ...data, template: t })}
              />
```
Replace with:
```tsx
              <TemplateGallery
                value={data.template}
                onChange={(t: ResumeTemplate) => setData({ ...data, template: t })}
                neumorphic
              />
```

**4c. Input fields (lines ~103-109, ~115-120)** — Apply inset neumorphic styling

Find (the role input):
```tsx
                <Input
                  value={data.role}
                  onChange={(e) => setData({ ...data, role: e.target.value })}
                  placeholder="e.g. Senior Product Designer, Registered Nurse, Marketing Manager"
                  className="w-full rounded-md px-3 py-2 text-sm"
                  autoFocus
                />
```
Replace with:
```tsx
                <Input
                  value={data.role}
                  onChange={(e) => setData({ ...data, role: e.target.value })}
                  placeholder="e.g. Senior Product Designer, Registered Nurse, Marketing Manager"
                  className="neuro-inset w-full rounded-2xl border-0 px-3 py-2 text-sm"
                  autoFocus
                />
```

Find (the industry input):
```tsx
                <Input
                  value={data.industry}
                  onChange={(e) => setData({ ...data, industry: e.target.value })}
                  placeholder="e.g. Tech, Healthcare, Finance, Education"
                  className="w-full rounded-md px-3 py-2 text-sm"
                />
```
Replace with:
```tsx
                <Input
                  value={data.industry}
                  onChange={(e) => setData({ ...data, industry: e.target.value })}
                  placeholder="e.g. Tech, Healthcare, Finance, Education"
                  className="neuro-inset w-full rounded-2xl border-0 px-3 py-2 text-sm"
                />
```

---

#### ✅ STEP 5: `src/app/components/layout/upload-modal.tsx` — Neumorphic Upload Modal

**5a. DialogContent (line ~105)**

Find:
```tsx
        <DialogContent className="max-w-lg">
```
Replace with:
```tsx
        <DialogContent className="neuro-modal max-w-lg rounded-2xl ring-0">
```

**5b. Drag & drop zone (lines ~112-141)**

Find:
```tsx
            <Button
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={parsing}
              className={cn(
                'w-full rounded-lg border-2 border-dashed p-10 text-center',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30',
                parsing && 'opacity-60 cursor-not-allowed',
              )}
            >
```
Replace with:
```tsx
            <Button
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={parsing}
              className={cn(
                'neuro-inset w-full rounded-2xl border-0 p-10 text-center',
                dragOver && 'ring-2 ring-primary',
                parsing && 'opacity-60 cursor-not-allowed',
              )}
            >
```

**5c. Icon container inside drop zone (line ~134)**

Find:
```tsx
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-primary">
```
Replace with:
```tsx
                  <div className="neuro-icon-well flex h-10 w-10 items-center justify-center rounded-full text-primary">
```

**5d. Build with AI button (lines ~151-164)**

Find:
```tsx
            <Button
              variant="ghost"
              onClick={() => setWizardOpen(true)}
              disabled={parsing}
              className="w-full flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success shrink-0">
```
Replace with:
```tsx
            <Button
              variant="ghost"
              onClick={() => setWizardOpen(true)}
              disabled={parsing}
              className="neuro-card w-full flex items-center gap-3 rounded-2xl border-0 p-4 text-left transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              <div className="neuro-icon-well flex h-10 w-10 items-center justify-center rounded-full text-success shrink-0">
```

---

#### ✅ STEP 6: `src/app/components/resume/templates/template-gallery.tsx` — Add `neumorphic` Prop

**6a. Update interface (line ~8)**

Find:
```tsx
interface TemplateGalleryProps {
  value: ResumeTemplate | undefined
  onChange: (template: ResumeTemplate) => void
}
```
Replace with:
```tsx
interface TemplateGalleryProps {
  value: ResumeTemplate | undefined
  onChange: (template: ResumeTemplate) => void
  neumorphic?: boolean
}
```

**6b. Update function signature (line ~94)**

Find:
```tsx
export function TemplateGallery({ value, onChange }: TemplateGalleryProps) {
```
Replace with:
```tsx
export function TemplateGallery({ value, onChange, neumorphic = false }: TemplateGalleryProps) {
```

**6c. Update card className (lines ~104-109)**

Find:
```tsx
          className={cn(
            'group relative cursor-pointer rounded-md border p-2.5 text-left transition-all shadow-sm',
            value === t.id
              ? 'border-primary bg-accent-soft ring-1 ring-primary'
              : 'border-border hover:border-primary/40 hover:shadow-md',
          )}
```
Replace with:
```tsx
          className={cn(
            'group relative cursor-pointer p-2.5 text-left transition-all',
            neumorphic
              ? cn(
                  'rounded-2xl neuro-card',
                  value === t.id && 'ring-1 ring-primary',
                )
              : cn(
                  'rounded-md border shadow-sm',
                  value === t.id
                    ? 'border-primary bg-accent-soft ring-1 ring-primary'
                    : 'border-border hover:border-primary/40 hover:shadow-md',
                ),
          )}
```

---

### 4.5 Vertical-Slice Order

This is a single-slice styling change. All steps should be implemented together as they form one cohesive visual update. The verification is visual — run `pnpm dev` and check `/en/chat` in light mode.

Implementation order (matters for build to not break between steps):
1. **globals.css** (Step 1) — defines all classes first, so nothing references undefined classes
2. **template-gallery.tsx** (Step 6) — add prop (backward-compatible, defaults to current behavior)
3. **chat-view.tsx** (Step 2) — main chat page
4. **paste-jd-modal.tsx** (Step 3)
5. **build-wizard.tsx** (Step 4)
6. **upload-modal.tsx** (Step 5)

### 5. Assertion & Testing Requirements

- **Unit Tests**: N/A — no behavior change, pure CSS/styling.
- **Integration Tests**: N/A — no API or data flow changes.
- **E2E UI Tests**: N/A — visual-only change. Manual visual verification required (see below).
- **Manual Visual Checklist** (for Reviewer):
  - [ ] Chat page background is `#E9ECEF` (grey, not white)
  - [ ] Entry cards have dual-shadow (light top-left, dark bottom-right), no hard borders, `rounded-2xl`
  - [ ] Entry cards lift on hover (`-translate-y-0.5`)
  - [ ] Icon wells in cards are pressed-in (inset shadow)
  - [ ] Heading "How do you want to start?" uses softer `#3A3F45` text color
  - [ ] Input bar is recessed (inset shadow), no border, `rounded-2xl`
  - [ ] Send button is extruded (raised shadow) when active
  - [ ] Action pills (Upload/Build/Paste) are raised neumorphic pills
  - [ ] Paste JD modal has neumorphic surface, textarea is inset
  - [ ] Build wizard modal has neumorphic surface, inputs are inset, template cards are raised
  - [ ] Upload modal has neumorphic surface, drop zone is inset
  - [ ] Dark mode: all neumorphic effects neutralized, page looks normal (no broken shadows)
  - [ ] No TypeScript errors (`npx tsc --noEmit`)
  - [ ] No lint errors (`pnpm lint`)

### 6. Verification Commands & Log Files

- **Build Command**: `pnpm build`
- **Lint Command**: `pnpm lint`
- **TypeScript Check**: `npx tsc --noEmit`
- **Dev Server**: `pnpm dev` → navigate to `http://localhost:3000/en/chat`
- **Log Location**: Console output in terminal; browser DevTools console for runtime errors

### Known Limitations
1. **Dark mode**: Neumorphism does not render in dark mode. All neumorphic classes are neutralized to flat shadows. This is by design — neumorphic dual-shadow physics don't work on dark surfaces.
2. **Chat messages**: Assistant and user message bubbles are NOT neumorphically styled — only the entry cards, input bar, status bar, and modals are. This matches the approved prototype scope.
3. **Scope**: Neumorphism applies ONLY to the chat page (`/en/chat`) and its associated modals. Other pages (dashboard, resume editor, etc.) are unaffected.
