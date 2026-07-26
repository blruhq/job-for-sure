# Implementation Spec & Plan
# Typography & Spacing Normalization

---

### 0. Architectural Decision Record (ADR)

**Context & Constraints**
- Pure CSS/Tailwind token swap — no logic changes, no new dependencies.
- `label-mono` class and its font sizes are intentionally small (monospace metadata) — DO NOT touch.
- `text-[10px]` on genuine micro-labels (monospace uppercase tags, status badges, category pills, score badges, keyboard hints) — DO NOT touch.
- `text-xs` is 12px. It should ONLY be used for metadata/labels/badges not meant to be READ.
- `text-sm` is 14px. All body text, input content, button labels (CTAs), section headings, descriptions, placeholder text must be at minimum `text-sm`.
- Tag chips/pills on job cards (location, source, salary, experienceLevel, postedAt) that are in `text-xs` in `job-search-panel.tsx` — these ARE metadata so leave them at `text-xs`.

**Type Hierarchy (locked)**
```
Page titles (h1):           text-lg    (1.25rem / 20px)
Section headings (h2/h3):   text-base  (1rem / 16px) — or text-sm for compact h3
Body content & inputs:      text-sm    (0.875rem / 14px)
Labels, metadata, badges:   text-xs    (0.75rem / 12px) — RESERVED
Micro labels (mono):        text-[10px] (0.625rem / 10px) — RESERVED for monospace tags
```

**Spacing Standards (locked)**
```
Input/select padding:       px-3 py-2 minimum
Textarea padding:           p-3 minimum
Button padding (sm):        px-3 py-1.5 minimum
Button padding (default):   px-4 py-2 minimum
Gap between form fields:    gap-3 minimum
Gap between buttons:        gap-2 minimum
Label to input:             mb-1.5 or mb-2
Card internal padding:      p-4 minimum
```

---

### 1. Target Files & Folder Structure

Files to modify (24 total — all existing, no new files):

```
src/app/components/resume/resume-detail.tsx
src/app/[locale]/(app)/settings/page.tsx
src/app/components/ats/ats-view.tsx
src/app/components/resume/job-search-panel.tsx
src/app/components/interview/interview-session.tsx
src/app/components/interview/interview-summary.tsx
src/app/components/pipeline/applications-view.tsx
src/app/components/pipeline/job-detail-panel.tsx
src/app/components/pipeline/smart-overview.tsx
src/app/components/chat/chat-view.tsx
src/app/components/chat/job-preview.tsx
src/app/components/chat/upload-card-message.tsx
src/app/components/dashboard/dashboard-view.tsx
src/app/components/resume/cover-letter-editor.tsx
src/app/components/resume/resume-copilot.tsx
src/app/components/resume/tailor-review-panel.tsx
src/app/[locale]/(app)/cover-letter/page.tsx
src/app/[locale]/(app)/settings/billing/page.tsx
src/app/[locale]/(app)/resumes/page.tsx
src/app/[locale]/(auth)/login/page.tsx
src/app/[locale]/(auth)/register/page.tsx
src/app/components/marketing/interview-section.tsx
src/app/components/layout/command-palette.tsx  (no changes needed — already correct)
```

**File size rule**: Each file is well under 500 lines. All edits are in-place token swaps.

---

### 2. Import Definitions & Dependencies

No new imports needed. All changes are Tailwind class string edits only.

---

### 3. Database Schema Changes

None.

---

### 4. Step-by-Step Edits

> **Notation**: `L{n}` = line number in current file. Changes are className substring replacements. When multiple replacements exist on the same line, apply all at once.
>
> **Rule**: When replacing `text-xs` with `text-sm` in an input's className, also fix cramped padding on the same element if present (`px-2.5 py-1.5` → `px-3 py-2`, `px-2 py-1` → `px-3 py-2`).
>
> **DO NOT change**: any `label-mono` styles, `text-[10px]` anywhere, `text-xs` inside tag/badge/chip/pill spans that are metadata, `text-xs` on score badges, skills tags, source badges, visa tags, salary badges.

---

## ✅ FILE 1: `src/app/components/resume/resume-detail.tsx`

**Typography changes:**

- **L93** — TagInput container: `text-xs` (the TagInput wrapper div) → `text-sm`
  - Old: `className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-xs neuro-inset px-2.5 py-1.5 text-xs"`
  - New: `className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-xs neuro-inset px-3 py-2 text-sm"`

- **L117** — TagInput inner Input: `text-xs` → `text-sm`
  - Old: `className="min-w-[80px] flex-1 border-none bg-transparent text-xs shadow-none placeholder:text-muted-foreground/50"`
  - New: `className="min-w-[80px] flex-1 border-none bg-transparent text-sm shadow-none placeholder:text-muted-foreground/50"`

- **L282** — SectionSuggestionBanner header text: `text-xs` → `text-sm`
  - Old: `className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary"`
  - New: `className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary"`

- **L325** — header title: already `text-sm` (line 1151) — keep

**Spacing changes (input fields):**

- **L503** — Resume Name Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L507** — Full Name Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L510** — parent div `gap-3` already correct. But `mt-3` rows are fine.

- **L513** — Email Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L517** — Phone Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L523** — Location Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L527** — GitHub Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L533** — Headline Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L542** — Professional Summary Textarea: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full resize-y rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="w-full resize-y rounded-xs px-3 py-2 text-sm"`

**EditableList inner inputs** (these use `px-2 py-1 text-xs` — cramped):

- **L564** — Company Input (experience): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L568** — Role Input (experience): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L573** — Dates Input (experience): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L581** — Bullets Textarea (experience): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L601** — Institution Input (education): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L605** — Degree Input (education): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L611** — Field Input (education): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L615** — Dates Input (education): `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L633** — Project Name Input: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L641** — Project Description Textarea: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L655** — Project Link Input: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L674** — Cert Name Input: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L678** — Cert Issuer Input: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L683** — Cert Date Input: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L700** — Language Name Input: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L705** — Language SelectTrigger: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`
- **L735** — Custom Section Title Input: `px-2 py-1 text-xs font-medium` → `px-3 py-2 text-sm font-medium`
- **L746** — Custom Section Bullets Textarea: `px-2 py-1 text-xs` → `px-3 py-2 text-sm`

**Header section:**

- **L812** — "Add Section" button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1 rounded-xs border-dashed px-3 py-2 text-xs w-full justify-center"`
  - New: `className="flex items-center gap-1 rounded-xs border-dashed px-3 py-2 text-sm w-full justify-center"`

- **L823** — Section picker button items: `text-xs` → `text-sm`
  - Old: `className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"`
  - New: `className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left"`

