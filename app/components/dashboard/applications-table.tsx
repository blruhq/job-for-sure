import { StatusBadge } from './status-badge'

const MOCK_APPS = [
  { company: 'Google', role: 'Sr. Frontend Engineer', status: 'applied' as const, date: 'Jul 5', logo: 'G' },
  { company: 'Stripe', role: 'Software Engineer', status: 'interview' as const, date: 'Jun 28', logo: 'S' },
  { company: 'OpenAI', role: 'ML Engineer', status: 'bookmarked' as const, date: '—', logo: 'O' },
  { company: 'Meta', role: 'Product Engineer', status: 'rejected' as const, date: 'Jun 20', logo: 'M' },
  { company: 'Vercel', role: 'Frontend Architect', status: 'offer' as const, date: 'Jun 15', logo: 'V' },
  { company: 'Linear', role: 'Lead Engineer', status: 'applied' as const, date: 'Jun 10', logo: 'L' },
]

export function ApplicationsTable() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {MOCK_APPS.map((app) => (
        <div
          key={app.company + app.role}
          className="rounded-xl border border-border bg-surface p-4 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-start gap-3">
            {/* Company avatar */}
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
              <span className="text-sm font-[600] text-accent">{app.logo}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-[510] text-text-primary truncate">{app.company}</p>
              <p className="text-body-compact text-text-secondary truncate mt-0.5">{app.role}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <StatusBadge status={app.status} />
            <span className="text-caption text-text-tertiary">{app.date}</span>
          </div>
        </div>
      ))}
    </div>
  )
}