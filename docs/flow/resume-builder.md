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
1. User uploads PDF, DOCX, TXT, or MD file
2. Client sends File to /api/parse-resume via FormData (no client-side extraction)
3. Server extracts text:
   ├── PDF  → unpdf (server-side pdfjs, no CDN worker)
   ├── DOCX → mammoth
   └── TXT/MD → plain text read
4. Server sends extracted text to AI for structured parsing
5. AI prompt always infers role/title (never empty)
6. If AI returns empty role → safety-net infers from skills/experience
7. If AI parsing fails → fallback to minimal blank form
8. Resume object created:
   ├── resume.name    = Filename without extension (display title for sidebar/dropdowns)
   ├── resume.role    = AI-detected role title (used for job search queries)
   └── resume.persona = Candidate's real name (used for cover letter sign-offs)
9. User can edit parsed result

Rejected formats:
   ├── .doc → "Please save as .docx or PDF"
   └── Other → "Unsupported format"

OCR fallback (deferred): tesseract.js for Canva/scanned PDFs
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
                   Uses local TTF fonts (public/fonts/) — no CDN dependency
[Export DOCX] →  future (docx npm package)
```

## Edge Cases
- **Empty resume**: User tries to export with no sections → show "Add at least one section"
- **Parse failure**: PDF unreadable → show AI suggestion: "I couldn't read this PDF. Try copying the text directly."
- **AI suggestion rejected**: User clicks "Not now" → don't ask again for this session
- **Template mismatch**: User selects Classic but has projects section → still renders, layout adjusts