- **L849** — Custom section new title input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="flex-1 rounded-xs px-2.5 py-1.5 text-xs"`
  - New: `className="flex-1 rounded-xs px-3 py-2 text-sm"`

- **L853** — Add button: `text-xs` → `text-sm`
  - Old: `className="rounded-xs px-3 py-1.5 text-xs"`
  - New: `className="rounded-xs px-3 py-1.5 text-sm"`

- **L856** — Cancel button: `text-xs` → `text-sm`
  - Old: `className="rounded-xs px-2 py-1.5 text-xs"`
  - New: `className="rounded-xs px-2 py-1.5 text-sm"`

**Tab bar buttons:**

- **L1141** — Tab buttons: `text-xs` → `text-sm`
  - Old: `'shrink-0 rounded-xs px-3 py-1 text-xs font-medium transition-all',`
  - New: `'shrink-0 rounded-xs px-3 py-1.5 text-sm font-medium transition-all',`

- **L1128** — Back button: `text-xs` → `text-sm`
  - Old: `className="flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-xs"`
  - New: `className="flex shrink-0 items-center gap-1 rounded-sm px-2.5 py-1.5 text-sm"`

- **L1153** — Delete button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground ..."`
  - New: `className="flex items-center gap-1 rounded-sm px-2.5 py-1.5 text-sm text-muted-foreground ..."`

- **L1173** — Template button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold"`
  - New: `className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-semibold"`

- **L1178** — Export PDF button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1 rounded-sm px-3 py-1.5 text-xs font-medium"`
  - New: `className="flex items-center gap-1 rounded-sm px-3 py-2 text-sm font-medium"`

- **L1181** — Export DOCX button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1 rounded-sm px-3 py-1.5 text-xs"`
  - New: `className="flex items-center gap-1 rounded-sm px-3 py-2 text-sm"`

- **L1229** — Summary toggle: `text-xs` → `text-sm`
  - Old: `className="flex cursor-pointer items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground ..."`
  - New: `className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground ..."`

---

## ✅ FILE 2: `src/app/[locale]/(app)/settings/page.tsx`

**Typography changes:**

- **L278** — Subtitle description: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-muted-foreground">Manage your account and preferences</div>`
  - New: `<div className="text-sm text-muted-foreground">Manage your account and preferences</div>`

- **L293** — Tab buttons: `text-xs` → `text-sm`
  - Old: `className={\`flex items-center gap-1.5 border-b-2 px-4 pb-2.5 text-xs font-medium ...`\`}`
  - New: `className={\`flex items-center gap-1.5 border-b-2 px-4 pb-2.5 text-sm font-medium ...`\`}`

- **L316** — Card section headings: `text-xs font-medium` → `text-sm font-medium`
  - Old: `<div className="mb-3 text-xs font-medium">Display Name</div>`
  - New: `<div className="mb-3 text-sm font-medium">Display Name</div>`

- **L338** — Email Address heading: `text-xs font-medium` → `text-sm font-medium`
  - Same pattern as above

- **L366** — My Area heading: `text-xs font-medium` → `text-sm font-medium`

- **L402** — Change Password heading: `text-xs font-medium` → `text-sm font-medium`

- **L463** — Account info flex: `text-xs` → `text-sm`
  - Old: `<div className="flex justify-between text-xs">`
  - New: `<div className="flex justify-between text-sm">`

- **L473** — Theme heading: `text-xs font-medium` → `text-sm font-medium`
- **L474** — Theme description: `text-xs text-muted-foreground` → `text-sm text-muted-foreground`

- **L500** — Notification labels: `text-xs font-medium` → `text-sm font-medium`
- **L501** — Notification descriptions: `text-xs text-muted-foreground` → `text-sm text-muted-foreground`

- **L525** — Danger Zone alert heading: `text-xs font-medium text-red-600` → `text-sm font-medium text-red-600`
- **L529** — Danger Zone description: `text-xs text-muted-foreground` → `text-sm text-muted-foreground`
- **L532** — "Type DELETE" instruction: `text-xs font-medium` → `text-sm font-medium`

**Spacing changes (inputs & buttons):**

- **L321** — Name Input: `text-xs px-3 py-1.5` → `text-sm px-3 py-2`
  - Old: `className="flex-1 rounded-sm text-xs px-3 py-1.5"`
  - New: `className="flex-1 rounded-sm text-sm px-3 py-2"`

- **L343** — Email Input: `text-xs px-3 py-1.5` → `text-sm px-3 py-2`

- **L376** — Home Location Input: `text-xs px-3 py-1.5` → `text-sm px-3 py-2`

- **L393** — Detect location link: `text-xs` → `text-sm`
  - Old: `className="mt-2 flex items-center gap-1.5 text-xs h-auto p-0 disabled:opacity-50"`
  - New: `className="mt-2 flex items-center gap-1.5 text-sm h-auto p-0 disabled:opacity-50"`

- **L409** — Current Password Input: `text-xs px-3 py-1.5` → `text-sm px-3 py-2`
- **L428** — New Password Input: `text-xs px-3 py-1.5` → `text-sm px-3 py-2`
- **L446** — Confirm Password Input: `text-xs px-3 py-1.5` → `text-sm px-3 py-2`

- **L329** — Save button: `text-xs px-3` → `text-sm px-3` (keep size="sm")
- **L352** — Update button: `text-xs px-3` → `text-sm px-3`
- **L384** — Save Area button: `text-xs px-3` → `text-sm px-3`
- **L454** — Change Password button: `text-xs px-3` → `text-sm px-3`
- **L546** — Delete Account button: `text-xs px-3` → `text-sm px-3`

- **L537** — Delete Input: `text-xs px-3 py-1.5` → `text-sm px-3 py-2`
  - Old: `className="flex-1 rounded-sm text-xs px-3 py-1.5 border-red-500/30 focus:border-red-500/50"`
  - New: `className="flex-1 rounded-sm text-sm px-3 py-2 border-red-500/30 focus:border-red-500/50"`

- **L480** — Theme toggle button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1.5 rounded-sm text-xs"`
  - New: `className="flex items-center gap-1.5 rounded-sm text-sm"`

---

## ✅ FILE 3: `src/app/components/ats/ats-view.tsx`

**Typography changes:**

- **L212** — Subtitle: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-muted-foreground">`
  - New: `<div className="text-sm text-muted-foreground">`

- **L234** — Resume SelectTrigger: `text-xs` → `text-sm`
  - Old: `className="w-full rounded-sm neuro-inset py-2 pl-3 pr-8 text-xs"`
  - New: `className="w-full rounded-sm neuro-inset py-2 pl-3 pr-8 text-sm"`

- **L261** — JD Textarea: `p-2.5 text-xs` → `p-3 text-sm`
  - Old: `className="w-full resize-y rounded-sm p-2.5 text-xs"`
  - New: `className="w-full resize-y rounded-sm p-3 text-sm"`

