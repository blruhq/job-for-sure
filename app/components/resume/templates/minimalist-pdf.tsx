import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import { registerFonts, COLORS } from './shared-pdf'

registerFonts()

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Inter',
    color: COLORS.text,
    lineHeight: 1.35,
  },
  header: {
    textAlign: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
    color: COLORS.ink,
  },
  role: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 4,
  },
  contact: {
    fontSize: 9,
    color: COLORS.muted,
    fontFamily: 'JetBrains Mono',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 2,
    marginBottom: 4,
  },
  summary: {
    fontSize: 10,
    color: COLORS.muted,
    lineHeight: 1.35,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skill: {
    fontSize: 9,
    padding: '2 6',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
  },
  experienceBlock: {
    marginBottom: 6,
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
    fontStyle: 'italic',
    marginBottom: 1,
  },
  bullet: {
    fontSize: 9,
    marginBottom: 0,
    paddingLeft: 10,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  langText: {
    fontSize: 9,
  },
  projectTech: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 1,
  },
})

export function MinimalistPDF({ resume }: { resume: Resume }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Name & Contact */}
        <View style={styles.header}>
          <Text style={styles.name}>{resume.persona || 'Your Name'}</Text>
          {resume.role && <Text style={styles.role}>{resume.role}</Text>}
          <Text style={styles.contact}>
            {[resume.email, resume.phone, resume.location, resume.github].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Summary */}
        {resume.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </View>
        )}

        {/* Education — FIRST for new grads */}
        {resume.education && resume.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
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

        {/* Skills */}
        {resume.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {resume.skills.map((s, i) => (
                <Text key={i} style={styles.skill}>{s}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
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

        {/* Certifications */}
        {resume.certifications && resume.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {resume.certifications.map((cert, i) => (
              <View key={i} style={{ marginBottom: 2 }}>
                <View style={styles.expHeader}>
                  <Text style={{ fontWeight: 600, fontSize: 9 }}>
                    {cert.name} ({cert.issuer})
                  </Text>
                  <Text style={styles.expDates}>{cert.date}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Languages */}
        {resume.languages && resume.languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.languagesRow}>
              {resume.languages.map((lang, i) => (
                <Text key={i} style={styles.langText}>
                  {lang.name} ({lang.proficiency})
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Custom Sections */}
        {resume.customSections && resume.customSections.map((sec, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            {sec.bullets.map((b, j) => (
              <Text key={j} style={styles.bullet}>• {b}</Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  )
}
