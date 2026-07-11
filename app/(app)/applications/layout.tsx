import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Applications — Track Applications',
  description: 'Track your job applications from bookmark to offer. Drag-and-drop kanban board with match scores.',
}

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