- **L268** — Analyze button: `text-xs` → `text-sm`
  - Old: `className="flex flex-1 items-center justify-center gap-1.5 rounded-sm py-2 text-xs"`
  - New: `className="flex flex-1 items-center justify-center gap-1.5 rounded-sm py-2 text-sm"`

- **L281** — Health Check button: `text-xs` → `text-sm`
  - Old: `className="flex items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-xs"`
  - New: `className="flex items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-sm"`

- **L333** — Gauge description: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-muted-foreground">`
  - New: `<p className="text-sm text-muted-foreground">`

- **L343** — Category breakdown scores: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<div className="flex justify-between text-xs font-semibold">`
  - New: `<div className="flex justify-between text-sm font-semibold">`

- **L368** — Suggestions items: `text-xs` → `text-sm`
  - Old: `className="flex items-start gap-2 text-xs text-muted-foreground bg-accent-soft p-2.5 rounded-sm ..."`
  - New: `className="flex items-start gap-2 text-sm text-muted-foreground bg-accent-soft p-3 rounded-sm ..."`

- **L409** — Missing keywords matched message: `text-xs` → `text-sm`
  - Old: `<span className="text-xs text-muted-foreground flex items-center gap-1">`
  - New: `<span className="text-sm text-muted-foreground flex items-center gap-1">`

- **L424** — Matched keywords pill: `text-xs` → `text-sm`
  - Old: `className="rounded-full border px-2 py-0.5 text-xs bg-success-soft text-success border-success/20"`
  - New: `className="rounded-full border px-2 py-0.5 text-sm bg-success-soft text-success border-success/20"`

- **L430** — None identified text: `text-xs` → `text-sm`
  - Old: `<span className="text-xs text-muted-foreground">None identified yet</span>`
  - New: `<span className="text-sm text-muted-foreground">None identified yet</span>`

- **L444** — Tailor action card heading: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<h4 className="text-xs font-semibold text-foreground">Tailor Resume for this Job</h4>`
  - New: `<h4 className="text-sm font-semibold text-foreground">Tailor Resume for this Job</h4>`

- **L454** — Tailor button: `text-xs` → `text-sm`
  - Old: `className="flex w-full items-center justify-center gap-1.5 rounded-sm py-2 text-xs"`
  - New: `className="flex w-full items-center justify-center gap-1.5 rounded-sm py-2 text-sm"`

- **L470** — ATS Real-Time label: `text-xs` → `text-sm`
  - Old: `<span className="text-xs font-semibold text-muted-foreground">ATS Real-Time Sheet</span>`
  - New: `<span className="text-sm font-semibold text-muted-foreground">ATS Real-Time Sheet</span>`

- **L481** — Edit Resume button: `text-xs` → `text-sm`
  - Old: `className="rounded-sm px-2 py-1 text-xs"`
  - New: `className="rounded-sm px-2.5 py-1.5 text-sm"`

- **L496** — Empty state description: `text-xs` → `text-sm`
  - Old: `<p className="mb-4 max-w-xs text-xs text-muted-foreground">`
  - New: `<p className="mb-4 max-w-xs text-sm text-muted-foreground">`

- **L500** — Upload Resume button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs"`
  - New: `className="flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm"`

**Spacing: Company/Role inputs (L296-L309):**

- **L301** — Company Input: `text-xs` → `text-sm` (already has no explicit px/py — inherits from neuro-inset; add `px-3 py-2`)
  - Old: `className="flex-1 rounded-sm text-xs"`
  - New: `className="flex-1 rounded-sm text-sm px-3 py-2"`

- **L308** — Role Input: same
  - Old: `className="flex-1 rounded-sm text-xs"`
  - New: `className="flex-1 rounded-sm text-sm px-3 py-2"`

---

## ✅ FILE 4: `src/app/components/resume/job-search-panel.tsx`

**Note**: Job card tags (location, source, work policy, salary, experience, visa, postedAt) are metadata — KEEP at `text-xs`. The `text-xs` on filter labels, filter checkbox/radio text, and the "Loading more…" mono text should also stay. Focus on: button text, result count text, "no results" description, filter input.

**Typography changes:**

- **L541** — Search button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1.5 px-3 text-xs font-medium"`
  - New: `className="flex items-center gap-1.5 px-3 text-sm font-medium"`

- **L551** — Fresh button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1 px-2 text-xs"`
  - New: `className="flex items-center gap-1 px-2 text-sm"`

- **L562** — Filters button: `text-xs` → `text-sm`
  - Old: `className={cn('flex items-center gap-1 px-2 text-xs', ...)}`
  - New: `className={cn('flex items-center gap-1 px-2 text-sm', ...)}`

- **L711** — Empty state "Search for real jobs" text: `text-sm` already — keep

- **L720** — No results message: `text-sm` already — keep

- **L730** — Result count line: `text-xs` → `text-sm`
  - Old: `<div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">`
  - New: `<div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">`

- **L752** — Refresh button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-0.5 text-xs"`
  - New: `className="flex items-center gap-0.5 text-sm"`

- **L772** — New jobs banner button: `text-xs` → `text-sm`
  - Old: `className="mb-3 flex w-full items-center justify-center gap-1.5 ... py-2 text-xs font-semibold ..."`
  - New: `className="mb-3 flex w-full items-center justify-center gap-1.5 ... py-2 text-sm font-semibold ..."`

**Filter panel input:**

- **L659** — Skill Search Input: `text-xs` → `text-sm`
  - Old: `className="w-full px-2 py-1 text-xs"`
  - New: `className="w-full px-3 py-2 text-sm"`

**JobCard subcomponent — keep ALL tag pills at text-xs (they are metadata). Fix JobCard footer:**

- **L841** — Job title: `text-sm font-semibold` — KEEP
- **L842** — Company: `text-xs` — KEEP (metadata)
- **L927** — Bookmark button in footer: `text-xs` → `text-sm`
  - Old: `className={cn('flex items-center gap-1 px-2 py-1 text-xs',)}`
  - New: `className={cn('flex items-center gap-1 px-2.5 py-1.5 text-sm',)}`

**Chip subcomponent:**

- **L949** — Chip button text: `text-xs` → `text-sm`
  - Old: `className={cn('flex items-center gap-1 px-2 py-1 text-xs font-medium',)}`
  - New: `className={cn('flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium',)}`

---

## ✅ FILE 5: `src/app/components/interview/interview-session.tsx`

**Note**: Question category tags (`text-[10px] font-mono uppercase`) — KEEP. `text-[10px]` anywhere — KEEP. The question text itself (`text-xs`) and all user-readable content should move to `text-sm`.

