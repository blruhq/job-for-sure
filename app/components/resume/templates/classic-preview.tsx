'use client'

import type { Resume } from '~/types/resume'

export function ClassicPreview({ resume }: { resume: Resume }) {
  return (
    <div className="resume-paper p-8" data-template="classic">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mb-1  text-[20px] font-bold text-[#1C1B16]">
          {resume.persona || 'Your Name'}
        </div>
        <div className=" text-[10px] text-[#71706A]">
          {[resume.email, resume.phone, resume.location].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Summary */}
      {resume.summary && (
        <div className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">Professional Summary</div>
          <div className=" text-[10px] leading-relaxed text-[#71706A]">{resume.summary}</div>
        </div>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">Skills &amp; Expertise</div>
          <div className="flex flex-wrap justify-center gap-1  text-[10px]">
            {resume.skills.map((s, i) => (
              <span key={s}>
                {i > 0 && <span className="text-[#71706A]"> · </span>}
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">Professional Experience</div>
          {resume.experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <span className=" text-[10px] font-bold italic">{exp.role}</span>
                <span className=" text-[9px] text-[#71706A]">{exp.dates}</span>
              </div>
              <div className="mb-1  text-[9px] text-[#71706A]">{exp.company}</div>
              {exp.bullets.map((b, j) => (
                <div key={j} className="pl-3  text-[10px] leading-relaxed">• {b}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">Education</div>
          {resume.education.map((edu, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <span className=" text-[10px] font-bold">{edu.institution}</span>
                <span className=" text-[9px] text-[#71706A]">{edu.dates}</span>
              </div>
              <div className=" text-[9px] text-[#71706A]">
                {[edu.degree, edu.field].filter(Boolean).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">Projects</div>
          {resume.projects.map((proj, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <span className=" text-[10px] font-bold">
                  {proj.name}{proj.link ? <span className="ml-1 font-mono text-[8px] text-[#71706A]">({proj.link})</span> : ''}
                </span>
              </div>
              <div className="mb-1  text-[9px] leading-relaxed text-[#71706A]">{proj.description}</div>
              {proj.techStack && proj.techStack.length > 0 && (
                <div className=" text-[9px] text-[#71706A]">Technologies: {proj.techStack.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">Certifications</div>
          {resume.certifications.map((cert, i) => (
            <div key={i} className="mb-1">
              <div className="flex justify-between">
                <span className=" text-[10px] font-bold">{cert.name}</span>
                <span className=" text-[9px] text-[#71706A]">{cert.date}</span>
              </div>
              <div className=" text-[9px] text-[#71706A]">{cert.issuer}</div>
            </div>
          ))}
        </div>
      )}

      {/* Languages */}
      {resume.languages && resume.languages.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">Languages</div>
          <div className="flex flex-wrap justify-center gap-4  text-[10px]">
            {resume.languages.map((lang, i) => (
              <div key={i}>
                {lang.name} — {lang.proficiency}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Sections */}
      {resume.customSections && resume.customSections.map((sec, i) => (
        <div key={i} className="mb-4">
          <div className="mb-2 border-b border-[#E6E5DF] pb-1 text-center text-[11px] font-bold ">{sec.title}</div>
          {sec.bullets.map((b, j) => (
            <div key={j} className="pl-3  text-[10px] leading-relaxed">• {b}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
