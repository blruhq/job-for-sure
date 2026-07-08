interface Props {
  status: 'bookmarked' | 'pending' | 'applied' | 'interview' | 'rejected' | 'offer'
}

const statusConfig = {
  bookmarked: { dot: '◉', label: 'Saved', class: 'text-neutral bg-neutral/12' },
  pending: { dot: '○', label: 'Pending', class: 'text-text-secondary bg-border' },
  applied: { dot: '●', label: 'Applied', class: 'text-success bg-success/12' },
  interview: { dot: '►', label: 'Interview', class: 'text-warning bg-warning/12' },
  rejected: { dot: '✕', label: 'Rejected', class: 'text-danger bg-danger/12' },
  offer: { dot: '★', label: 'Offer', class: 'text-success bg-success/15' },
}

export function StatusBadge({ status }: Props) {
  const cfg = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-caption font-[510] ${cfg.class}`}
    >
      {cfg.dot} {cfg.label}
    </span>
  )
}
