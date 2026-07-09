import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ATS Optimizer',
  description: 'Paste a job description and get an ATS match score with keyword analysis. Auto-inject missing keywords into your resume.',
}

export default function AtsLayout({ children }: { children: React.ReactNode }) {
  return children
}
