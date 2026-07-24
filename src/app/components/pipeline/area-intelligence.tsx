'use client'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useState } from 'react'
import {
  MapPin, Bus, DollarSign, Home, Hotel, Shield, Star, HeartPulse,
  UtensilsCrossed, ChevronDown, ChevronUp, ExternalLink,
  LocateFixed, Loader2, Pencil, Check,
} from 'lucide-react'
import * as Links from '~/lib/area-links'
import { detectArea } from '~/lib/geo'
import { notify } from '~/lib/toast'

interface AreaIntelligenceProps {
  job: {
    company: string
    loc: string
    title: string
  }
  homeLocation: string  // from user settings
  city: string          // structured city name for Numbeo, housing
  district?: string     // structured district/neighborhood for Maps, commute
  countryCode: string   // detected country code for property/visa
  /** Called when user sets/changes their area. Parent saves to DB. */
  onHomeLocationChange?: (location: string) => Promise<void>
}

export function AreaIntelligence({ job, homeLocation, city, district, countryCode, onHomeLocationChange }: AreaIntelligenceProps) {
  const [expanded, setExpanded] = useState(false)
  const propertySites = Links.getPropertySites(countryCode)
  const visa = Links.visaUrl(countryCode)

  // For commute/directions: prefer district+city (more specific for routing)
  // Fall back to full location string
  const commuteDestination = district ? `${district}, ${city}` : job.loc

  // ── Commute inline state ──
  const [editing, setEditing] = useState(false)
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
      console.error('Failed to detect area')
      notify({ message: 'Could not detect location. Type your area manually.', type: 'error' })
      setEditing(true)
    }
    setDetecting(false)
    setSaving(false)
  }

  return (
    <div className="rounded-lg neuro-card p-5 space-y-6">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <MapPin size={12} className="text-primary" />
        Area Intelligence
      </div>

      {/* ── COMMUTE ── */}
      {!homeLocation || editing ? (
        // EMPTY / EDITING STATE
        <div>
          <div className="label-mono px-0 pt-1 pb-1.5 text-xs">Commute</div>

          {detecting ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              Detecting your area…
            </div>
          ) : editing ? (
            <div className="space-y-2">
              <Input
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                placeholder="e.g. Bang Na, Bangkok"
                autoFocus
                className="w-full px-2 py-1.5 text-xs"
              />
              <div className="flex items-center gap-1.5">
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={saving || !areaInput.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save
                </Button>
                {homeLocation && (
                  <Button
                    variant="ghost"
                    onClick={() => { setEditing(false); setAreaInput(homeLocation) }}
                    className="px-2 py-1.5 text-xs"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // INITIAL EMPTY STATE — never set location before
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground py-1">
                Set your area to see commute directions and travel prices.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  onClick={handleDetect}
                  disabled={detecting}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium"
                >
                  <LocateFixed size={12} />
                  Use current location
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium"
                >
                  <Pencil size={12} />
                  Type area
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // FILLED STATE — show commute links
        <>
          <Section label="Commute">
            <LinkButton href={Links.directionsUrl(homeLocation, commuteDestination)} icon={<Bus size={14} />} label="Directions" />
            <LinkButton href={Links.rome2RioUrl(homeLocation, commuteDestination)} icon={<DollarSign size={14} />} label="Travel Prices" />
          </Section>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>from: {homeLocation}</span>
            <span>·</span>
            <Button
              variant="link"
              onClick={() => { setEditing(true); setAreaInput(homeLocation) }}
              className="text-[10px]"
            >
              change
            </Button>
          </div>
        </>
      )}

      {/* MONEY */}
      <Section label="Money">
        <LinkButton href={Links.costOfLivingUrl(city, countryCode)} icon={<DollarSign size={14} />} label="Cost of Living" />
        <LinkButton href={Links.salaryCalculatorUrl(city, countryCode)} icon={<DollarSign size={14} />} label="Salary Check" />
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
      <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs">
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Less' : 'More'} area info
      </Button>

      {expanded && (
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap gap-2.5">
            <LinkButton href={Links.agodaUrl(city)} icon={<Hotel size={14} />} label="Temporary Stay" />
            {visa && <LinkButton href={visa.url} icon={<Shield size={14} />} label={visa.name} />}
            <LinkButton href={Links.crimeUrl(city, countryCode)} icon={<Shield size={14} />} label="Safety / Crime" />
            <LinkButton href={Links.qualityOfLifeUrl(city, countryCode)} icon={<Star size={14} />} label="Quality of Life" />
            <LinkButton href={Links.healthcareUrl(city, countryCode)} icon={<HeartPulse size={14} />} label="Healthcare" />
            <LinkButton href={Links.restaurantsUrl(district ? `${district}, ${city}` : city)} icon={<UtensilsCrossed size={14} />} label="Restaurants Nearby" />
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
      <div className="label-mono px-0 pt-1 pb-2.5 text-xs">{label}</div>
      <div className="flex flex-wrap gap-2.5">{children}</div>
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
      className="inline-flex items-center gap-1.5 rounded-xs neuro-pill px-3 py-2 text-xs font-medium text-foreground transition-shadow hover:bg-accent-soft"
    >
      {icon}
      {label}
      <ExternalLink size={10} className="opacity-40 shrink-0" />
    </a>
  )
}
