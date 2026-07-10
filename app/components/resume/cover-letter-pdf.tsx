import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume } from '~/types/resume'
import '~/lib/pdf-fonts'

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Inter',
    color: '#1C1B16',
    lineHeight: 1.6,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 35,
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
  body: {
    marginTop: 10,
  },
  paragraph: {
    fontSize: 10.5,
    marginBottom: 16,
    color: '#1C1B16',
  },
})

export function CoverLetterPDF({ resume }: { resume: Resume }) {
  const paragraphs = (resume.coverLetter || '')
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)

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

        {/* Cover Letter Content */}
        <View style={styles.body}>
          {paragraphs.map((para, i) => (
            <Text key={i} style={styles.paragraph}>
              {para}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
