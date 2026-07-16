'use client'

import { useState, useEffect, useRef } from 'react'
import type { Resume } from '~/types/resume'
import { ResumePDF } from '~/components/resume/resume-pdf'

export function ResumePreview({ resume }: { resume: Resume }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const resumeRef = useRef(resume)
  const genRef = useRef(0)

  useEffect(() => {
    // Skip if the same reference (useDeferredValue may pass the same object)
    if (resume === resumeRef.current) return
    resumeRef.current = resume

    const thisGen = ++genRef.current
    setLoading(true)

    // Defer to next microtask so the loading state renders immediately
    Promise.resolve().then(async () => {
      try {
        // Dynamic import — @react-pdf/renderer has Node deps that break SSR
        const { pdf } = await import('@react-pdf/renderer')

        // Cancel if a newer generation has already started
        if (thisGen !== genRef.current) return

        // Generate PDF blob
        const instance = pdf(<ResumePDF resume={resume} />)
        const blob = await instance.toBlob()
        if (thisGen !== genRef.current) return

        // Convert Blob → data URL (avoids Chrome Blob URL partitioning)
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        if (thisGen !== genRef.current) return
        setDataUrl(url)
        setLoading(false)
      } catch (err) {
        console.error('PDF preview generation failed:', err)
        if (thisGen === genRef.current) setLoading(false)
      }
    })
  }, [resume])

  if (loading && !dataUrl) {
    return (
      <div className="flex h-full min-h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          <div className="text-[11px] text-muted-foreground">Loading preview…</div>
        </div>
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div className="flex h-full min-h-[600px] items-center justify-center">
        <div className="text-[11px] text-red-500">Preview unavailable</div>
      </div>
    )
  }

  return (
    <iframe
      src={dataUrl}
      style={{ width: '100%', height: '100%', border: 'none', minHeight: '600px' }}
      title="Resume Preview"
    />
  )
}