**Typography changes:**

- **L325** — Header "Mock Interview" title: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<div className="text-xs font-semibold text-foreground">`
  - New: `<div className="text-sm font-semibold text-foreground">`

- **L334** — "Question X of Y" count: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<div className="text-xs font-semibold text-muted-foreground">`
  - New: `<div className="text-sm font-semibold text-muted-foreground">`

- **L378** — Historical question text: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-foreground font-medium leading-relaxed">`
  - New: `<p className="text-sm text-foreground font-medium leading-relaxed">`

- **L384** — Historical answer text: `text-xs` → `text-sm`
  - Old: `<div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-foreground max-w-full">`
  - New: `<div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm text-foreground max-w-full">`

- **L396** — "AI Score & Feedback" heading: `text-xs` → `text-sm`
  - Old: `<span className="text-xs font-semibold text-foreground">AI Score & Feedback</span>`
  - New: `<span className="text-sm font-semibold text-foreground">AI Score & Feedback</span>`

- **L408** — Strength list items: `text-xs` → `text-sm`
  - Old: `<li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">`
  - New: `<li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">`

- **L419** — Improvement list items: `text-xs` → `text-sm`
  - Old: `<li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">`
  - New: `<li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">`

- **L428** — Model Answer text: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/30 p-2.5 rounded-sm border border-border/50">`
  - New: `<p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-3 rounded-sm border border-border/50">`

