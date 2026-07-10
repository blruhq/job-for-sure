import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mock Interview — Career Coach',
  description: 'Practice interviews with AI. Behavioral, technical, and mixed questions tailored to your resume.',
}

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return children
}
