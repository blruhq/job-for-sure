export function StatsBar() {
  const stats = [
    { label: 'Applied', value: 12, color: 'text-accent' },
    { label: 'Interviews', value: 3, color: 'text-warning' },
    { label: 'Offers', value: 1, color: 'text-success' },
    { label: 'Pending', value: 5, color: 'text-neutral' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-surface p-4 shadow-card"
        >
          <p className="text-caption text-text-secondary font-[510] uppercase tracking-wide">{s.label}</p>
          <p className={`mt-1 text-h2 font-[650] ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}