'use client'

import { Building2, MessageCircle, FileCheck, DollarSign, ShieldAlert, Star, ExternalLink } from 'lucide-react'
import * as Links from '~/lib/area-links'

interface CompanyIntelligenceProps {
  company: string
  countryCode: string
}

export function CompanyIntelligence({ company, countryCode }: CompanyIntelligenceProps) {
  return (
    <div className="rounded-lg neuro-card p-5 space-y-6">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Building2 size={12} className="text-primary" />
        Company Intelligence
      </div>
      <div className="space-y-2.5">
        <div className="label-mono px-0 text-[11px]">Is this company good?</div>
        <div className="flex flex-wrap gap-2.5">
          <LinkButton href={Links.cultureProfileUrl(company)} icon={<Building2 size={14} />} label="Culture Profile" />
          <LinkButton href={Links.glassdoorUrl(company)} icon={<Star size={14} />} label="Reviews" />
          <LinkButton href={Links.redditSearchUrl(company)} icon={<MessageCircle size={14} />} label="Reddit" />
          <LinkButton href={Links.openCorporatesUrl(company)} icon={<FileCheck size={14} />} label="Registry" />
          {countryCode === 'TH' ? (
            <LinkButton href={Links.dataForThaiUrl(company)} icon={<DollarSign size={14} />} label="Financials" />
          ) : (
            <LinkButton href={Links.crunchbaseUrl(company)} icon={<DollarSign size={14} />} label="Financials" />
          )}
          <LinkButton href={Links.openSanctionsUrl(company)} icon={<ShieldAlert size={14} />} label="Background" />
        </div>
      </div>
    </div>
  )
}

function LinkButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  if (href === '#') return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-xs neuro-pill px-3 py-2 text-[11px] font-medium text-foreground transition-shadow hover:bg-sidebar-hover"
    >
      {icon}
      {label}
      <ExternalLink size={10} className="opacity-40 shrink-0" />
    </a>
  )
}
