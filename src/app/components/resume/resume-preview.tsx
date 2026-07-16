'use client'

import { useState, useEffect, useRef, memo } from 'react'
import type { Resume } from '~/types/resume'
import { ResumePDF } from '~/components/resume/resume-pdf'

export const ResumePreview = memo(function ResumePreview({ resume }: { resume: Resume }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const resumeRef = useRef(resume)
  const genRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (resume === resumeRef.current) return
    resumeRef.current = resume

    const thisGen = ++genRef.current

    // Debounce: wait 400ms before starting PDF generation
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (thisGen !== genRef.current) return
      setLoading(true)

      try {
        const { pdf } = await import('@react-pdf/renderer')
        if (thisGen !== genRef.current) return

        const instance = pdf(<ResumePDF resume={resume} />)
        const blob = await instance.toBlob()
        if (thisGen !== genRef.current) return

        // Revoke previous blob URL
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url

        if (thisGen !== genRef.current) {
          URL.revokeObjectURL(url)
          return
        }

        setDataUrl(url)
        setLoading(false)
      } catch (err) {
        console.error('PDF preview generation failed:', err)
        if (thisGen === genRef.current) setLoading(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [resume])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

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
})
