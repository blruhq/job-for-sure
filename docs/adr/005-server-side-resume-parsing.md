# ADR 005: Server-Side Resume Parsing

**Date:** 2026-07-12
**Status:** Accepted

## Context

The original resume parsing flow used client-side `pdfjs-dist` with a CDN worker to extract text from PDF files in the browser. This caused multiple production issues:

1. **CDN worker failures** — the `cdnjs` worker URL was unreliable, causing silent extraction failures.
2. **Google Docs PDF incompatibility** — the manual Y-coordinate row-grouping algorithm produced garbled text for PDFs with non-standard text positioning.
3. **Incomplete parsing** — extracted text was truncated or fragmented, causing the AI parser to miss sections (Education, Projects, Open Source, etc.).
4. **Role extraction failures** — when parsing produced garbage, the AI returned an empty `role` field, causing the resume to be named after the filename (e.g., "resume-foreign (3)") instead of the actual job title.
5. **Cascade failures** — wrong resume name → wrong job search query → zero job results → no "View all" button.
6. **No DOCX support** — the file input only accepted `.pdf`, `.txt`, `.md`. Microsoft Word resumes were rejected.
7. **PDF export crash** — `@react-pdf/renderer` crashed on `fontStyle: 'italic'` because no italic Inter variant was registered, and CDN woff2 URLs were unreliable.

## Decision

Move all file parsing to the server side. The client sends the raw `File` via `FormData`; the server handles extraction and AI parsing.

Separated display names from search queries in the `Resume` data model to avoid title conflicts (e.g. filename showing up as search query):
- `resume.name`: Stores the display name (uploaded filename without extension, or custom title).
- `resume.role`: Stores the AI-detected job title (e.g. "Software Engineer"), used internally for job searches and AI coach context.
- `resume.persona`: Stores the candidate's real name, used for letter sign-off.

Moved the Job Preview cards from the fixed top panel directly into the Agent Chat scrollable message list:
- Added a `bottomContent` slot to `AgentChat` and `MessageList` components.
- The 5 matching job cards now flow inline as part of the chat stream instead of being pinned.

### Tools

| Task | Tool | Rationale |
|------|------|-----------|
| PDF text extraction | `unpdf` | Server-side pdfjs wrapper, no CDN worker, edge-runtime compatible |
| DOCX text extraction | `mammoth` | Standard Node.js .docx parser, well-maintained |
| OCR fallback (deferred) | `tesseract.js` | For Canva/scanned PDFs — deferred to future phase |
| PDF export | `@react-pdf/renderer` | Already in stack, fixed font registration to use local TTF files |

### API Design

`POST /api/parse-resume` accepts two content types:
- `multipart/form-data` with `file` field → server extracts text
- `application/json` with `{ text }` → backward compatibility for paste paths

### AI Prompt Changes

- `role` field is marked REQUIRED in the system prompt — never return empty
- Safety-net fallback: if AI still returns empty role, infer from skills/experience
- Char cap raised from 12K → 20K to capture full resumes
- `maxOutputTokens` raised from 3K → 4K for complete section extraction

### Font Fix

- Replaced CDN woff2 URLs with local TTF files in `public/fonts/`
- Removed `fontStyle: 'italic'` that referenced unregistered font variant
- Both `resume-pdf.tsx` and `cover-letter-pdf.tsx` updated

## Consequences

- **Positive:** Reliable extraction for Google Docs, Word, LaTeX, and LinkedIn PDFs. DOCX support added. PDF export works. Role always populated. Job search returns relevant results.
- **Positive:** Sidebar and profile dropdown show user-friendly file/custom titles, while job search queries remain highly targeted via separate role field.
- **Positive:** Cleaner chat UI: matching job recommendations flow naturally in the conversation instead of being pinned to the top of the viewport.
- **Positive:** Zero client bundle impact — all parsing libraries are server-only.
- **Negative:** Server processing time increases (extraction + AI parse in one request). Mitigated by `maxDuration = 60`.
- **Negative:** `.doc` (legacy binary format) is not supported. Users are asked to save as `.docx` or PDF.
- **Deferred:** Canva/scanned PDFs still produce garbage text. OCR fallback is planned but not implemented. Users get a friendly error message in the meantime.
