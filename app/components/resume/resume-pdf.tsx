import React from 'react'
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0I5nvw.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7W0I5nvw.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7W0I5nvw.woff2', fontWeight: 700 },
  ],
})

Font.register({
  family: 'JetBrains Mono',
  src: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaTxj.woff2',
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Inter',
    color: '#1C1B16',
    lineHeight: 1.5,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  contact: {
    fontSize: 9,
    color: '#71706A',
    fontFamily: 'JetBrains Mono',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E5DF',
    paddingBottom: 4,
    marginBottom: 6,
  },
  summary: {
    fontSize: 10,
    color: '#71706A',
    lineHeight: 1.6,
  },
  skillsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  skill: {
    fontSize: 9,
    padding: '2 6',
    borderWidth: 1,
    borderColor: '#E6E5DF',
    borderRadius: 2,
  },
  experienceBlock: {
    marginBottom: 10,
  },
  expHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
  },
  expRole: {
    fontWeight: 600,
    fontSize: 10,
  },
  expDates: {
    fontSize: 8,
    color: '#71706A',
    fontFamily: 'JetBrains Mono',
  },
  expCompany: {
    fontSize: 9,
    color: '#71706A',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  bullet: {
    fontSize: 9,
    marginBottom: 1,
    paddingLeft: 10,
  },
})

export function ResumePDF({ resume }: { resume: Resume }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Name & Contact */}
        <View style={styles.header}>
          <Text style={styles.name}>{resume.persona || 'Your Name'}</Text>
          <Text style={styles.contact}>
            {[resume.email, resume.location].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* Summary */}
        {resume.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
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
      </Page>
    </Document>
  )
}
