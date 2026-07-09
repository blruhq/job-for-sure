import Link from 'next/link'
import { Plus } from 'lucide-react'
import { StatsBar } from '~/components/dashboard/stats-bar'
import { ApplicationsTable } from '~/components/dashboard/applications-table'

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 text-text-primary">Applications</h1>
        <Link
          href="/resume/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-[510] text-white hover:bg-accent-hover active:scale-[0.97] transition-all duration-150 shadow-card"
        >
          <Plus className="h-4 w-4" />
          New Resume
        </Link>
      </div>
      <StatsBar />
      <div className="mt-6">
        <ApplicationsTable />
      </div>
    </div>
  )
}
