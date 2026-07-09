import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'

export default function ResumePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 text-text-primary">My Resumes</h1>
        <Link
          href="/resume/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 shadow-card"
        >
          <Plus className="h-4 w-4" />
          New Resume
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-card">
        <div className="mx-auto h-12 w-12 rounded-xl bg-page flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-text-tertiary" />
        </div>
        <p className="text-body text-text-secondary">No resumes yet. Create your first one.</p>
      </div>
    </div>
  )
}
