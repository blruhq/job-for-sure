import { StatusBadge } from './status-badge'

// TODO: fetch from API
const MOCK_APPS = [
  { company: 'Google', role: 'Sr. Frontend Engineer', status: 'applied' as const, date: 'Jul 5', resume: 'v1.3' },
  { company: 'Stripe', role: 'Software Engineer', status: 'interview' as const, date: 'Jun 28', resume: 'v1.2' },
  { company: 'OpenAI', role: 'ML Engineer', status: 'bookmarked' as const, date: '—', resume: '—' },
  { company: 'Meta', role: 'Product Engineer', status: 'rejected' as const, date: 'Jun 20', resume: 'v1.1' },
]

export function ApplicationsTable() {
  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {['Company', 'Role', 'Status', 'Date', 'Resume'].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-caption font-[510] text-text-tertiary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_APPS.map((app) => (
            <tr key={app.company + app.role} className="border-b border-border/50 hover:bg-hover transition-colors duration-100">
              <td className="px-3 py-2.5 text-body-compact text-text-primary">{app.company}</td>
              <td className="px-3 py-2.5 text-body-compact text-text-primary">{app.role}</td>
              <td className="px-3 py-2.5">
                <StatusBadge status={app.status} />
              </td>
              <td className="px-3 py-2.5 text-body-compact text-text-secondary">{app.date}</td>
              <td className="px-3 py-2.5 text-body-compact text-text-secondary">{app.resume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
