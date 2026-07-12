import React from 'react'
import type { Resume } from '~/types/resume'
import { DEFAULT_TEMPLATE } from './templates/registry'
import { MinimalistPDF } from './templates/minimalist-pdf'
import { ModernPDF } from './templates/modern-pdf'
import { ClassicPDF } from './templates/classic-pdf'
import { ExecutivePDF } from './templates/executive-pdf'
import { PhotoPDF } from './templates/photo-pdf'

export function ResumePDF({ resume }: { resume: Resume }) {
  const template = resume.template || DEFAULT_TEMPLATE

  switch (template) {
    case 'modern':
      return <ModernPDF resume={resume} />
    case 'classic':
      return <ClassicPDF resume={resume} />
    case 'executive':
      return <ExecutivePDF resume={resume} />
    case 'photo':
      return <PhotoPDF resume={resume} />
    case 'minimalist':
    default:
      return <MinimalistPDF resume={resume} />
  }
}
