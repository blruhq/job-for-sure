'use client'

import { TEMPLATES } from './registry'
import type { ResumeTemplate } from '~/types/resume'
import { cn } from '~/lib/utils'
import { Check } from 'lucide-react'

interface TemplateGalleryProps {
  value: ResumeTemplate | undefined
  onChange: (template: ResumeTemplate) => void
}

function TemplateThumbnail({ templateId, selected }: { templateId: string; selected: boolean }) {
  const barColor = selected ? 'bg-primary/40' : 'bg-border'
  const textColor = selected ? 'bg-primary/60' : 'bg-muted-foreground/40'

  switch (templateId) {
    case 'minimalist':
      return (
        <div className="flex h-20 flex-col items-center gap-1 rounded bg-white p-2">
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
        <div className="flex h-20 gap-1 rounded bg-white p-2">
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
        <div className="flex h-20 flex-col items-center gap-1.5 rounded bg-white p-2">
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
        <div className="flex h-20 flex-col rounded bg-white overflow-hidden">
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
        <div className="flex h-20 gap-1 rounded bg-white p-2">
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

export function TemplateGallery({ value, onChange }: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {TEMPLATES.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'group relative cursor-pointer rounded-md border p-2 text-left transition-all',
            value === t.id
              ? 'border-primary bg-accent-soft ring-1 ring-primary'
              : 'border-border hover:border-primary/40',
          )}
        >
          <TemplateThumbnail templateId={t.id} selected={value === t.id} />

          <div className="mt-1.5">
            <div className="text-[10px] font-semibold text-foreground">{t.name}</div>
            <div className="mt-0.5 text-[8px] leading-tight text-muted-foreground">{t.description}</div>
          </div>

          {value === t.id && (
            <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
              <Check size={8} />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
