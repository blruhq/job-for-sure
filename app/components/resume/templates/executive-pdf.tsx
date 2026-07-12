import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import { registerFonts, COLORS } from './shared-pdf'

registerFonts()

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    fontFamily: 'Inter',
    color: COLORS.text,
    lineHeight: 1.35,
  },
  headerBar: {
    backgroundColor: COLORS.dark,
    padding: '20 40',
  },
  headerName: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.white,
    marginBottom: 6,
  },
  headerRole: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 4,
  },
  headerContact: {
    fontSize: 8,
    color: '#999999',
    fontFamily: 'JetBrains Mono',
  },
  body: {
    flexDirection: 'row',
    padding: 40,
    paddingTop: 24,
    gap: 20,
  },
  sidebar: {
    width: '30%',
  },
  main: {
    width: '70%',
  },
  sidebarSection: {
    marginBottom: 10,
  },
  sidebarSectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
    marginBottom: 5,
  },
  skillItem: {
    fontSize: 9,
    marginBottom: 3,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  langText: {
    fontSize: 9,
    marginBottom: 2,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  certItem: {
    marginBottom: 4,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  certName: {
    fontSize: 9,
    fontWeight: 600,
  },
  certMeta: {
    fontSize: 8,
    color: COLORS.muted,
  },
  mainSection: {
    marginBottom: 10,
  },
  mainSectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
    marginBottom: 5,
  },
  summary: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.35,
  },
  experienceBlock: {
    marginBottom: 6,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expRole: {
    fontWeight: 700,
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
    fontStyle: 'italic',
    marginBottom: 1,
  },
  bullet: {
    fontSize: 9,
    marginBottom: 0,
    paddingLeft: 10,
  },
  projectTech: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 1,
  },
})

export function ExecutivePDF({ resume }: { resume: Resume }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Dark header bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerName}>{resume.persona || 'Your Name'}</Text>
          {resume.role && <Text style={styles.headerRole}>{resume.role}</Text>}
          <Text style={styles.headerContact}>
            {[resume.email, resume.phone, resume.location, resume.github].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Two-column body */}
        <View style={styles.body}>
          {/* ── Sidebar ── */}
          <View style={styles.sidebar}>
            {/* Skills */}
            {resume.skills.length > 0 && (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Skills</Text>
                {resume.skills.map((s, i) => (
                  <Text key={i} style={styles.skillItem}>{s}</Text>
                ))}
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
                    <Text style={styles.certName}>{cert.name}</Text>
                    <Text style={styles.certMeta}>{cert.issuer} · {cert.date}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Main ── */}
          <View style={styles.main}>
            {/* Summary */}
            {resume.summary && (
              <View style={styles.mainSection}>
                <Text style={styles.mainSectionTitle}>Summary</Text>
                <Text style={styles.summary}>{resume.summary}</Text>
              </View>
            )}

            {/* Education — FIRST for new grads */}
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
                        Tech: {proj.techStack.join(', ')}
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
