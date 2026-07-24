'use client'

import { TEMPLATES } from './registry'
import type { ResumeTemplate } from '~/types/resume'
import { cn } from '~/lib/utils'
import { Check } from 'lucide-react'

interface TemplateGalleryProps {
  value: ResumeTemplate | undefined
  onChange: (template: ResumeTemplate) => void
  neumorphic?: boolean
}

function TemplateThumbnail({ templateId, selected }: { templateId: string; selected: boolean }) {
  const barColor = selected ? 'bg-primary/40' : 'bg-border'
  const textColor = selected ? 'bg-primary/60' : 'bg-muted-foreground/40'

  switch (templateId) {
    case 'minimalist':
      return (
          <div className="flex h-24 flex-col items-center gap-1 rounded bg-white p-2">
          <div className={cn('h-1.5 w-3/5 rounded-full', textColor)} />
          <div className={cn('h-0.5 w-4/5 rounded-full', barColor)} />
          <div className="mt-1 flex w-full flex-col gap-0.5">
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-3/4 rounded-full', barColor)} />
          </div>
        </div>
      )
    case 'modern':
      return (
        <div className="flex h-24 gap-1 rounded bg-white p-2">
          <div className="flex w-1/3 flex-col gap-0.5 rounded bg-[#F8F8F5] p-1">
            <div className={cn('h-1 w-full rounded-full', textColor)} />
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-2/3 rounded-full', barColor)} />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 pt-1">
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-3/4 rounded-full', barColor)} />
          </div>
        </div>
      )
    case 'classic':
      return (
        <div className="flex h-24 flex-col items-center gap-1.5 rounded bg-white p-2">
          <div className={cn('h-1.5 w-2/5 rounded-full', textColor)} />
          <div className="mt-0.5 flex w-full flex-col items-center gap-1">
            <div className={cn('h-0.5 w-3/4 rounded-full', barColor)} />
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-5/6 rounded-full', barColor)} />
          </div>
        </div>
      )
    case 'executive':
      return (
        <div className="flex h-24 flex-col rounded bg-white overflow-hidden">
          <div className="flex items-center gap-1 bg-[#1C1B18] px-2 py-1.5">
            <div className="h-1.5 w-1/2 rounded-full bg-white/60" />
          </div>
          <div className="flex flex-1 gap-1 p-1.5">
            <div className="flex w-1/4 flex-col gap-0.5">
              <div className={cn('h-0.5 w-full rounded-full', barColor)} />
              <div className={cn('h-0.5 w-2/3 rounded-full', barColor)} />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <div className={cn('h-0.5 w-full rounded-full', barColor)} />
              <div className={cn('h-0.5 w-3/4 rounded-full', barColor)} />
            </div>
          </div>
        </div>
      )
    case 'photo':
      return (
        <div className="flex h-24 gap-1 rounded bg-white p-2">
          <div className="flex w-1/3 flex-col items-center gap-1 rounded bg-[#F8F8F5] p-1">
            <div className="h-3 w-3 rounded-full bg-primary/60" />
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-2/3 rounded-full', barColor)} />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 pt-1">
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-full rounded-full', barColor)} />
            <div className={cn('h-0.5 w-3/4 rounded-full', barColor)} />
          </div>
        </div>
      )
    default:
      return null
  }
}

export function TemplateGallery({ value, onChange, neumorphic = false }: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {TEMPLATES.map(t => (
        <div
          key={t.id}
          role="button"
          tabIndex={0}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(t.id) } }}
          className={cn(
            'group relative cursor-pointer p-2.5 text-left transition-all',
            neumorphic
              ? cn(
                  'rounded-2xl neuro-card',
                  value === t.id && 'ring-1 ring-primary',
                )
              : cn(
                  'rounded-md border shadow-sm',
                  value === t.id
                    ? 'border-primary bg-accent-soft ring-1 ring-primary'
                    : 'border-border hover:border-brand/40 hover:shadow-md',
                ),
          )}
        >
          <TemplateThumbnail templateId={t.id} selected={value === t.id} />

          <div className="mt-2">
            <div className="text-xs font-semibold text-foreground">{t.name}</div>
            <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{t.description}</div>
          </div>

          {value === t.id && (
            <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
              <Check size={10} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
