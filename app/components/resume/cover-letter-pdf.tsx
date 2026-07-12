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
