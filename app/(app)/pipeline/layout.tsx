import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pipeline — Track Applications',
  description: 'Track your job applications from bookmark to offer. Drag-and-drop kanban pipeline with match scores.',
}

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return children
}
