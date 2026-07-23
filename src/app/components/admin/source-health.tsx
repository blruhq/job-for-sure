'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, HelpCircle, Loader2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'

type SourceStatus = {
  source: string
  label: string
  ok: boolean
  count: number
  error?: string
  took?: number
}

type HealthData = {
  checkedAt: string
  query: string
  sources: SourceStatus[]
  envChecks: Record<string, boolean>
}

export function SourceHealth() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs/source-health')
      if (res.status === 403) {
        setError('Only the admin email can view source health.')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: HealthData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check sources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const totalOk = data?.sources.filter((s) => s.ok).length ?? 0
  const totalSources = data?.sources.length ?? 0

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Job Source Health
        </h2>
        <Button
          variant="link"
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] h-auto p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={11} className={cn(loading && 'animate-spin')} />
          {loading ? 'Checking…' : 'Refresh'}
        </Button>
      </div>

      {data && (
        <div className="mb-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className={totalOk === totalSources ? 'text-success' : 'text-warn'}>
            {totalOk}/{totalSources} sources ok
          </span>
          <span>·</span>
          <span>Query: &quot;{data.query}&quot;</span>
          <span>·</span>
          <span>Checked {new Date(data.checkedAt).toLocaleTimeString()}</span>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-[11px]">Testing sources…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xs border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Source</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Jobs</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Took</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.sources.map((s) => (
                <tr key={s.source} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium text-foreground">{s.label}</td>
                  <td className="px-3 py-2">
                    {s.ok ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle size={11} /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle size={11} /> FAIL
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {s.ok ? s.count : <HelpCircle size={11} className="inline text-muted-foreground/50" />}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-muted-foreground">
                    {s.took ? `${s.took}ms` : '-'}
                  </td>
                  <td className="max-w-[300px] truncate px-3 py-2 text-destructive" title={s.error}>
                    {s.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data.envChecks).map(([key, ok]) => (
            <span
              key={key}
              className={cn(
                'inline-flex items-center gap-1 rounded-xs border px-2 py-1 font-mono text-[10px]',
                ok
                  ? 'border-success/30 bg-success/5 text-success'
                  : 'border-destructive/30 bg-destructive/5 text-destructive',
              )}
            >
              {ok ? <CheckCircle size={9} /> : <XCircle size={9} />}
              {key}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
