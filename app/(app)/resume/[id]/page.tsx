'use client'

import { use } from 'react'
import { ResumeDetail } from '~/components/resume/resume-detail'

export default function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ResumeDetail resumeId={id} />
}
