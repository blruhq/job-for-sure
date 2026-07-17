import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import { registerFonts, COLORS } from './shared-pdf'
import { renderSidebarSections, renderMainSections } from './render-sections'

registerFonts()

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Inter',
    color: COLORS.text,
    lineHeight: 1.35,
  },
  headerBlock: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 6,
  },
  role: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 4,
  },
  contact: {
    fontSize: 8,
    color: COLORS.muted,
    fontFamily: 'JetBrains Mono',
  },
  body: {
    flexDirection: 'row',
    gap: 12,
  },
  sidebar: {
    width: '33%',
    backgroundColor: COLORS.sidebarBg,
    padding: 14,
    borderRadius: 4,
  },
  main: {
    width: '67%',
  },
  sidebarSection: {
    marginBottom: 10,
  },
  sidebarSectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: COLORS.primary,
    marginBottom: 4,
  },
  sidebarLabel: {
    fontSize: 8,
    color: COLORS.muted,
    fontWeight: 600,
    marginBottom: 0,
  },
  sidebarValue: {
    fontSize: 9,
    marginBottom: 4,
  },
  skillBadge: {
    fontSize: 8,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primary,
    padding: '2 6',
    borderRadius: 3,
    marginBottom: 3,
    overflow: 'hidden',
  },
  skillsCol: {
    flexDirection: 'column',
    gap: 3,
  },
  langText: {
    fontSize: 9,
    marginBottom: 2,
  },
  mainSection: {
    marginBottom: 10,
  },
  mainSectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: COLORS.primary,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    paddingLeft: 5,
    marginBottom: 5,
  },
  summary: {
    fontSize: 10,
    color: COLORS.muted,
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
    marginBottom: 1,
  },
  bullet: {
    fontSize: 9,
    marginBottom: 0,
    paddingLeft: 10,
  },
  projectTechBadge: {
    fontSize: 7,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primary,
    padding: '1 5',
    borderRadius: 2,
  },
  projectTechRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 2,
  },
  certItem: {
    marginBottom: 3,
  },
})

export function ModernPDF({ resume }: { resume: Resume }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={resume.role ? styles.name : { ...styles.name, marginBottom: 10 }}>
            {resume.persona || 'Your Name'}
          </Text>
          {resume.role && <Text style={styles.role}>{resume.role}</Text>}
          <Text style={styles.contact}>
            {[resume.email, resume.phone, resume.location, resume.github].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Two-column body */}
        <View style={styles.body}>
          {/* ── Sidebar ── */}
          <View style={styles.sidebar}>
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

            {/* Sidebar dynamic sections */}
            {renderSidebarSections(resume, {
              sidebarSection: styles.sidebarSection,
              sidebarSectionTitle: styles.sidebarSectionTitle,
              skillBadge: styles.skillBadge,
              skillsCol: styles.skillsCol,
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
              skill: styles.skillBadge,
              languagesRow: [], // Not used in main column
              langText: styles.langText,
              projectTech: styles.projectTechBadge, // Note: Modern PDF uses projectTechBadge for technology tags
            })}
          </View>
        </View>
      </Page>
    </Document>
  )
}
