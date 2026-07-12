import React from 'react'
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import path from 'node:path'

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'inter-regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public', 'fonts', 'inter-medium.ttf'), fontWeight: 500 },
    { src: path.join(process.cwd(), 'public', 'fonts', 'inter-semibold.ttf'), fontWeight: 600 },
    { src: path.join(process.cwd(), 'public', 'fonts', 'inter-bold.ttf'), fontWeight: 700 },
  ],
})

Font.register({
  family: 'JetBrains Mono',
  src: path.join(process.cwd(), 'public', 'fonts', 'jetbrains-mono-regular.ttf'),
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
