'use client'

import dynamic from 'next/dynamic'
import type { Resume } from '~/types/resume'
import { ResumePDF } from '~/components/resume/resume-pdf'

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[600px] items-center justify-center">
        <div className="text-[11px] text-muted-foreground">Loading preview…</div>
      </div>
    ),
  },
)

export function ResumePreview({ resume }: { resume: Resume }) {
  return (
    <PDFViewer
      style={{ width: '100%', height: '100%', border: 'none', minHeight: '600px' }}
      showToolbar={true}
    >
      <ResumePDF resume={resume} />
    </PDFViewer>
  )
}
