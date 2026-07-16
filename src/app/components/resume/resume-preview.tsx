'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import type { Resume } from '~/types/resume'
import { ResumePDF } from '~/components/resume/resume-pdf'

export const ResumePreview = memo(function ResumePreview({ resume }: { resume: Resume }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const resumeRef = useRef<Resume | null>(null)  // null = first mount, always proceed
  const genRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const generatePdf = useCallback(async (resumeData: Resume, gen: number) => {
    setLoading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      if (gen !== genRef.current) return

      const instance = pdf(<ResumePDF resume={resumeData} />)
      const blob = await instance.toBlob()
      if (gen !== genRef.current) return

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      if (gen !== genRef.current) {
        URL.revokeObjectURL(url)
        return
      }

      setDataUrl(url)
      setLoading(false)
    } catch (err) {
      console.error('PDF preview generation failed:', err)
      if (gen === genRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // First mount: resumeRef is null, so we always proceed
    // Subsequent: skip if same object reference (prevents re-render storms)
    if (resumeRef.current !== null && resume === resumeRef.current) return
    resumeRef.current = resume

    const thisGen = ++genRef.current

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (thisGen === genRef.current) generatePdf(resume, thisGen)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [resume, generatePdf])

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
