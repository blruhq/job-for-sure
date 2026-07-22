import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import { registerFonts, COLORS } from './shared-pdf'
import { renderPdfSections } from './render-sections'

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
    marginBottom: 10,
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
          <Text style={resume.role ? styles.name : { ...styles.name, marginBottom: 10 }}>
            {resume.persona || 'Your Name'}
          </Text>
          {resume.role && <Text style={styles.role}>{resume.role}</Text>}
          <Text style={styles.contact}>
            {[resume.email, resume.phone, resume.location, resume.github].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Dynamic sections — order controlled by resume.sectionOrder */}
        {renderPdfSections(resume, {
          section: styles.section,
          sectionTitle: styles.sectionTitle,
          summary: styles.summary,
          experienceBlock: styles.experienceBlock,
          expHeader: styles.expHeader,
          expRole: styles.expRole,
          expDates: styles.expDates,
          expCompany: styles.expCompany,
          bullet: styles.bullet,
          skillsRow: styles.skillsRow,
          skill: styles.skill,
          languagesRow: styles.languagesRow,
          langText: styles.langText,
          projectTech: styles.projectTech,
        })}
      </Page>
    </Document>
  )
}
