export function DotPattern({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(var(--border) 2px, transparent 2px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