- **L493** — Active question text: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<p className="text-xs text-foreground font-semibold leading-relaxed">`
  - New: `<p className="text-sm text-foreground font-semibold leading-relaxed">`

- **L511** — Answer Textarea: `text-xs` → `text-sm` + padding already `p-3`
  - Old: `className={\`w-full resize-y p-3 text-xs \${...}\`}`
  - New: `className={\`w-full resize-y p-3 text-sm \${...}\`}`

- **L559** — Submit Answer button: `text-xs` → `text-sm`
  - Old: `className="px-4 py-2 text-xs font-medium flex items-center gap-1.5"`
  - New: `className="px-4 py-2 text-sm font-medium flex items-center gap-1.5"`

- **L580** — Current feedback answer: `text-xs` → `text-sm`
  - Old: `<div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-foreground max-w-full">`
  - New: `<div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm text-foreground max-w-full">`

- **L593** — "AI Score & Feedback" current: `text-xs` → `text-sm`
  - Old: `<span className="text-xs font-semibold text-foreground">AI Score & Feedback</span>`
  - New: `<span className="text-sm font-semibold text-foreground">AI Score & Feedback</span>`

- **L605-620** — Active feedback strengths/improvements: `text-xs` → `text-sm` (same pattern as historical)

- **L625** — Active model answer: `text-xs` → `text-sm` + `p-2.5` → `p-3`
  - Old: `<p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/30 p-2.5 rounded-sm border border-border/50">`
  - New: `<p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-3 rounded-sm border border-border/50">`

- **L637-644** — Try Again / Next Question buttons: `text-xs` → `text-sm`
  - Old: `className="px-4 py-2 text-xs font-medium flex items-center gap-1.5"`
  - New: `className="px-4 py-2 text-sm font-medium flex items-center gap-1.5"`

**Spacing (mic button):**

- **L532** — Mic button: `text-[10px]` — KEEP (intentionally tiny)

---

## ✅ FILE 6: `src/app/components/interview/interview-summary.tsx`

**Typography changes:**

- **L87** — Summary description: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-muted-foreground mt-1">Here is a summary of your performance analysis</p>`
  - New: `<p className="text-sm text-muted-foreground mt-1">Here is a summary of your performance analysis</p>`

- **L106** — Delta text: `text-xs` → `text-sm`
  - Old: `<div className="flex items-center gap-1 text-xs font-semibold">`
  - New: `<div className="flex items-center gap-1 text-sm font-semibold">`

- **L128** — Strength list items: `text-xs` → `text-sm`
  - Old: `<li key={idx} className="text-xs text-foreground/90 flex items-start gap-2">`
  - New: `<li key={idx} className="text-sm text-foreground/90 flex items-start gap-2">`

- **L135** — Empty strengths state: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-muted-foreground italic border border-dashed ..."`
  - New: `<div className="text-sm text-muted-foreground italic border border-dashed ..."`

- **L148** — Improvement list items: `text-xs` → `text-sm`
  - Old: `<li key={idx} className="text-xs text-foreground/90 flex items-start gap-2">`
  - New: `<li key={idx} className="text-sm text-foreground/90 flex items-start gap-2">`

- **L155** — Empty improvements state: `text-xs` → `text-sm`

- **L187** — Q&A breakdown question text: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-foreground font-medium leading-relaxed">`
  - New: `<p className="text-sm text-foreground font-medium leading-relaxed">`

- **L227-233** — Action buttons: `text-xs` → `text-sm`
  - Old: `className="flex-1 rounded-sm px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5"`
  - New: `className="flex-1 rounded-sm px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"`

---

## ✅ FILE 7: `src/app/components/pipeline/applications-view.tsx`

**Typography changes:**

- **L277** — Loading state text: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-muted-foreground">Loading applications…</p>`
  - New: `<p className="text-sm text-muted-foreground">Loading applications…</p>`

- **L416** — Board header h1 (Job count): `text-sm font-semibold` → keep (already correct)

- **L505** — Column heading: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<span className="text-xs font-semibold text-foreground">{t(col.labelKey)}</span>`
  - New: `<span className="text-sm font-semibold text-foreground">{t(col.labelKey)}</span>`

- **L107** — JobCard title: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<div className="text-xs font-semibold text-foreground line-clamp-2 ..."`
  - New: `<div className="text-sm font-semibold text-foreground line-clamp-2 ..."`

- **L125** — JobCard location/salary: `text-xs` → `text-sm`
  - Old: `<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">`
  - New: `<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">`

- **L136** — JobCard date: `text-xs` → `text-sm`
  - Old: `<div className="mt-1 text-xs text-muted-foreground/60 whitespace-nowrap">`
  - New: `<div className="mt-1 text-sm text-muted-foreground/60 whitespace-nowrap">`

**InlineAddForm inputs:**

- **L201** — Job Title Input: `px-2 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="w-full rounded-xs px-2 py-1.5 text-xs placeholder:text-muted-foreground/50"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm placeholder:text-muted-foreground/50"`

- **L212** — Company Input: same swap

- **L223** — Location Input: same swap

- **L226** — Cancel button: `text-[10px]` → `text-xs`
  - Old: `className="rounded-xs px-2.5 py-1 text-[10px]"`
  - New: `className="rounded-xs px-2.5 py-1.5 text-xs"`

- **L229** — Add button: `text-[10px]` → `text-xs`
  - Old: `className="rounded-xs px-2.5 py-1 text-[10px]"`
  - New: `className="rounded-xs px-2.5 py-1.5 text-xs"`

**Paste URL header:**

- **L449** — URL Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="flex-1 rounded-xs px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/50 disabled:opacity-50"`
  - New: `className="flex-1 rounded-xs px-3 py-2 text-sm placeholder:text-muted-foreground/50 disabled:opacity-50"`

- **L456** — Add button: `text-xs` → `text-sm`
  - Old: `className="flex shrink-0 items-center gap-1 rounded-xs px-5 text-xs"`
  - New: `className="flex shrink-0 items-center gap-1 rounded-xs px-5 text-sm"`

- **L564** — "Add Job" column button: `text-[10px]` → `text-xs`
  - Old: `className="flex items-center gap-1 rounded-xs px-2 py-1.5 text-[10px]"`
  - New: `className="flex items-center gap-1 rounded-xs px-2 py-2 text-xs"`

---

## ✅ FILE 8: `src/app/components/pipeline/job-detail-panel.tsx`

**Typography changes:**

- **L197** — Header subtitle row: `text-xs` → `text-sm`
  - Old: `<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">`
  - New: `<div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">`

- **L262** — Status SelectTrigger: `text-xs` → `text-sm`
  - Old: `className="w-full rounded-xs px-2 py-1.5 text-xs"`
  - New: `className="w-full rounded-xs px-3 py-2 text-sm"`

- **L367** — JD description text: already `text-sm` — KEEP

**Footer action buttons:**

- **L390** — "Tailor Resume" button: `text-sm` already — KEEP
- **L393** — "Cover Letter" button: `text-sm` already — KEEP
- **L396** — "ATS Match" button: `text-sm` already — KEEP
- **L399** — "Interview" button: `text-sm` already — KEEP
- **L410** — Bottom actions already `text-sm` — KEEP

---

## ✅ FILE 9: `src/app/components/pipeline/smart-overview.tsx`

**Typography changes:**

- **L97** — Error state description: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-foreground mb-2">`
  - New: `<p className="text-sm text-foreground mb-2">`

- **L124** — Idle state description: `text-xs` → `text-sm`
  - Old: `<p className="mt-2 text-center text-xs text-muted-foreground">`
  - New: `<p className="mt-2 text-center text-sm text-muted-foreground">`

- **L135** — Loading state text: already `text-sm` — KEEP

- **L214** — Match analysis items: `text-xs` → `text-sm`
  - Old: `<div key={i} className="flex items-start gap-1.5 text-xs text-foreground">`
  - New: `<div key={i} className="flex items-start gap-1.5 text-sm text-foreground">`

- **L220** — Gaps items: `text-xs` → `text-sm`
  - Old: `<div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">`
  - New: `<div key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">`

- **L226** — Insight item: `text-xs` → `text-sm`
  - Old: `<div className="flex items-start gap-1.5 text-xs text-primary pt-1">`
  - New: `<div className="flex items-start gap-1.5 text-sm text-primary pt-1">`

- **L236** — Role summary items: `text-xs` → `text-sm`
  - Old: `<div key={i} className="text-xs text-foreground">`
  - New: `<div key={i} className="text-sm text-foreground">`

- **L245** — Salary "Listed" text: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-foreground">`
  - New: `<div className="text-sm text-foreground">`

- **L249** — Salary "Market" text: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-muted-foreground">`
  - New: `<div className="text-sm text-muted-foreground">`

- **L274** — Commute summary: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-foreground">{overview.commuteEstimate.summary}</div>`
  - New: `<div className="text-sm text-foreground">{overview.commuteEstimate.summary}</div>`

- **L277** — Commute cost: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-muted-foreground">`
  - New: `<div className="text-sm text-muted-foreground">`

- **L289** — Company description: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-foreground">{overview.companySnapshot.description}</div>`
  - New: `<div className="text-sm text-foreground">{overview.companySnapshot.description}</div>`

- **L291** — "Limited info" note: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-muted-foreground italic">`
  - New: `<div className="text-sm text-muted-foreground italic">`

- **L308** — Coach Tip text: `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-foreground">{overview.coachTip}</div>`
  - New: `<div className="text-sm text-foreground">{overview.coachTip}</div>`

---

## ✅ FILE 10: `src/app/components/chat/chat-view.tsx`

**Typography changes:**

- **L523** — Build mode "Building" text: `text-xs` → `text-sm`
  - Old: `<span className="truncate text-xs text-foreground">`
  - New: `<span className="truncate text-sm text-foreground">`

- **L647** — Status bar "Profile:" mono tag: KEEP `text-[10px]`
- **L657** — SelectTrigger: `text-xs` → `text-sm`
  - Old: `className="h-auto rounded-xs neuro-inset px-1.5 py-0.5 text-xs"`
  - New: `className="h-auto rounded-xs neuro-inset px-2 py-1 text-sm"`

- **L672** — "Target:" mono tag: KEEP `text-[10px]`
- **L678** — Target SelectTrigger: `text-xs` → `text-sm`
  - Old: `className="h-auto rounded-xs neuro-inset px-1.5 py-0.5 text-xs"`
  - New: `className="h-auto rounded-xs neuro-inset px-2 py-1 text-sm"`

- **L693** — "New Chat" button: KEEP `text-[10px]` (it's a mini utility action in status bar)

- **L727** — Upload card subtitle: `text-xs` → `text-sm`
  - Old: `<div className="mt-0.5 text-xs text-muted-foreground">PDF, DOCX, or text</div>`
  - New: `<div className="mt-0.5 text-sm text-muted-foreground">PDF, DOCX, or text</div>`

- **L743** — Build with AI subtitle: `text-xs` → `text-sm`
  - Old: `<div className="mt-0.5 text-xs text-muted-foreground">Answer questions · 5 min</div>`
  - New: `<div className="mt-0.5 text-sm text-muted-foreground">Answer questions · 5 min</div>`

- **L759** — Paste Job subtitle: `text-xs` → `text-sm`
  - Old: `<div className="mt-0.5 text-xs text-muted-foreground">Analyze a JD</div>`
  - New: `<div className="mt-0.5 text-sm text-muted-foreground">Analyze a JD</div>`

- **L786** — Parsing mono text: `text-xs` — KEEP (it's monospace utility display)

---

## ✅ FILE 11: `src/app/components/chat/job-preview.tsx`

**Typography changes:**

- **L104** — Loading text: `text-xs` → `text-sm`
  - Old: `<span className="font-mono text-xs">`
  - New: `<span className="font-mono text-sm">`

- **L130-133** — Header "N real jobs" text: `text-xs` → `text-sm`
  - Old: `<span className="text-xs font-semibold text-foreground">` and `<span className="text-xs text-muted-foreground">`
  - New: `<span className="text-sm font-semibold text-foreground">` and `<span className="text-sm text-muted-foreground">`

- **L141** — "View all" link: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-0.5 text-xs"`
  - New: `className="flex items-center gap-0.5 text-sm"`

- **L173** — Card job title: `text-xs font-semibold` → `text-sm font-semibold`
  - Old: `<span className="truncate text-xs font-semibold">`
  - New: `<span className="truncate text-sm font-semibold">`

- **L175** — Card company/location: `text-xs` → `text-sm`
  - Old: `<div className="mt-0.5 truncate text-xs text-muted-foreground">`
  - New: `<div className="mt-0.5 truncate text-sm text-muted-foreground">`

**Tag badges (KEEP at text-[10px])**: lines 191, 195, 203, 208, 214 — all metadata tags — KEEP

**Action buttons:**

- **L266** — Bookmark button: `text-[10px]` — bump to `text-xs` (it's a CTA button)
  - Old: `className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]"`
  - New: `className="flex items-center gap-0.5 px-2 py-1 text-xs"`

- **L280** — ATS Fit button: `text-[10px]` → `text-xs`
  - Old: `className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]"`
  - New: `className="flex items-center gap-0.5 px-2 py-1 text-xs"`

- **L289** — Interview button: `text-[10px]` → `text-xs`
  - Old: `className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]"`
  - New: `className="flex items-center gap-0.5 px-2 py-1 text-xs"`

- **L296** — Details button: `text-[10px]` → `text-xs`
  - Old: `className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium"`
  - New: `className="ml-auto flex items-center gap-0.5 px-2 py-1 text-xs font-medium"`

- **L311** — "View more" button: `text-xs` → `text-sm`
  - Old: `className="mt-2 flex w-full items-center justify-center gap-1 border-dashed py-1.5 text-xs"`
  - New: `className="mt-2 flex w-full items-center justify-center gap-1 border-dashed py-2 text-sm"`

---

## ✅ FILE 12: `src/app/components/chat/upload-card-message.tsx`

**Typography changes:**

- **L75** — Target Role input: `text-xs px-2 py-1` → `text-sm px-3 py-2`
  - Old: `className="w-full text-xs px-2 py-1"`
  - New: `className="w-full text-sm px-3 py-2"`

- **L86** — Location input: `text-xs px-2 py-1` → `text-sm px-3 py-2`

- **L96** — "Confirm & Search" button: `py-1 text-xs` → `py-2 text-sm`
  - Old: `className="w-full flex items-center justify-center gap-1 py-1 text-xs font-medium"`
  - New: `className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium"`

- **L102** — Targeting display text: `text-xs` → `text-sm`
  - Old: `<div className="space-y-1 text-xs text-muted-foreground">`
  - New: `<div className="space-y-1 text-sm text-muted-foreground">`

- **L119** — Resume summary: `text-xs` → `text-sm`
  - Old: `<div className="mt-2 text-xs text-muted-foreground leading-relaxed">`
  - New: `<div className="mt-2 text-sm text-muted-foreground leading-relaxed">`

- **L138** — "View Resume" button: `text-xs` → `text-sm`
  - Old: `className="text-xs font-medium"`
  - New: `className="text-sm font-medium"`

- **L145** — "Edit Resume" button: `text-xs` → `text-sm`

**Spacing changes:**

- **L66** — Edit form container: `p-2.5` → `p-3`
  - Old: `className="bg-muted/30 p-2.5 rounded-sm border border-border/50"`
  - New: `className="bg-muted/30 p-3 rounded-sm border border-border/50"`

---

## ✅ FILE 13: `src/app/components/dashboard/dashboard-view.tsx`

**Typography changes:**

- **L134** — Subtitle "Your job search at a glance": `text-xs` → `text-sm`
  - Old: `<div className="text-xs text-muted-foreground">{t('jobSearchGlance')}</div>`
  - New: `<div className="text-sm text-muted-foreground">{t('jobSearchGlance')}</div>`

- **L110** — Empty state description: `text-xs` → `text-sm`
  - Old: `<p className="mb-6 max-w-sm text-xs text-muted-foreground">`
  - New: `<p className="mb-6 max-w-sm text-sm text-muted-foreground">`

- **L116** — "Get Started" button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"`
  - New: `className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"`

- **L139** — "New Resume" button: `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"`
  - New: `className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium"`

- **L241** — Resume name in list: `text-xs font-medium` → `text-sm font-medium`
  - Old: `<span className="flex-1 truncate text-xs font-medium text-foreground">`
  - New: `<span className="flex-1 truncate text-sm font-medium text-foreground">`

- **L264** — Application stage label: `text-xs font-medium` → `text-sm font-medium`
  - Old: `<span className="flex-1 text-xs font-medium text-foreground">`
  - New: `<span className="flex-1 text-sm font-medium text-foreground">`

- **L279, 287, 295, 303** — Quick action link labels: `text-xs font-medium` → `text-sm font-medium`
  - Old: `<span className="text-xs font-medium text-foreground">`
  - New: `<span className="text-sm font-medium text-foreground">`

---

## ✅ FILE 14: `src/app/components/resume/cover-letter-editor.tsx`

**Typography changes:**

- **L205** — Company Name Input: `text-xs px-2.5 py-1.5` → `text-sm px-3 py-2`
  - Old: `className="w-full px-2.5 py-1.5 text-xs"`
  - New: `className="w-full px-3 py-2 text-sm"`

- **L215** — Role Input: same swap

- **L226** — Focus Textarea: `text-xs px-2.5 py-1.5` → `text-sm px-3 py-2.5`
  - Old: `className="w-full resize-none px-2.5 py-1.5 text-xs font-sans"`
  - New: `className="w-full resize-none px-3 py-2.5 text-sm font-sans"`

- **L241** — JD Textarea: `text-xs px-2.5 py-1.5` → `text-sm px-3 py-2.5`
  - Old: `className="w-full h-56 px-2.5 py-1.5 text-xs resize-none font-sans"`
  - New: `className="w-full h-56 px-3 py-2.5 text-sm resize-none font-sans"`

- **L233** — JD section h3: `text-xs font-bold` → `text-sm font-bold`
  - Old: `<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">`
  - New: `<h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">`

- **L251** — Generate button: `text-xs` → `text-sm`
  - Old: `className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold"`
  - New: `className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold"`

- **L263** — "Generated Letter" label: `text-xs` → `text-sm`
  - Old: `<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">`
  - New: `<span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">`

- **L270-297** — Action bar buttons (Save, Copy, Delete, Export): `px-2.5 py-1 text-xs` → `px-3 py-1.5 text-sm`
  - Old: `className="flex items-center gap-1 px-2.5 py-1 text-xs"`
  - New: `className="flex items-center gap-1 px-3 py-1.5 text-sm"`

- **L321** — Letter Textarea: `text-xs` → `text-sm`
  - Old: `className="w-full flex-1 min-h-[600px] bg-transparent resize-none border-0 text-foreground font-sans text-xs focus:ring-0 leading-relaxed p-0"`
  - New: `className="w-full flex-1 min-h-[600px] bg-transparent resize-none border-0 text-foreground font-sans text-sm focus:ring-0 leading-relaxed p-0"`

---

## ✅ FILE 15: `src/app/components/resume/resume-copilot.tsx`

**Typography changes:**

- **L78** — AI welcome message text: `text-xs` → `text-sm`
  - Old: `<div className="rounded-md neuro-card px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">`
  - New: `<div className="rounded-md neuro-card px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground">`

- **L90** — Suggestion chips: `text-[10px]` → `text-xs`
  - Old: `className="px-2.5 py-1 text-[10px]"`
  - New: `className="px-2.5 py-1.5 text-xs"`

- **L106** — User message text: `text-xs` → `text-sm`
  - Old: `<div className="rounded-md bg-accent-soft px-3 py-2 text-xs leading-relaxed text-foreground">`
  - New: `<div className="rounded-md bg-accent-soft px-3 py-2 text-sm leading-relaxed text-foreground">`

- **L117** — AI response text: `text-xs` → `text-sm`
  - Old: `<div className="rounded-md neuro-card px-3.5 py-2.5 text-xs leading-relaxed prose prose-sm max-w-none">`
  - New: `<div className="rounded-md neuro-card px-3.5 py-2.5 text-sm leading-relaxed prose prose-sm max-w-none">`

**Spacing (input):**

- **L152** — Co-pilot Input: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="flex-1 px-2.5 py-1.5 text-xs"`
  - New: `className="flex-1 px-3 py-2 text-sm"`

- **L167** — Stop/Send buttons: `px-2.5 py-1.5 text-xs` → `px-3 py-2 text-sm`
  - Old: `className="px-2.5 py-1.5 text-xs font-medium"`
  - New: `className="px-3 py-2 text-sm font-medium"`

---

## ✅ FILE 16: `src/app/components/resume/tailor-review-panel.tsx`

**Typography changes:**

- **L118** — Change count description: `text-[10px]` → `text-xs`
  - Old: `<p className="text-[10px] text-muted-foreground mt-0.5">`
  - New: `<p className="text-xs text-muted-foreground mt-0.5">`

- **L170** — Change label text: `text-xs font-medium` — KEEP (it's body, but this is a change diff UI — keep as-is, it's intentionally compact review mode)

- **L177** — "Before" text: `text-[10px]` → `text-xs` (it's a diff showing actual content users read)
  - Old: `<span className="text-[10px] text-muted-foreground line-through opacity-70">`
  - New: `<span className="text-xs text-muted-foreground line-through opacity-70">`

- **L184** — "After" text: `text-[10px]` → `text-xs`
  - Old: `<span className="text-[10px] text-foreground">`
  - New: `<span className="text-xs text-foreground">`

- **L126,132** — Accept/Reject all buttons: `text-[10px]` → `text-xs`
  - Old: `className="px-2 py-1 text-[10px]"`
  - New: `className="px-2.5 py-1.5 text-xs"`

- **L215** — Apply button: `text-xs` → `text-sm`
  - Old: `className="flex-1 px-3 py-2 text-xs font-medium"`
  - New: `className="flex-1 px-3 py-2 text-sm font-medium"`

- **L222** — Cancel button: `text-xs` → `text-sm`
  - Old: `className="px-3 py-2 text-xs"`
  - New: `className="px-3 py-2 text-sm"`

---

## ✅ FILE 17: `src/app/[locale]/(app)/cover-letter/page.tsx`

**Typography changes:**

- **L261** — Page h1 title: `text-sm font-semibold` → `text-base font-semibold`
  - Old: `<h1 className="text-sm font-semibold tracking-tight text-foreground">`
  - New: `<h1 className="text-base font-semibold tracking-tight text-foreground">`

- **L262** — Subtitle: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-muted-foreground mt-0.5">`
  - New: `<p className="text-sm text-muted-foreground mt-0.5">`

- **L275** — Resume select: `text-xs` → `text-sm`
  - Old: `className="min-w-0 flex-1 cursor-pointer rounded-lg neuro-inset px-3 py-2 text-xs font-medium ..."`
  - New: `className="min-w-0 flex-1 cursor-pointer rounded-lg neuro-inset px-3 py-2 text-sm font-medium ..."`

- **L306-320** — Mode toggle buttons: `text-[10px]` → `text-xs` (these ARE CTAs not micro-labels)
  - Old: `className={\`flex-1 rounded-xs py-1 text-[10px] font-semibold ...\`}`
  - New: `className={\`flex-1 rounded-xs py-1.5 text-xs font-semibold ...\`}`

- **L327-343** — Language toggle buttons: same → `text-xs py-1.5`

- **L357** — Company Name Input: `text-sm px-3 py-2.5` already — KEEP

- **L385** — JD Textarea: `text-xs px-2.5 py-1.5` → `text-sm px-3 py-2.5`
  - Old: `className="w-full resize-none rounded-xs text-xs px-2.5 py-1.5 font-sans"`
  - New: `className="w-full resize-none rounded-xs text-sm px-3 py-2.5 font-sans"`

- **L414** — Saved letter name: `text-xs font-medium` → `text-sm font-medium`
  - Old: `<div className="text-xs font-medium text-foreground truncate">`
  - New: `<div className="text-sm font-medium text-foreground truncate">`

- **L447** — Generate button: `text-xs` → `text-sm`
  - Old: `className="w-full rounded-sm py-2 text-xs font-semibold tracking-wide uppercase ..."`
  - New: `className="w-full rounded-sm py-2.5 text-sm font-semibold tracking-wide uppercase ..."`

- **L466** — "Document Preview" label: `text-xs` → `text-sm`
  - Old: `<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Preview</span>`
  - New: `<span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Document Preview</span>`

- **L473-491** — Action buttons (Save, Copy, Export): `text-xs` → `text-sm`
  - Old: `className="flex items-center gap-1 rounded-sm text-xs"`
  - New: `className="flex items-center gap-1 rounded-sm text-sm"`

- **L519** — Letter Textarea: `text-xs` → `text-sm`
  - Old: `className="w-full flex-1 min-h-[600px] bg-transparent resize-none border-0 outline-none text-foreground font-sans text-xs focus:ring-0 leading-relaxed p-0"`
  - New: `className="w-full flex-1 min-h-[600px] bg-transparent resize-none border-0 outline-none text-foreground font-sans text-sm focus:ring-0 leading-relaxed p-0"`

- **L528** — Empty state description: `text-xs` → `text-sm`
  - Old: `<p className="text-xs text-muted-foreground">`
  - New: `<p className="text-sm text-muted-foreground">`

---

## ✅ FILE 18: `src/app/[locale]/(app)/settings/billing/page.tsx`

**Typography changes (per explorer findings):**

- Description text (~L104): `text-xs` → `text-sm`
- Billing interval description (~L114): `text-xs` → `text-sm`
- Warning alert body (~L131): `text-xs` → `text-sm`
- "Manage in Stripe" button (~L141): `text-xs` → `text-sm`, `py-2` → `py-2.5`
- "Upgrade to Pro" button (~L148): `text-xs` → `text-sm`, `py-2` → `py-2.5`
- "Cancel subscription" button (~L158): `text-xs` → `text-sm`, `py-2` → `py-2.5`
- Section heading "Usage this period" (~L169): `text-xs` → `text-sm`
- Feature usage label + counts row (~L180): `text-xs` → `text-sm`

---

## ✅ FILE 19: `src/app/[locale]/(app)/resumes/page.tsx`

**Typography changes (per explorer findings):**

- Resume role subtitle (~L117): `text-xs` → `text-sm`
- Variant list-item button text (~L151): `text-xs` → `text-sm`
- "+N more" variants text (~L161): `text-xs` → `text-sm`
- "Updated {date}" timestamp (~L169): `text-xs` → `text-sm`, `gap-1` → `gap-1.5`
- "Open" button (~L181): `text-xs` → `text-sm`
- "Tailor" button (~L191): `text-xs` → `text-sm`

**Spacing changes:**

- Delete icon button (~L201): `p-1.5` → `p-2`
- Card footer (~L177): `px-3 py-2` → `px-4 py-2.5`

---

## ✅ FILE 20: `src/app/[locale]/(auth)/login/page.tsx`

**Typography changes:**

- Subtitle description (~L84): `text-xs` → `text-sm`, `mt-1` → `mt-2`
- Success alert body (~L89): `text-xs` → `text-sm`
- Error alert body (~L95): `text-xs` → `text-sm`
- "Don't have an account?" prompt (~L175): `text-xs` → `text-sm`, `mt-5` → `mt-6`

**Spacing changes:**

- Email label `mb-1` → `mb-1.5` (~L101)
- Password label `mb-1` → `mb-1.5` (~L117)
- "Forgot password?" link `mb-1` → `mb-1.5` (~L122)

---

## ✅ FILE 21: `src/app/[locale]/(auth)/register/page.tsx`

**Typography changes:**

- Verification description (~L74): `text-xs` → `text-sm`
- "Didn't get an email?" text (~L78): `text-xs` → `text-sm`
- "← Back to sign in" link (~L83): `text-xs` → `text-sm`
- "Start in 30 seconds" subtitle (~L94): `text-xs` → `text-sm`, `mt-1` → `mt-2`
- Error alert (~L99): `text-xs` → `text-sm`
- "Already have an account?" prompt (~L187): `text-xs` → `text-sm`, `mt-5` → `mt-6`

**Spacing changes:**

- Full Name label `mb-1` → `mb-1.5` (~L105)
- Email label `mb-1` → `mb-1.5` (~L120)
- Password label `mb-1` → `mb-1.5` (~L135)

---

## ✅ FILE 22: `src/app/components/marketing/interview-section.tsx`

**Typography changes:**

- Mockup window title (~L76): `text-xs` → `text-sm`
- Mockup AI question body (~L99): `text-xs` → `text-sm`
- Mockup user answer body (~L107): `text-xs` → `text-sm`
- "AI Score & Feedback" heading (~L121): `text-xs` → `text-sm`
- Strength list items (~L139): `text-xs` → `text-sm`
- Improvement list items (~L152): `text-xs` → `text-sm`
- "Next Question" button (~L164): `text-xs` → `text-sm`

---

### 4.5 Vertical-Slice Order

Apply changes file by file. Each file is independently testable by loading the corresponding page/component:

1. Auth pages (login, register) → `/login`, `/register`
2. Dashboard → `/dashboard`
3. Settings → `/settings`
4. Settings billing → `/settings/billing`
5. Resume list → `/resumes`
6. Resume detail (editor + tabs) → `/resume/[id]`
7. Cover letter standalone page → `/cover-letter`
8. ATS view → `/ats`
9. Interview session + summary → `/interview`
10. Applications/Kanban → `/applications`
11. Chat → `/chat`
12. Job search panel (within resume detail) → Find Jobs tab
13. Pipeline components (smart-overview, job-detail-panel)
14. Marketing (interview-section)
15. Chat sub-components (job-preview, upload-card-message, copilot, tailor-review)

---

### 5. Assertion & Testing Requirements

**Unit Tests**: N/A — no behavior change, pure class string changes.

**Integration Tests**: N/A — no API/data changes.

**E2E UI Tests**: N/A — visual-only change (font sizes and spacing). Manual visual review recommended per file after implementation:
- Check that form inputs are readable and not cramped
- Verify label-mono and text-[10px] tag elements are unchanged
- Confirm no layout overflow from increased font sizes

---

### 6. Verification Commands & Log Files

**Build Command**: `pnpm build`

**Lint Command**: `pnpm lint`

**TypeScript Check**: `npx tsc --noEmit`

**Server Log Location**: `.next/` directory for build output; console stderr if compilation fails.

**Manual smoke test**: Start `pnpm dev` and spot-check these pages:
- `/resume/[any-id]` (Editor tab) — check input field sizes
- `/ats` — check textarea and description text
- `/cover-letter` — check the user-flagged page specifically
- `/settings` — check form inputs and section headings
- `/login`, `/register` — check form descriptions

---

### Summary Statistics

| Category | Count |
|----------|-------|
| `text-xs` → `text-sm` changes | ~120 instances |
| `text-[10px]` → `text-xs` changes (CTA buttons that were over-shrunk) | ~8 instances |
| Input padding upgrades (`px-2 py-1` / `px-2.5 py-1.5` → `px-3 py-2`) | ~35 instances |
| Textarea padding upgrades (`p-2.5` → `p-3`) | ~6 instances |
| Button padding upgrades (`py-1` → `py-1.5` or `py-2`) | ~12 instances |
| Label spacing (`mb-1` → `mb-1.5`) | ~8 instances |
| **Total class changes** | **~189 edits** |
| **Files modified** | **21** |
