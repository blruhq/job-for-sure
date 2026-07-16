'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import type { Resume } from '~/types/resume'

export const ResumePreview = memo(function ResumePreview({ resume }: { resume: Resume }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const resumeRef = useRef<Resume | null>(null)  // null = first mount, always proceed
  const genRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generatePreview = useCallback(async (resumeData: Resume, gen: number) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const resp = await fetch('/api/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeData }),
        signal: controller.signal,
      })

      if (gen !== genRef.current) return
      if (!resp.ok) throw new Error(`Preview failed: ${resp.status}`)

      const blob = await resp.blob()
      if (gen !== genRef.current) return

      // Revoke previous blob URL
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      if (gen !== genRef.current) {
        URL.revokeObjectURL(url)
        return
      }

      setBlobUrl(url)
      setLoading(false)
      setError(false)
    } catch (err: any) {
      if (err?.name === 'AbortError') return  // superseded by newer request
      console.error('PDF preview generation failed:', err)
      if (gen === genRef.current) {
        setLoading(false)
        setError(true)
      }
    }
  }, [])

  useEffect(() => {
    // First mount: resumeRef is null → always proceed
    // Subsequent: skip if same object reference
    if (resumeRef.current !== null && resume === resumeRef.current) return
    resumeRef.current = resume

    const thisGen = ++genRef.current

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (thisGen === genRef.current) generatePreview(resume, thisGen)
    }, 150)  // 150ms debounce — matches Reactive Resume's pattern

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [resume, generatePreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // Initial load (no previous PDF to show)
  if (loading && !blobUrl) {
    return (
      <div className="flex h-full min-h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          <div className="text-[11px] text-muted-foreground">Loading preview…</div>
        </div>
      </div>
    )
  }

  if (error && !blobUrl) {
    return (
      <div className="flex h-full min-h-[600px] items-center justify-center">
        <div className="text-[11px] text-red-500">Preview unavailable</div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {/* Subtle "updating" indicator — doesn't hide the old PDF */}
      {loading && blobUrl && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-1 backdrop-blur-sm">
          <div className="h-2.5 w-2.5 animate-spin rounded-full border border-border border-t-primary" />
          <span className="text-[9px] text-muted-foreground">Updating…</span>
        </div>
      )}
      {blobUrl && (
        <iframe
          src={blobUrl}
          style={{ width: '100%', height: '100%', border: 'none', minHeight: '600px' }}
          title="Resume Preview"
        />
      )}
    </div>
  )
})
