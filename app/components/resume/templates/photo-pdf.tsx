import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import { registerFonts, COLORS } from './shared-pdf'

registerFonts()

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    fontFamily: 'Inter',
    color: COLORS.text,
    lineHeight: 1.5,
  },
  body: {
    flexDirection: 'row',
    padding: 36,
    gap: 16,
  },
  sidebar: {
    width: '33%',
    backgroundColor: COLORS.sidebarBg,
    padding: 20,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    objectFit: 'cover',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 700,
  },
  main: {
    width: '67%',
    paddingTop: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 2,
  },
  role: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 16,
  },
  sidebarSection: {
    marginBottom: 14,
  },
  sidebarSectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: COLORS.primary,
    marginBottom: 6,
  },
  sidebarLabel: {
    fontSize: 8,
    color: COLORS.muted,
    fontWeight: 600,
    marginBottom: 1,
  },
  sidebarValue: {
    fontSize: 9,
    marginBottom: 6,
  },
  skillBadge: {
    fontSize: 8,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primary,
    padding: '3 8',
    borderRadius: 3,
    marginBottom: 4,
  },
  skillsCol: {
    flexDirection: 'column',
    gap: 3,
  },
  langText: {
    fontSize: 9,
    marginBottom: 2,
  },
  certItem: {
    marginBottom: 4,
  },
  mainSection: {
    marginBottom: 14,
  },
  mainSectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 3,
    marginBottom: 8,
  },
  summary: {
    fontSize: 10,
    color: COLORS.muted,
    lineHeight: 1.6,
  },
  experienceBlock: {
    marginBottom: 10,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expRole: {
    fontWeight: 600,
    fontSize: 10,
  },
  expDates: {
    fontSize: 8,
    color: COLORS.muted,
    fontFamily: 'JetBrains Mono',
  },
  expCompany: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
  bullet: {
    fontSize: 9,
    marginBottom: 1,
    paddingLeft: 10,
  },
  projectTech: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
})

export function PhotoPDF({ resume }: { resume: Resume }) {
  const initials = getInitials(resume.persona || resume.name)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.body}>
          {/* ── Sidebar ── */}
          <View style={styles.sidebar}>
            {/* Photo / Initials */}
            <View style={styles.photoContainer}>
              {resume.photoUrl ? (
                <Image src={resume.photoUrl} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoInitials}>{initials}</Text>
                </View>
              )}
            </View>

            {/* Contact */}
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Contact</Text>
              {resume.email && (
                <>
                  <Text style={styles.sidebarLabel}>Email</Text>
                  <Text style={styles.sidebarValue}>{resume.email}</Text>
                </>
              )}
              {resume.phone && (
                <>
                  <Text style={styles.sidebarLabel}>Phone</Text>
                  <Text style={styles.sidebarValue}>{resume.phone}</Text>
                </>
              )}
              {resume.location && (
                <>
                  <Text style={styles.sidebarLabel}>Location</Text>
                  <Text style={styles.sidebarValue}>{resume.location}</Text>
                </>
              )}
              {resume.github && (
                <>
                  <Text style={styles.sidebarLabel}>GitHub</Text>
                  <Text style={styles.sidebarValue}>{resume.github}</Text>
                </>
              )}
            </View>

            {/* Skills */}
            {resume.skills.length > 0 && (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Skills</Text>
                <View style={styles.skillsCol}>
                  {resume.skills.map((s, i) => (
                    <Text key={i} style={styles.skillBadge}>{s}</Text>
                  ))}
                </View>
              </View>
            )}

            {/* Languages */}
            {resume.languages && resume.languages.length > 0 && (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Languages</Text>
                {resume.languages.map((lang, i) => (
                  <Text key={i} style={styles.langText}>
                    {lang.name} — {lang.proficiency}
                  </Text>
                ))}
              </View>
            )}

            {/* Certifications */}
            {resume.certifications && resume.certifications.length > 0 && (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Certifications</Text>
                {resume.certifications.map((cert, i) => (
                  <View key={i} style={styles.certItem}>
                    <Text style={{ fontSize: 9, fontWeight: 600 }}>{cert.name}</Text>
                    <Text style={{ fontSize: 8, color: COLORS.muted }}>{cert.issuer} · {cert.date}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Main ── */}
          <View style={styles.main}>
            <Text style={styles.name}>{resume.persona || 'Your Name'}</Text>
            {resume.role && <Text style={styles.role}>{resume.role}</Text>}

            {/* Summary */}
            {resume.summary && (
              <View style={styles.mainSection}>
                <Text style={styles.mainSectionTitle}>Summary</Text>
                <Text style={styles.summary}>{resume.summary}</Text>
              </View>
            )}

            {/* Experience */}
            {resume.experience && resume.experience.length > 0 && (
              <View style={styles.mainSection}>
                <Text style={styles.mainSectionTitle}>Experience</Text>
                {resume.experience.map((exp, i) => (
                  <View key={i} style={styles.experienceBlock}>
                    <View style={styles.expHeader}>
                      <Text style={styles.expRole}>{exp.role}</Text>
                      <Text style={styles.expDates}>{exp.dates}</Text>
                    </View>
                    <Text style={styles.expCompany}>{exp.company}</Text>
                    {exp.bullets.map((b, j) => (
                      <Text key={j} style={styles.bullet}>• {b}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Education */}
            {resume.education && resume.education.length > 0 && (
              <View style={styles.mainSection}>
                <Text style={styles.mainSectionTitle}>Education</Text>
                {resume.education.map((edu, i) => (
                  <View key={i} style={styles.experienceBlock}>
                    <View style={styles.expHeader}>
                      <Text style={styles.expRole}>{edu.institution}</Text>
                      <Text style={styles.expDates}>{edu.dates}</Text>
                    </View>
                    <Text style={styles.expCompany}>
                      {[edu.degree, edu.field].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Projects */}
            {resume.projects && resume.projects.length > 0 && (
              <View style={styles.mainSection}>
                <Text style={styles.mainSectionTitle}>Projects</Text>
                {resume.projects.map((proj, i) => (
                  <View key={i} style={styles.experienceBlock}>
                    <View style={styles.expHeader}>
                      <Text style={styles.expRole}>
                        {proj.name}{proj.link ? ` (${proj.link})` : ''}
                      </Text>
                    </View>
                    <Text style={styles.summary}>{proj.description}</Text>
                    {proj.techStack && proj.techStack.length > 0 && (
                      <Text style={styles.projectTech}>
                        Tech Stack: {proj.techStack.join(', ')}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Custom Sections */}
            {resume.customSections && resume.customSections.map((sec, i) => (
              <View key={i} style={styles.mainSection}>
                <Text style={styles.mainSectionTitle}>{sec.title}</Text>
                {sec.bullets.map((b, j) => (
                  <Text key={j} style={styles.bullet}>• {b}</Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  )
}
