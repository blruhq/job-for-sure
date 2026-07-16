import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type { Resume, ResumeExperience, ResumeEducation, ResumeProject, ResumeCertification, ResumeLanguage, ResumeCustomSection } from '~/types/resume'
import { DEFAULT_SECTION_ORDER } from '~/types/resume'
import { COLORS } from './shared-pdf'

// ── Types ──

export interface SectionStyleSet {
  section: any
  sectionTitle: any
  summary: any
  experienceBlock: any
  expHeader: any
  expRole: any
  expDates: any
  expCompany: any
  bullet: any
  skillsRow: any
  skill: any
  languagesRow: any
  langText: any
  projectTech: any
  skillBadge?: any
  skillsCol?: any
  certItem?: any
}

// ── Section visibility helper ──

/**
 * Returns the list of section IDs that should be rendered in the PDF,
 * in the correct order, respecting sectionOrder and sectionVisibility.
 * Excludes 'basic' (rendered in header) and sections with no data.
 * Supports both legacy 'custom' (one entry for all custom sections)
 * and new cs-{id} entries (individual custom sections in the order).
 */
export function getVisiblePdfSections(resume: Resume): string[] {
  const order = resume.sectionOrder ?? DEFAULT_SECTION_ORDER

  return order.filter((id) => {
    if (id === 'basic') return false

    // Check visibility flag (missing = visible)
    if (resume.sectionVisibility && resume.sectionVisibility[id] === false) {
      return false
    }

    // Handle cs-{id} entries — check if the specific custom section exists
    if (id.startsWith('cs-')) {
      const csId = id.slice(3)
      const section = resume.customSections?.find((s) => s.id === csId)
      if (!section) return false
      const hasBullets = section.bullets?.length > 0
      const hasItems = (section.items?.length ?? 0) > 0
      return hasBullets || hasItems
    }

    // Check if section has data
    switch (id) {
      case 'summary': return !!resume.summary?.trim()
      case 'skills': return (resume.skills?.length ?? 0) > 0
      case 'experience': return (resume.experience?.length ?? 0) > 0
      case 'education': return (resume.education?.length ?? 0) > 0
      case 'projects': return (resume.projects?.length ?? 0) > 0
      case 'certifications': return (resume.certifications?.length ?? 0) > 0
      case 'languages': return (resume.languages?.length ?? 0) > 0
      case 'custom': return (resume.customSections?.length ?? 0) > 0
      default: return false
    }
  })
}

// ── Individual section renderers ──

function SummarySection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Summary</Text>
      <Text style={s.summary}>{resume.summary}</Text>
    </View>
  )
}

function EducationSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Education</Text>
      {resume.education!.map((edu: ResumeEducation, i: number) => (
        <View key={i} style={s.experienceBlock}>
          <View style={s.expHeader}>
            <Text style={s.expRole}>{edu.institution}</Text>
            <Text style={s.expDates}>{edu.dates}</Text>
          </View>
          <Text style={s.expCompany}>
            {[edu.degree, edu.field].filter(Boolean).join(', ')}
          </Text>
        </View>
      ))}
    </View>
  )
}

function SkillsSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  if (s.skillsCol && s.skillBadge) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Skills</Text>
        <View style={s.skillsCol}>
          {resume.skills.map((skill: string, i: number) => (
            <Text key={i} style={s.skillBadge}>{skill}</Text>
          ))}
        </View>
      </View>
    )
  }
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Skills</Text>
      <View style={s.skillsRow}>
        {resume.skills.map((skill: string, i: number) => (
          <Text key={i} style={s.skill}>{skill}</Text>
        ))}
      </View>
    </View>
  )
}

function ExperienceSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Experience</Text>
      {resume.experience!.map((exp: ResumeExperience, i: number) => (
        <View key={i} style={s.experienceBlock}>
          <View style={s.expHeader}>
            <Text style={s.expRole}>{exp.role}</Text>
            <Text style={s.expDates}>{exp.dates}</Text>
          </View>
          <Text style={s.expCompany}>{exp.company}</Text>
          {exp.bullets.map((b: string, j: number) => (
            <Text key={j} style={s.bullet}>• {b}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function ProjectsSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Projects</Text>
      {resume.projects!.map((proj: ResumeProject, i: number) => (
        <View key={i} style={s.experienceBlock}>
          <View style={s.expHeader}>
            <Text style={s.expRole}>
              {proj.name}{proj.link ? ` (${proj.link})` : ''}
            </Text>
          </View>
          <Text style={s.summary}>{proj.description}</Text>
          {proj.techStack && proj.techStack.length > 0 && (
            <Text style={s.projectTech}>
              Tech Stack: {proj.techStack.join(', ')}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

function CertificationsSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Certifications</Text>
      {resume.certifications!.map((cert: ResumeCertification, i: number) => (
        <View key={i} style={s.certItem ?? { marginBottom: 2 }}>
          <View style={s.expHeader}>
            <Text style={{ fontWeight: 600, fontSize: 9 }}>
              {cert.name} ({cert.issuer})
            </Text>
            <Text style={s.expDates}>{cert.date}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function LanguagesSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Languages</Text>
      <View style={s.languagesRow}>
        {resume.languages!.map((lang: ResumeLanguage, i: number) => (
          <Text key={i} style={s.langText}>
            {lang.name} ({lang.proficiency})
          </Text>
        ))}
      </View>
    </View>
  )
}

function CustomSectionsRenderer({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <>
      {resume.customSections!.map((sec: ResumeCustomSection, i: number) => (
        <View key={i} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          {sec.items && sec.items.length > 0 ? (
            sec.items.map((item, j) => (
              <View key={j} style={{ marginBottom: 4 }}>
                {(item.title || item.subtitle) && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 9, fontWeight: 600, color: COLORS.ink }}>
                      {item.title}{item.subtitle ? ` — ${item.subtitle}` : ''}
                    </Text>
                    {item.date ? <Text style={{ fontSize: 8, color: COLORS.muted }}>{item.date}</Text> : null}
                  </View>
                )}
                {item.description ? (
                  <Text style={{ fontSize: 9, color: COLORS.muted }}>• {item.description}</Text>
                ) : null}
                {item.link ? (
                  <Text style={{ fontSize: 8, color: '#5B6ABF' }}>{item.link}</Text>
                ) : null}
              </View>
            ))
          ) : (
            sec.bullets.map((b: string, j: number) => (
              <Text key={j} style={s.bullet}>• {b}</Text>
            ))
          )}
        </View>
      ))}
    </>
  )
}

// ── Main: render sections in dynamic order ──

export function renderPdfSections(resume: Resume, s: SectionStyleSet): React.ReactNode[] {
  const visibleSections = getVisiblePdfSections(resume)
  return visibleSections.map((id) => {
    switch (id) {
      case 'summary': return <SummarySection key={id} resume={resume} s={s} />
      case 'education': return <EducationSection key={id} resume={resume} s={s} />
      case 'skills': return <SkillsSection key={id} resume={resume} s={s} />
      case 'experience': return <ExperienceSection key={id} resume={resume} s={s} />
      case 'projects': return <ProjectsSection key={id} resume={resume} s={s} />
      case 'certifications': return <CertificationsSection key={id} resume={resume} s={s} />
      case 'languages': return <LanguagesSection key={id} resume={resume} s={s} />
      case 'custom': return <CustomSectionsRenderer key={id} resume={resume} s={s} />
      default: {
        // Handle cs-{id} — render individual custom section
        if (id.startsWith('cs-')) {
          const csId = id.slice(3)
          const section = resume.customSections?.find((s) => s.id === csId)
          if (!section) return null
          return (
            <View key={id} style={s.section}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              {section.items && section.items.length > 0 ? (
                section.items.map((item, j) => (
                  <View key={j} style={{ marginBottom: 4 }}>
                    {(item.title || item.subtitle) && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 9, fontWeight: 600, color: COLORS.ink }}>
                          {item.title}{item.subtitle ? ` — ${item.subtitle}` : ''}
                        </Text>
                        {item.date ? <Text style={{ fontSize: 8, color: COLORS.muted }}>{item.date}</Text> : null}
                      </View>
                    )}
                    {item.description ? (
                      <Text style={{ fontSize: 9, color: COLORS.muted }}>• {item.description}</Text>
                    ) : null}
                    {item.link ? (
                      <Text style={{ fontSize: 8, color: '#5B6ABF' }}>{item.link}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                section.bullets.map((b: string, j: number) => (
                  <Text key={j} style={s.bullet}>• {b}</Text>
                ))
              )}
            </View>
          )
        }
        return null
      }
    }
  })
}

// ── Sidebar section renderer (for 2-column templates) ──

export function renderSidebarSections(
  resume: Resume,
  sidebarStyles: {
    sidebarSection: any
    sidebarSectionTitle: any
    skillBadge?: any
    skillsCol?: any
    langText: any
    certItem?: any
  },
  sidebarSectionIds?: string[]
): React.ReactNode[] {
  const order = resume.sectionOrder ?? DEFAULT_SECTION_ORDER
  const defaultSidebarIds = ['skills', 'languages', 'certifications']
  const ids = sidebarSectionIds ?? defaultSidebarIds

  const visibleIds = order.filter((id) => {
    if (!ids.includes(id)) return false
    if (resume.sectionVisibility && resume.sectionVisibility[id] === false) return false
    switch (id) {
      case 'skills': return (resume.skills?.length ?? 0) > 0
      case 'languages': return (resume.languages?.length ?? 0) > 0
      case 'certifications': return (resume.certifications?.length ?? 0) > 0
      default: return false
    }
  })

  return visibleIds.map((id) => {
    switch (id) {
      case 'skills':
        return (
          <View key={id} style={sidebarStyles.sidebarSection}>
            <Text style={sidebarStyles.sidebarSectionTitle}>Skills</Text>
            {sidebarStyles.skillsCol && sidebarStyles.skillBadge ? (
              <View style={sidebarStyles.skillsCol}>
                {resume.skills!.map((skill: string, i: number) => (
                  <Text key={i} style={sidebarStyles.skillBadge}>{skill}</Text>
                ))}
              </View>
            ) : (
              resume.skills!.map((skill: string, i: number) => (
                <Text key={i} style={sidebarStyles.langText}>{skill}</Text>
              ))
            )}
          </View>
        )
      case 'languages':
        return (
          <View key={id} style={sidebarStyles.sidebarSection}>
            <Text style={sidebarStyles.sidebarSectionTitle}>Languages</Text>
            {resume.languages!.map((lang: ResumeLanguage, i: number) => (
              <Text key={i} style={sidebarStyles.langText}>
                {lang.name} — {lang.proficiency}
              </Text>
            ))}
          </View>
        )
      case 'certifications':
        return (
          <View key={id} style={sidebarStyles.sidebarSection}>
            <Text style={sidebarStyles.sidebarSectionTitle}>Certifications</Text>
            {resume.certifications!.map((cert: ResumeCertification, i: number) => (
              <View key={i} style={sidebarStyles.certItem ?? { marginBottom: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: 600 }}>{cert.name}</Text>
                <Text style={{ fontSize: 8, color: COLORS.muted }}>{cert.issuer} · {cert.date}</Text>
              </View>
            ))}
          </View>
        )
      default: return null
    }
  })
}

// ── Main column section renderer (for 2-column templates) ──

export function renderMainSections(resume: Resume, s: SectionStyleSet): React.ReactNode[] {
  const sidebarIds = ['skills', 'languages', 'certifications']
  const visibleSections = getVisiblePdfSections(resume)
    .filter((id) => !sidebarIds.includes(id))

  return visibleSections.map((id) => {
    switch (id) {
      case 'summary': return <SummarySection key={id} resume={resume} s={s} />
      case 'education': return <EducationSection key={id} resume={resume} s={s} />
      case 'experience': return <ExperienceSection key={id} resume={resume} s={s} />
      case 'projects': return <ProjectsSection key={id} resume={resume} s={s} />
      case 'custom': return <CustomSectionsRenderer key={id} resume={resume} s={s} />
      default: {
        if (id.startsWith('cs-')) {
          const csId = id.slice(3)
          const section = resume.customSections?.find((s) => s.id === csId)
          if (!section) return null
          return (
            <View key={id} style={s.section}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              {section.items && section.items.length > 0 ? (
                section.items.map((item, j) => (
                  <View key={j} style={{ marginBottom: 4 }}>
                    {(item.title || item.subtitle) && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 9, fontWeight: 600, color: COLORS.ink }}>
                          {item.title}{item.subtitle ? ` — ${item.subtitle}` : ''}
                        </Text>
                        {item.date ? <Text style={{ fontSize: 8, color: COLORS.muted }}>{item.date}</Text> : null}
                      </View>
                    )}
                    {item.description ? (
                      <Text style={{ fontSize: 9, color: COLORS.muted }}>• {item.description}</Text>
                    ) : null}
                    {item.link ? (
                      <Text style={{ fontSize: 8, color: '#5B6ABF' }}>{item.link}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                section.bullets.map((b: string, j: number) => (
                  <Text key={j} style={s.bullet}>• {b}</Text>
                ))
              )}
            </View>
          )
        }
        return null
      }
    }
  })
}
