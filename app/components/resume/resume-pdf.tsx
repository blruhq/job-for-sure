import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { ResumeData } from '~/types/resume'
import { ModernTemplate } from './templates/modern'
import { ClassicTemplate } from './templates/classic'
import { TechnicalTemplate } from './templates/technical'

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.woff2', fontWeight: 400 },
    { src: '/fonts/Inter-Medium.woff2', fontWeight: 500 },
    { src: '/fonts/Inter-SemiBold.woff2', fontWeight: 600 },
  ],
})

Font.register({
  family: 'Instrument Serif',
  fonts: [
    { src: '/fonts/InstrumentSerif-Regular.woff2', fontWeight: 400 },
    { src: '/fonts/InstrumentSerif-Italic.woff2', fontWeight: 400, fontStyle: 'italic' },
  ],
})

Font.register({
  family: 'JetBrains Mono',
  fonts: [
    { src: '/fonts/JetBrainsMono-Regular.woff2', fontWeight: 400 },
  ],
})

interface Props {
  resume: ResumeData
  templateId: string
}

export function ResumePDF({ resume, templateId }: Props) {
  const Template = getTemplate(templateId)
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Template resume={resume} />
      </Page>
    </Document>
  )
}

function getTemplate(templateId: string) {
  switch (templateId) {
    case 'classic':
      return ClassicTemplate
    case 'technical':
      return TechnicalTemplate
    case 'modern':
    default:
      return ModernTemplate
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1D1D1F',
  },
})
