'use client'

import type { Resume } from '~/types/resume'

export function ExecutivePreview({ resume }: { resume: Resume }) {
  return (
    <div className="resume-paper p-8" data-template="executive">
      {/* Dark header bar */}
      <div className="bg-[#1C1B18] px-10 py-6">
        <div className="text-[22px] font-bold text-white">{resume.persona || 'Your Name'}</div>
        {resume.role && <div className="text-[12px] text-[#5B6ABF]">{resume.role}</div>}
        <div className="font-mono text-[8px] text-[#999]">
          {[resume.email, resume.phone, resume.location, resume.github].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex gap-5 p-10">
        {/* Sidebar */}
        <div className="w-[30%] shrink-0">
          {/* Skills */}
          {resume.skills.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">Skills</div>
              {resume.skills.map((s) => (
                <div key={s} className="mb-1 border-l-2 border-[#5B6ABF] pl-2 text-[10px]">{s}</div>
              ))}
            </div>
          )}

          {/* Languages */}
          {resume.languages && resume.languages.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">Languages</div>
              {resume.languages.map((lang, i) => (
                <div key={i} className="mb-0.5 border-l-2 border-[#5B6ABF] pl-2 text-[9px]">
                  {lang.name} — {lang.proficiency}
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">Certifications</div>
              {resume.certifications.map((cert, i) => (
                <div key={i} className="mb-1.5 border-l-2 border-[#5B6ABF] pl-2">
                  <div className="text-[9px] font-semibold">{cert.name}</div>
                  <div className="text-[8px] text-[#71706A]">{cert.issuer} · {cert.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main */}
        <div className="flex-1">
          {/* Summary */}
          {resume.summary && (
            <div className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">Executive Summary</div>
              <div className="text-[11px] leading-relaxed">{resume.summary}</div>
            </div>
          )}

          {/* Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">Experience</div>
              {resume.experience.map((exp, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold">{exp.role}</span>
                    <span className="font-mono text-[8px] text-[#71706A]">{exp.dates}</span>
                  </div>
                  <div className="mb-1 text-[9px] italic text-[#71706A]">{exp.company}</div>
                  {exp.bullets.map((b, j) => (
                    <div key={j} className="pl-2.5 text-[9px] leading-relaxed">• {b}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">Education</div>
              {resume.education.map((edu, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold">{edu.institution}</span>
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
            <div className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">Projects</div>
              {resume.projects.map((proj, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold">
                      {proj.name}{proj.link ? <span className="ml-1 font-mono text-[8px] text-[#71706A]">({proj.link})</span> : ''}
                    </span>
                  </div>
                  <div className="mb-1 text-[9px] leading-relaxed text-[#71706A]">{proj.description}</div>
                  {proj.techStack && proj.techStack.length > 0 && (
                    <div className="text-[8px] text-[#71706A]">Tech: {proj.techStack.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Custom Sections */}
          {resume.customSections && resume.customSections.map((sec, i) => (
            <div key={i} className="mb-4">
              <div className="mb-2 border-b border-[#5B6ABF] pb-0.5 text-[10px] font-bold uppercase text-[#5B6ABF]">{sec.title}</div>
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
