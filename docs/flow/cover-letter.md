# Flow Spec: Cover Letter Generation

## User Story
> As a user, I want to generate a tailored cover letter for a specific job, edit it, and export it alongside my resume.

## Entry Points
- Resume Detail → "Cover Letter" tab
- ATS Match → "Generate Cover Letter" action
- Chat → "Write a cover letter for this job"

## Flow States

### Input
```
User provides:
├── Required: Company name + role
├── Optional: Job description text
└── Optional: Custom notes / instructions
```

### Generation
```
1. AI receives:
   ├── Resume (all sections)
   ├── Company + role
   ├── Job description (if provided)
   └── Custom instructions (if any)
2. AI generates via generateTextWithFailover()
3. Result is stored as CoverLetter record in DB
4. User sees generated letter in editor
```

### Editor
```
┌──────────────────────────────────────────────────┐
│  Cover Letter · Acme Corp — Sr. Engineer         │
│                                                   │
│  [Edit content directly in textarea]              │
│                                                   │
│  Dear Hiring Manager,                             │
│                                                   │
│  I'm excited to apply for...                      │
│                                                   │
│  Sincerely,                                       │
│  [Your Name]                                      │
│                                                   │
│  [Regenerate]  [Edit Tone: Professional/Casual]   │
│  [Export PDF]   [Save]                            │
└──────────────────────────────────────────────────┘
```

### Actions
```
├── Regenerate → AI rewrites with current context
├── Edit Tone → drop down: Professional / Warm / Concise
├── Export PDF → @react-pdf/renderer → download
├── Save → persist to DB
```

## Edge Cases
- **No job description provided**: AI generates a general cover letter. Quality is lower but usable.
- **Very long JD (>4000 words)**: AI summarizes JD first, then generates letter.
- **User edits then regenerates**: User loses edits. Show confirmation: "Regenerating will replace your changes. Continue?"
- **Cover letter too long**: AI generates ~300 words max. If longer, suggest trimming.
