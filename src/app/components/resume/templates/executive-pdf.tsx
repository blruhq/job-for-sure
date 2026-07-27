import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import { registerFonts, COLORS } from './shared-pdf'
import { renderSidebarSections, renderMainSections } from './render-sections'

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
          <Text style={resume.role ? styles.headerName : { ...styles.headerName, marginBottom: 10 }}>
            {resume.persona || 'Your Name'}
          </Text>
          {resume.role && <Text style={styles.headerRole}>{resume.role}</Text>}
          <Text style={styles.headerContact}>
            {[resume.email, resume.phone, resume.location, resume.github].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Two-column body */}
        <View style={styles.body}>
          {/* ── Sidebar ── */}
          <View style={styles.sidebar} fixed>
            {/* Sidebar dynamic sections */}
            {renderSidebarSections(resume, {
              sidebarSection: styles.sidebarSection,
              sidebarSectionTitle: styles.sidebarSectionTitle,
              skillBadge: styles.skillItem, // Executive uses skillItem style
              skillsCol: { flexDirection: 'column' as const, gap: 3 },
              langText: styles.langText,
              certItem: styles.certItem,
            })}
          </View>

          {/* ── Main ── */}
          <View style={styles.main}>
            {/* Main column dynamic sections */}
            {renderMainSections(resume, {
              section: styles.mainSection,
              sectionTitle: styles.mainSectionTitle,
              summary: styles.summary,
              experienceBlock: styles.experienceBlock,
              expHeader: styles.expHeader,
              expRole: styles.expRole,
              expDates: styles.expDates,
              expCompany: styles.expCompany,
              bullet: styles.bullet,
              skillsRow: [], // Not used in main column
              skill: styles.skillItem,
              languagesRow: [], // Not used in main column
              langText: styles.langText,
              projectTech: styles.projectTech,
            })}
          </View>
        </View>
      </Page>
    </Document>
  )
}
