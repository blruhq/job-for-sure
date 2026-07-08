import { useState } from 'react'
import { Upload } from 'lucide-react'

export function ResumeUpload() {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div>
      <h2 className="text-h2 text-text-primary">Upload Resume</h2>
      <p className="mt-1 text-body-compact text-text-secondary">
        Supported formats: PDF, DOCX, TXT
      </p>

      <div
        className={`mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors duration-150 ${
          isDragging
            ? 'border-accent bg-accent-subtle'
            : 'border-border hover:border-border-hover'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          // TODO: handle file upload
        }}
      >
        <Upload className="h-8 w-8 text-text-tertiary mb-3" />
        <p className="text-body text-text-secondary">
          Drag & drop your resume here, or{' '}
          <button className="text-accent hover:text-accent-hover">browse</button>
        </p>
        <input type="file" accept=".pdf,.docx,.txt" className="hidden" />
      </div>
    </div>
  )
}
