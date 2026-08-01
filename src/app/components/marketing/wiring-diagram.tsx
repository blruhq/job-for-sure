interface WiringDiagramProps {
  variant?: 'horizontal' | 'bridge'
  className?: string
}

export function WiringDiagram({ variant = 'horizontal', className }: WiringDiagramProps) {
  if (variant === 'bridge') {
    return (
      <svg className={className} width="40" height="2" viewBox="0 0 40 2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="40" y2="1" stroke="var(--signal-line)" strokeWidth="1.5" />
        <line x1="0" y1="1" x2="40" y2="1" stroke="var(--signal-dot)" strokeWidth="1.5" className="wiring-trace" />
      </svg>
    )
  }

  return (
    <svg className={className} width="100%" height="80" viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Horizontal traces */}
      <line x1="40" y1="40" x2="160" y2="40" stroke="var(--signal-line)" strokeWidth="1.5" />
      <line x1="240" y1="40" x2="360" y2="40" stroke="var(--signal-line)" strokeWidth="1.5" />
      
      {/* Animated trace signals */}
      <line x1="40" y1="40" x2="160" y2="40" stroke="var(--signal-dot)" strokeWidth="1.5" className="wiring-trace" />
      <line x1="240" y1="40" x2="360" y2="40" stroke="var(--signal-dot)" strokeWidth="1.5" className="wiring-trace" />

      {/* Nodes */}
      {[40, 200, 360].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="40" r="4" stroke="var(--signal-line)" strokeWidth="1.5" fill="var(--bg-app)" />
          <circle cx={cx} cy="40" r="2" fill="var(--signal-dot)" className="wiring-node-core" />
        </g>
      ))}
    </svg>
  )
}
