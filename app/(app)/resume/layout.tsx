import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resume Detail',
  description: 'View and edit your resume. See recommended jobs, preview templates, and get AI-powered suggestions.',
}

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return children
}
