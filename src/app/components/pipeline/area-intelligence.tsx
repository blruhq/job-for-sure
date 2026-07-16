'use client'

import {
  MapPin, Bus, DollarSign, Home, Hotel, Shield, Star, HeartPulse,
  UtensilsCrossed, ChevronDown, ChevronUp, ExternalLink,
  LocateFixed, Loader2, Pencil, Check,
} from 'lucide-react'
import { useState } from 'react'
import * as Links from '~/lib/area-links'
import { detectArea } from '~/lib/geo'

interface AreaIntelligenceProps {
  job: {
    company: string
    loc: string
    title: string
  }
  homeLocation: string  // from user settings
  city: string          // extracted city name for Numbeo
  countryCode: string   // detected country code for property/visa
  /** Called when user sets/changes their area. Parent saves to DB. */
  onHomeLocationChange?: (location: string) => Promise<void>
}

export function AreaIntelligence({ job, homeLocation, city, countryCode, onHomeLocationChange }: AreaIntelligenceProps) {
  const [expanded, setExpanded] = useState(false)
  const propertySites = Links.getPropertySites(countryCode)
  const visa = Links.visaUrl(countryCode)

  // ── Commute inline state ──
  const [editing, setEditing] = useState(!homeLocation) // start in edit mode if no location
  const [areaInput, setAreaInput] = useState(homeLocation)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)

  const handleSave = async () => {
    const val = areaInput.trim()
    if (!val) return
    setSaving(true)
    try {
      if (onHomeLocationChange) {
        await onHomeLocationChange(val)
      }
      setEditing(false)
    } catch {
      // parent handles error
    }
    setSaving(false)
  }

  const handleDetect = async () => {
    setDetecting(true)
    try {
      const area = await detectArea()
      setAreaInput(area)
      // Auto-save the detected area
      setSaving(true)
      if (onHomeLocationChange) {
        await onHomeLocationChange(area)
      }
      setEditing(false)
    } catch {
      // GPS denied or geocode failed — fall back to manual input
      setEditing(true)
    }
    setDetecting(false)
    setSaving(false)
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      if (onHomeLocationChange) {
        await onHomeLocationChange('')
      }
      setAreaInput('')
      setEditing(true)
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <MapPin size={12} className="text-primary" />
        Area Intelligence
      </div>

      {/* ── COMMUTE ── */}
      {!homeLocation || editing ? (
        // EMPTY / EDITING STATE
        <div>
          <div className="label-mono px-0 pt-1 pb-1.5 text-[11px]">Commute</div>

          {detecting ? (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              Detecting your area…
            </div>
          ) : editing ? (
            <div className="space-y-2">
              <input
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                placeholder="e.g. Bang Na, Bangkok"
                autoFocus
                className="w-full rounded-xs border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-primary"
              />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSave}
                  disabled={saving || !areaInput.trim()}
                  className="flex cursor-pointer items-center gap-1 rounded-xs bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save
                </button>
                {homeLocation && (
                  <button
                    onClick={() => { setEditing(false); setAreaInput(homeLocation) }}
                    className="cursor-pointer rounded-xs px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            // INITIAL EMPTY STATE — never set location before
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground py-1">
                Set your area to see commute directions and travel prices.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={handleDetect}
                  disabled={detecting}
                  className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-50"
                >
                  <LocateFixed size={12} />
                  Use current location
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-sidebar-hover"
                >
                  <Pencil size={12} />
                  Type area
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // FILLED STATE — show commute links
        <>
          <Section label="Commute">
            <LinkButton href={Links.directionsUrl(homeLocation, job.loc)} icon={<Bus size={14} />} label="Directions" />
            <LinkButton href={Links.rome2RioUrl(homeLocation, job.loc)} icon={<DollarSign size={14} />} label="Travel Prices" />
          </Section>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>from: {homeLocation}</span>
            <span>·</span>
            <button
              onClick={() => { setEditing(true); setAreaInput(homeLocation) }}
              className="cursor-pointer text-primary hover:underline"
            >
              change
            </button>
          </div>
        </>
      )}

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
      <button onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Less' : 'More'} area info
      </button>

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
