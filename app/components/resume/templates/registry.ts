import type { ResumeTemplate } from '~/types/resume'

export interface TemplateMeta {
  id: ResumeTemplate
  name: string
  description: string
  hasSidebar: boolean
  hasPhoto: boolean
  fontType: 'sans' | 'serif'
  bestFor: string
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Single column · Inter · Clean lines',
    hasSidebar: false,
    hasPhoto: false,
    fontType: 'sans',
    bestFor: 'Tech, startups, product roles',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Two-column sidebar · Skill badges · Accent colors',
    hasSidebar: true,
    hasPhoto: false,
    fontType: 'sans',
    bestFor: 'Tech, design, marketing',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Single column · Lora serif · Traditional',
    hasSidebar: false,
    hasPhoto: false,
    fontType: 'serif',
    bestFor: 'Finance, law, consulting, academic',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Colored header bar · Two-column · Bold',
    hasSidebar: true,
    hasPhoto: false,
    fontType: 'sans',
    bestFor: 'Senior roles, management, C-suite',
  },
  {
    id: 'photo',
    name: 'Photo',
    description: 'Photo/initials + sidebar · Inter',
    hasSidebar: true,
    hasPhoto: true,
    fontType: 'sans',
    bestFor: 'Asian & European markets, creative roles',
  },
]

export const DEFAULT_TEMPLATE: ResumeTemplate = 'minimalist'

export function getTemplateMeta(id: ResumeTemplate | undefined): TemplateMeta {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES[0]
}
