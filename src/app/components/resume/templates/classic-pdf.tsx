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
