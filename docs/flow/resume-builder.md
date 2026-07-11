# Flow Spec: Resume Builder

## User Story
> As a user, I want to upload or create a resume, edit it with proper form fields, choose a template, and export it as a professional PDF.

## Entry Points
- Chat → "Create a resume" → AI guides through upload or manual input
- Dashboard → "My Resumes" → select existing → edit
- ATS Match → "Tailor for this job" → creates tailored variant

## Flow States

### Upload / Parse
```
1. User uploads PDF or pastes text
2. PDF path: pdfjs-dist extracts text → AI parses → fills Resume type
3. Text path: AI parses directly
4. If AI parsing fails → fallback to minimal blank form
5. User can edit parsed result
```

### Editor (Tab: "Resume Editor")
```
Sections (all optional, add/remove):
├── Name / Email / Phone / Location / GitHub   (always shown)
├── Professional Summary                       (textarea)
├── Skills                                     (tag input, type+Enter)
├── Work Experience                            (dynamic list)
│   ├── Company, Role, Dates, Location
│   └── Bullet points (textarea, one per line)
├── Education                                  (dynamic list)
│   ├── Institution, Degree, Field, Dates
│   └── GPA (optional)
├── Projects                                   (dynamic list, tech-heavy)
│   ├── Name, Description, Tech Stack, Link
│   └── Add multiple
├── Certifications                             (dynamic list, general)
│   ├── Name, Issuer, Date
│   └── Add multiple
├── Publications                               (dynamic list)
│   ├── Title, Publisher, Date, URL
│   └── Add multiple
├── Languages                                  (dynamic list)
│   ├── Language, Proficiency
│   └── Add multiple
└── [+ Add Section]                            (button, opens picker)

Right sidebar: AI Co-Pilot
├── Suggests rewrites ("Improve this bullet")
├── Detects missing sections ("I see you're in finance — add Certifications?")
├── Optimizes for ATS ("Add these keywords:")
└── Real-time chat interface
```

### View / Template (Tab: "View Resume")
```
Template Selector:
├── Minimalist (Georgia, single column, clean)
│   Best for: finance, law, consulting, traditional roles
├── Modern (Inter, 2-column with skill badges)
│   Best for: tech, design, product, marketing
└── Classic (Times New Roman, centered header)
    Best for: senior exec, academic, government

AI recommendation: "Based on your resume content, Modern might fit well"
User can accept or override freely.
```

### Export
```
[Export PDF]  →  server-side @react-pdf/renderer  →  downloads A4 PDF
[Export DOCX] →  future (mammoth.js or cloud API)
```

## Edge Cases
- **Empty resume**: User tries to export with no sections → show "Add at least one section"
- **Parse failure**: PDF unreadable → show AI suggestion: "I couldn't read this PDF. Try copying the text directly."
- **AI suggestion rejected**: User clicks "Not now" → don't ask again for this session
- **Template mismatch**: User selects Classic but has projects section → still renders, layout adjusts
