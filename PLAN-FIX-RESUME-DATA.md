# PLAN: Fix Resume Data Integrity — Stop AI Fabrication + Make Role Editable

## Problem Summary

The resume parser **fabricates** a `role` field ("Software Engineer") that:
1. Is displayed under the user's name in 3 of 5 PDF templates
2. **Cannot be edited** — there is no input field for it in the editor
3. Is hardcoded as fallback even when the AI returns empty

The user's words: *"it should just extract text honest no adding no anything and render as pdf"*

## Root Causes

| # | File | Problem |
|---|------|---------|
| 1 | `app/api/parse-resume/route.ts` L150-151 | AI prompt says role is REQUIRED, "Never return empty string" |
| 2 | `app/api/parse-resume/route.ts` L167-180 | Safety-net hardcodes "Software Engineer" / "Frontend Developer" |
| 3 | `app/components/resume/templates/modern-pdf.tsx` L158 | Renders `{resume.role}` under name — AI-fabricated text on resume |
| 4 | `app/components/resume/templates/executive-pdf.tsx` L147 | Same — renders `{resume.role}` |
| 5 | `app/components/resume/templates/photo-pdf.tsx` L255 | Same — renders `{resume.role}` |
| 6 | `app/components/resume/resume-detail.tsx` L351-364 | No `editRole` state — role is invisible/uneditable |
| 7 | `app/components/resume/resume-detail.tsx` L704-720 | `saveChanges()` doesn't include `role` |

---

## Step-by-Step Instructions (8 Steps)

### Step 1: Fix Parser — Stop fabricating role

**File:** `app/api/parse-resume/route.ts`

#### 1a. Change the AI prompt (line 150-151)

FIND this exact text (lines 150-151):
```
6. Role Targeting:
   - "role" (root-level field) is REQUIRED. Infer the target job title (e.g. "Software Engineer", "Frontend Developer"). Never return empty string.
```

REPLACE with:
```
6. Role / Headline:
   - "role": Extract the person's professional headline or target job title ONLY if it appears explicitly in the resume text (e.g., a title under their name, or their most recent job title).
   - If the resume does NOT have an explicit headline or target role, return empty string "". Do NOT guess or infer.
```

#### 1b. Delete the safety-net hardcoding (lines 167-181)

FIND this exact block:
```typescript
    // ── Safety net: if AI still returns empty role, infer from skills/summary ──
    if (!parsed.role) {
      const skillsLower = parsed.skills.join(' ').toLowerCase()
      if (skillsLower.includes('frontend') || skillsLower.includes('react') || skillsLower.includes('vue')) {
        parsed.role = 'Frontend Developer'
      } else if (skillsLower.includes('backend') || skillsLower.includes('node') || skillsLower.includes('go') || skillsLower.includes('python')) {
        parsed.role = 'Software Engineer'
      } else if (skillsLower.includes('data') || skillsLower.includes('sql') || skillsLower.includes('python')) {
        parsed.role = 'Data Analyst'
      } else if (parsed.experience.length > 0 && parsed.experience[0].role) {
        parsed.role = parsed.experience[0].role
      } else {
        parsed.role = 'Software Engineer'
      }
    }
```

REPLACE with:
```typescript
    // Role is now extract-only — no fabrication.
    // If empty, leave empty. Job search will prompt the user for a target role.
```

---

### Step 2: Add `editRole` state to the editor

**File:** `app/components/resume/resume-detail.tsx`

FIND (line 356):
```typescript
  const [editGithub, setEditGithub] = useState(resume?.github ?? '')
```

INSERT AFTER it:
```typescript
  const [editRole, setEditRole] = useState(resume?.role ?? '')
```

---

### Step 3: Add Role input field to the editor UI

**File:** `app/components/resume/resume-detail.tsx`

FIND the "basic" section's GitHub/Location block (lines 452-461):
```tsx
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="label-mono mb-1 block">Location</label>
                <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
              </div>
              <div className="flex-1">
                <label className="label-mono mb-1 block">GitHub / Portfolio</label>
                <input value={editGithub} onChange={(e) => setEditGithub(e.target.value)} placeholder="https://github.com/..." className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
              </div>
            </div>
```

