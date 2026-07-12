'use client'

import type { Resume } from '~/types/resume'

export function MinimalistPreview({ resume }: { resume: Resume }) {
  return (
    <div className="resume-paper p-8" data-template="minimalist">
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="mb-1 font-sans text-[18px] font-bold text-[#1C1B16]">
          {resume.persona || 'Your Name'}
        </div>
        <div className="font-mono text-[9px] text-[#71706A]">
          {[resume.email, resume.location].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Summary */}
      {resume.summary && (
        <div className="mb-3.5">
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">Summary</div>
          <div className="text-[10px] leading-relaxed text-[#71706A]">{resume.summary}</div>
        </div>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <div className="mb-3.5">
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">Skills</div>
          <div className="flex flex-wrap gap-1">
            {resume.skills.map((s) => (
              <span key={s} className="rounded-sm border border-[#E6E5DF] px-1.5 py-0.5 text-[9px]">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <div className="mb-3.5">
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">Experience</div>
          {resume.experience.map((exp, i) => (
            <div key={i} className="mb-2.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-semibold">{exp.role}</span>
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
        <div className="mb-3.5">
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">Education</div>
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
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">Projects</div>
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

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <div className="mb-3.5">
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">Certifications</div>
          {resume.certifications.map((cert, i) => (
            <div key={i} className="mb-1 flex justify-between">
              <span className="text-[9px] font-semibold">{cert.name} <span className="font-normal text-[#71706A]">({cert.issuer})</span></span>
              <span className="font-mono text-[8px] text-[#71706A]">{cert.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* Languages */}
      {resume.languages && resume.languages.length > 0 && (
        <div className="mb-3.5">
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">Languages</div>
          <div className="flex flex-wrap gap-3">
            {resume.languages.map((lang, i) => (
              <div key={i} className="text-[9px]">
                <span className="font-semibold">{lang.name}</span>: <span className="text-[#71706A]">{lang.proficiency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Sections */}
      {resume.customSections && resume.customSections.map((sec, i) => (
        <div key={i} className="mb-3.5">
          <div className="mb-1.5 border-b border-[#E6E5DF] pb-1 text-[10px] font-bold uppercase tracking-[0.5px]">{sec.title}</div>
          {sec.bullets.map((b, j) => (
            <div key={j} className="pl-2.5 text-[9px] leading-relaxed">• {b}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
