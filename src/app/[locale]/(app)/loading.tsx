export default function AppLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center neuro-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  )
}
