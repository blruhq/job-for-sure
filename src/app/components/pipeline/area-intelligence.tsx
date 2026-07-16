'use client'

import { MapPin, Bus, DollarSign, Home, Hotel, Shield, Star, HeartPulse, UtensilsCrossed, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import * as Links from '~/lib/area-links'

interface AreaIntelligenceProps {
  job: {
    company: string
    loc: string
    title: string
  }
  homeLocation: string  // from user settings
  city: string          // extracted city name for Numbeo
  countryCode: string   // detected country code for property/visa
}

export function AreaIntelligence({ job, homeLocation, city, countryCode }: AreaIntelligenceProps) {
  const [expanded, setExpanded] = useState(false)
  const propertySites = Links.getPropertySites(countryCode)
  const visa = Links.visaUrl(countryCode)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <MapPin size={12} className="text-primary" />
        Area Intelligence
      </div>

      {/* COMMUTE */}
      <Section label="Commute">
        <LinkButton href={Links.directionsUrl(homeLocation, job.loc)} icon={<Bus size={14} />} label="Directions" />
        <LinkButton href={Links.rome2RioUrl(homeLocation, job.loc)} icon={<DollarSign size={14} />} label="Travel Prices" />
      </Section>

      {/* MONEY */}
      <Section label="Money">
        <LinkButton href={Links.costOfLivingUrl(city)} icon={<DollarSign size={14} />} label="Cost of Living" />
        <LinkButton href={Links.salaryCalculatorUrl(city)} icon={<DollarSign size={14} />} label="Salary Check" />
      </Section>

      {/* HOUSING */}
      {propertySites.length > 0 && (
        <Section label="Housing">
          {propertySites.map(site => (
            <LinkButton key={site.name} href={Links.housingUrl(site, city)} icon={<Home size={14} />} label={site.name} />
          ))}
        </Section>
      )}

      {/* EXPANDABLE MORE */}
      {homeLocation && (
        <button onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'More'} area info
        </button>
      )}

      {expanded && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            <LinkButton href={Links.agodaUrl(city)} icon={<Hotel size={14} />} label="Temporary Stay" />
            {visa && <LinkButton href={visa.url} icon={<Shield size={14} />} label={visa.name} />}
            <LinkButton href={Links.crimeUrl(city)} icon={<Shield size={14} />} label="Safety / Crime" />
            <LinkButton href={Links.qualityOfLifeUrl(city)} icon={<Star size={14} />} label="Quality of Life" />
            <LinkButton href={Links.healthcareUrl(city)} icon={<HeartPulse size={14} />} label="Healthcare" />
            <LinkButton href={Links.restaurantsUrl(job.loc)} icon={<UtensilsCrossed size={14} />} label="Restaurants Nearby" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper components ──

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-mono px-0 pt-1 pb-1.5 text-[11px]">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
      className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-sidebar-hover"
    >
      {icon}
      {label}
      <ExternalLink size={10} className="opacity-40 shrink-0" />
    </a>
  )
}
