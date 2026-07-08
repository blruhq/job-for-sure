export function StatsBar() {
  // TODO: fetch real stats from API
  const stats = [
    { label: 'Applied', value: 12, color: 'text-success' },
    { label: 'Interviews', value: 3, color: 'text-warning' },
    { label: 'Offers', value: 1, color: 'text-success' },
    { label: 'Pending', value: 5, color: 'text-neutral' },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <p className="text-body-compact text-text-secondary">{s.label}</p>
          <p className={`mt-1 text-h2 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}
