/**
 * Normalize a permissive AI-parsed resume payload (optional fields, partial
 * data) into the strict shapes the `Resume` type expects.
 *
 * Used by every client that POSTs to `/api/parse-resume` or
 * `/api/resume/from-chat` — chat-view, upload-modal, cover-letter page.
 */

export type ParsedResumeFields = {
  role?: string
  name?: string
  email?: string
  phone?: string
  location?: string
  github?: string
  summary?: string
  skills?: string[]
  experience?: Array<{ company?: string; role?: string; dates?: string; bullets?: string[] }>
  education?: Array<{ institution?: string; degree?: string; field?: string; dates?: string }>
  projects?: Array<{ name?: string; description?: string; techStack?: string[]; link?: string }>
  certifications?: Array<{ name?: string; issuer?: string; date?: string }>
  languages?: Array<{ name?: string; proficiency?: string }>
  customSections?: Array<{ title?: string; bullets?: string[]; id?: string }>
  persona?: string
}

export function normalizeParsed(parsed: ParsedResumeFields) {
  return {
    role: parsed.role ?? '',
    persona: parsed.name ?? parsed.persona ?? 'Your Name',
    email: parsed.email ?? '',
    phone: parsed.phone ?? '',
    location: parsed.location ?? '',
    github: parsed.github ?? '',
    summary: parsed.summary ?? '',
    skills: parsed.skills?.length ? parsed.skills : [],
    experience: (parsed.experience ?? []).map((e) => ({
      company: e.company ?? '',
      role: e.role ?? '',
      dates: e.dates ?? '',
      bullets: e.bullets ?? [],
    })),
    education: (parsed.education ?? []).map((e) => ({
      institution: e.institution ?? '',
      degree: e.degree ?? '',
      field: e.field ?? '',
      dates: e.dates ?? '',
    })),
    projects: (parsed.projects ?? []).map((p) => ({
      name: p.name ?? '',
      description: p.description ?? '',
      techStack: p.techStack ?? [],
      link: p.link ?? '',
    })),
    certifications: (parsed.certifications ?? []).map((c) => ({
      name: c.name ?? '',
      issuer: c.issuer ?? '',
      date: c.date ?? '',
    })),
    languages: (parsed.languages ?? []).map((l) => ({
      name: l.name ?? '',
      proficiency: l.proficiency ?? '',
    })),
    customSections: (parsed.customSections ?? []).map((cs) => ({
      id: cs.id ?? crypto.randomUUID(),
      title: cs.title ?? '',
      bullets: cs.bullets ?? [],
    })),
  }
}
