import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import { registerFonts, COLORS } from './shared-pdf'

registerFonts()

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Lora',
    color: COLORS.text,
    lineHeight: 1.5,
  },
  header: {
    textAlign: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: 'Lora',
    marginBottom: 4,
    color: COLORS.ink,
  },
  role: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: 'Lora',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  contact: {
    fontSize: 9,
    color: COLORS.muted,
    fontFamily: 'Lora',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Lora',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 2,
    marginBottom: 4,
  },
  summary: {
    fontSize: 10,
    color: COLORS.muted,
    lineHeight: 1.5,
    fontFamily: 'Lora',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  skill: {
    fontSize: 10,
    fontFamily: 'Lora',
  },
  skillSeparator: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: 'Lora',
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
    fontStyle: 'italic',
    fontSize: 10,
    fontFamily: 'Lora',
  },
  expDates: {
    fontSize: 9,
    color: COLORS.muted,
    fontFamily: 'Lora',
  },
  expCompany: {
    fontSize: 9,
    color: COLORS.muted,
    fontFamily: 'Lora',
    marginBottom: 1,
  },
  bullet: {
    fontSize: 10,
    marginBottom: 0,
    paddingLeft: 12,
    fontFamily: 'Lora',
    lineHeight: 1.4,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  langText: {
    fontSize: 10,
    fontFamily: 'Lora',
  },
  projectTech: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 1,
    fontFamily: 'Lora',
  },
})

export function ClassicPDF({ resume }: { resume: Resume }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Name & Contact */}
        <View style={styles.header}>
          <Text style={styles.name}>{resume.persona || 'Your Name'}</Text>
          {resume.role && <Text style={styles.role}>{resume.role}</Text>}
          <Text style={styles.contact}>
            {[resume.email, resume.phone, resume.location].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Summary */}
        {resume.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
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
            <Text style={styles.sectionTitle}>Skills & Expertise</Text>
            <View style={styles.skillsRow}>
              {resume.skills.map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Text style={styles.skillSeparator}>  ·  </Text>}
                  <Text style={styles.skill}>{s}</Text>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
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
                    Technologies: {proj.techStack.join(', ')}
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
                  <Text style={{ fontWeight: 700, fontSize: 10, fontFamily: 'Lora' }}>
                    {cert.name}
                  </Text>
                  <Text style={styles.expDates}>{cert.date}</Text>
                </View>
                <Text style={styles.expCompany}>{cert.issuer}</Text>
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
                  {lang.name} — {lang.proficiency}
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