INSERT this new row AFTER the closing `</div>` of that block (after line 461, before line 462's `</>`):
```tsx
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="label-mono mb-1 block">Headline / Target Role</label>
                <input value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder="e.g. Software Engineer (shown under your name on PDF)" className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />
              </div>
            </div>
```

---

### Step 4: Include `role` in `saveChanges()`

**File:** `app/components/resume/resume-detail.tsx`

FIND (line 706):
```typescript
      name: editName,
      persona: editPersona,
```

INSERT AFTER `persona: editPersona,`:
```typescript
      role: editRole,
```

The final `saveChanges` should look like:
```typescript
  const saveChanges = () => {
    updateResume(resume.id, {
      name: editName,
      persona: editPersona,
      role: editRole,
      email: editEmail,
      location: editLocation,
      phone: editPhone,
      github: editGithub,
      summary: editSummary,
      skills: editSkillsArr,
      experience: editExperiences,
      education: editEducations,
      projects: editProjectsArr,
      certifications: editCertifications,
      languages: editLanguages,
      customSections: editCustomSections,
    })
    notify({ message: 'Resume saved', type: 'success' })
    setTab('jobs')
  }
```

---

### Step 5: Fix Modern template — tighten name spacing

**File:** `app/components/resume/templates/modern-pdf.tsx`

FIND the `name` style (lines 22-27):
```
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 4,
  },
```

CHANGE `marginBottom: 4` to `marginBottom: 6`:
```
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 6,
  },
```

Also FIND the `role` style (lines 28-32):
```
  role: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 2,
  },
```

CHANGE `marginBottom: 2` to `marginBottom: 4`:
```
  role: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 4,
  },
```

---

### Step 6: Fix Executive template — tighten name spacing

**File:** `app/components/resume/templates/executive-pdf.tsx`

FIND the `headerName` style (lines 19-24):
```
  headerName: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.white,
    marginBottom: 4,
  },
```

CHANGE `marginBottom: 4` to `marginBottom: 6`:
```
  headerName: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.white,
    marginBottom: 6,
  },
```

Also FIND the `headerRole` style (lines 25-29):
```
  headerRole: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 2,
  },
```

CHANGE `marginBottom: 2` to `marginBottom: 4`:
```
  headerRole: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 4,
  },
```

---

### Step 7: Fix Photo template — tighten name spacing

**File:** `app/components/resume/templates/photo-pdf.tsx`

FIND the `name` style (lines 64-69):
```
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 4,
  },
```

CHANGE `marginBottom: 4` to `marginBottom: 6`:
```
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 6,
  },
```

---

### Step 8: Verify and commit

Run these commands in order:

```bash
npx tsc --noEmit
pnpm build
git add -A && git commit -m "fix: stop parser from fabricating role, make role editable in editor, fix name spacing"
git push
```

If `tsc` or `build` fails, DO NOT commit. Read the error, fix it, re-run.

---

## What This Plan Does NOT Change (Intentional)

| Item | Reason |
|------|--------|
| `resume.role` still exists in the type | It's used by job search, copilot, cover letter, chat AI context |
| `resume.role` still renders in PDF templates | If the user types a headline, it SHOULD show. If empty, `{resume.role && ...}` already hides it |
| Minimalist & Classic templates | They don't render `role` at all — no change needed |
| Job search uses `resume.role` | Still works — empty role = empty default search query (user types their own) |

## Expected Behavior After Fix

```
BEFORE:                          AFTER:
─────────────────────────────────────────────────────
User uploads resume              User uploads resume
  ↓                                ↓
AI parses + INVENTS role          AI parses + extracts role ONLY if in text
"Software Engineer"               (empty if no headline in resume)
  ↓                                ↓
PDF shows "Software Engineer"     PDF shows nothing under name (empty)
under name                        ↓
  ↓                              User opens Editor
User can't change it              ↓
  ↓                              Sees "Headline / Target Role" field
STUCK WITH AI'S GUESS            Types what they want (or leaves blank)
                                  ↓
                                  PDF shows their actual choice
```
