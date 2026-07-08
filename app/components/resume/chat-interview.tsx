import { useState } from 'react'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'extracurricular', label: 'Extracurricular' },
  { id: 'languages', label: 'Languages' },
]

const SECTION_PROMPTS: Record<string, string> = {
  profile: "What's your full name, email, phone number, and location?",
  education: "Tell me about your education. School, degree, field of study, and graduation year.",
  experience: "What's your work experience? Company, role, dates, and key achievements.",
  skills: "What are your skills? Technical and soft skills.",
  projects: "Any projects you'd like to highlight? Name, description, tech used.",
  extracurricular: "Any extracurricular activities or volunteering?",
  languages: "What languages do you speak and at what level?",
}

export function ChatInterview() {
  const [currentSection, setCurrentSection] = useState(0)
  const current = SECTIONS[currentSection]

  const progress = ((currentSection) / SECTIONS.length) * 100

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-caption text-text-tertiary whitespace-nowrap">
          {currentSection + 1} of {SECTIONS.length}
        </span>
      </div>

      {/* Section sidebar + chat */}
      <div className="flex gap-8">
        <div className="w-40 shrink-0">
          {SECTIONS.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm mb-1 ${
                i === currentSection
                  ? 'bg-accent-muted text-accent font-[510]'
                  : i < currentSection
                  ? 'text-success'
                  : 'text-text-tertiary'
              }`}
            >
              <span className="text-xs">{i < currentSection ? '✓' : i === currentSection ? '→' : '○'}</span>
              {s.label}
            </div>
          ))}
        </div>

        <div className="flex-1">
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-body text-text-primary">{SECTION_PROMPTS[current?.id ?? '']}</p>
            <textarea
              rows={4}
              className="mt-4 w-full rounded-md border border-border bg-page px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-all duration-150"
              placeholder="Type your answer..."
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="rounded-md border border-border px-4 py-1.5 text-sm text-text-primary hover:bg-hover disabled:opacity-40 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentSection(Math.min(SECTIONS.length - 1, currentSection + 1))}
                className="rounded-md bg-accent px-4 py-1.5 text-sm font-[510] text-white hover:bg-accent-hover transition-all"
              >
                {currentSection === SECTIONS.length - 1 ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
