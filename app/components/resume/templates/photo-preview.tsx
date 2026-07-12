'use client'

import type { Resume } from '~/types/resume'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export function PhotoPreview({ resume }: { resume: Resume }) {
  const initials = getInitials(resume.persona || resume.name)

  return (
    <div className="resume-paper" data-template="photo">
      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-[33%] shrink-0 bg-[#F8F8F5] p-5">
          {/* Photo / Initials */}
          <div className="mb-4 flex justify-center">
            {resume.photoUrl ? (
              <img
                src={resume.photoUrl}
                alt="Profile"
                className="h-[100px] w-[100px] rounded-full object-cover"
              />
            ) : (
              <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-[#5B6ABF] text-[28px] font-bold text-white">
                {initials}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="mb-3.5">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.5px] text-[#5B6ABF]">Contact</div>
            {resume.email && (
              <>
                <div className="text-[8px] font-semibold text-[#71706A]">Email</div>
                <div className="mb-1.5 text-[9px]">{resume.email}</div>
              </>
            )}
            {resume.phone && (
              <>
                <div className="text-[8px] font-semibold text-[#71706A]">Phone</div>
                <div className="mb-1.5 text-[9px]">{resume.phone}</div>
              </>
            )}
            {resume.location && (
              <>
                <div className="text-[8px] font-semibold text-[#71706A]">Location</div>
                <div className="mb-1.5 text-[9px]">{resume.location}</div>
              </>
            )}
            {resume.github && (
              <>
                <div className="text-[8px] font-semibold text-[#71706A]">GitHub</div>
                <div className="mb-1.5 text-[9px]">{resume.github}</div>
              </>
            )}
          </div>

          {/* Skills */}
          {resume.skills.length > 0 && (
            <div className="mb-3.5">
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.5px] text-[#5B6ABF]">Skills</div>
              <div className="flex flex-col gap-1">
                {resume.skills.map((s) => (
                  <span key={s} className="rounded-sm bg-[#5B6ABF]/10 px-2 py-0.5 text-[8px] text-[#5B6ABF]">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {resume.languages && resume.languages.length > 0 && (
            <div className="mb-3.5">
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.5px] text-[#5B6ABF]">Languages</div>
              {resume.languages.map((lang, i) => (
                <div key={i} className="mb-0.5 text-[9px]">{lang.name} — {lang.proficiency}</div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <div className="mb-3.5">
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.5px] text-[#5B6ABF]">Certifications</div>
              {resume.certifications.map((cert, i) => (
                <div key={i} className="mb-1">
                  <div className="text-[9px] font-semibold">{cert.name}</div>
                  <div className="text-[8px] text-[#71706A]">{cert.issuer} · {cert.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 pt-4">
          <div className="text-[22px] font-bold text-[#1C1B16]">{resume.persona || 'Your Name'}</div>
          {resume.role && <div className="mb-4 text-[12px] text-[#71706A]">{resume.role}</div>}

          {/* Summary */}
          {resume.summary && (
            <div className="mb-3.5">
              <div className="mb-2 border-b-2 border-[#5B6ABF] pb-0.5 text-[11px] font-bold uppercase text-[#5B6ABF]">Summary</div>
              <div className="text-[10px] leading-relaxed text-[#71706A]">{resume.summary}</div>
            </div>
          )}

          {/* Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <div className="mb-3.5">
              <div className="mb-2 border-b-2 border-[#5B6ABF] pb-0.5 text-[11px] font-bold uppercase text-[#5B6ABF]">Experience</div>
              {resume.experience.map((exp, i) => (
                <div key={i} className="mb-2.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-semibold">{exp.role}</span>
                    <span className="font-mono text-[8px] text-[#71706A]">{exp.dates}</span>
                  </div>
                  <div className="mb-1 text-[9px] text-[#71706A]">{exp.company}</div>
                  {exp.bullets.map((b, j) => (
                    <div key={j} className="pl-2.5 text-[9px] leading-relaxed">• {b}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <div className="mb-3.5">
              <div className="mb-2 border-b-2 border-[#5B6ABF] pb-0.5 text-[11px] font-bold uppercase text-[#5B6ABF]">Education</div>
              {resume.education.map((edu, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-semibold">{edu.institution}</span>
                    <span className="font-mono text-[8px] text-[#71706A]">{edu.dates}</span>
                  </div>
                  <div className="text-[9px] text-[#71706A]">
                    {[edu.degree, edu.field].filter(Boolean).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <div className="mb-3.5">
              <div className="mb-2 border-b-2 border-[#5B6ABF] pb-0.5 text-[11px] font-bold uppercase text-[#5B6ABF]">Projects</div>
              {resume.projects.map((proj, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-semibold">
                      {proj.name}{proj.link ? <span className="ml-1 font-mono text-[8px] text-[#71706A]">({proj.link})</span> : ''}
                    </span>
                  </div>
                  <div className="mb-1 text-[9px] leading-relaxed text-[#71706A]">{proj.description}</div>
                  {proj.techStack && proj.techStack.length > 0 && (
                    <div className="text-[8px] text-[#71706A]">Tech Stack: {proj.techStack.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Custom Sections */}
          {resume.customSections && resume.customSections.map((sec, i) => (
            <div key={i} className="mb-3.5">
              <div className="mb-2 border-b-2 border-[#5B6ABF] pb-0.5 text-[11px] font-bold uppercase text-[#5B6ABF]">{sec.title}</div>
              {sec.bullets.map((b, j) => (
                <div key={j} className="pl-2.5 text-[9px] leading-relaxed">• {b}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
