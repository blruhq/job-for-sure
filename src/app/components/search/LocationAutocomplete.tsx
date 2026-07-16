'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MapPin, X, Globe } from 'lucide-react'
import citiesData from '@/data/cities.json'

interface LocationAutocompleteProps {
  value: string
  onChange: (val: string) => void
  countryCode: string
  onSelectCountryCode: (code: string) => void
  onSelectRemoteOnly: (remote: boolean) => void
  onKeyDownEnter: () => void
}

interface CitySuggestion {
  type: string
  label: string
  value: string
  countryCode: string
}

interface CountryData {
  name: string
  thaiName: string
  code: string
  region: string
}

interface CityData {
  city: string;
  thaiCity?: string;
  country: string;
  code: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  countryCode,
  onSelectCountryCode,
  onSelectRemoteOnly,
  onKeyDownEnter,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Resolve flag emoji from country code
  const getFlag = (code: string) => {
    if (!code || code.length !== 2) return ''
    return code
      .toUpperCase()
      .split('')
      .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join('')
  }

  // 2. Filter countries and cities based on search input
  const suggestions = useMemo<CitySuggestion[]>(() => {
    const q = value.toLowerCase().trim()
    
    // Always provide remote option
    const remoteOption = { type: 'remote', label: '🌐 Remote / ทำงานระยะไกล', value: 'Remote', countryCode: '' }
    
    if (!q) {
      // Default suggestions when empty: Remote + Top countries/cities in SEA
      const defaults = [
        remoteOption,
        { type: 'country', label: '🇹🇭 Thailand / ประเทศไทย', value: 'Thailand', countryCode: 'TH' },
        { type: 'city', label: '🇹🇭 Bangkok / กรุงเทพมหานคร', value: 'Bangkok', countryCode: 'TH' },
        { type: 'country', label: '🇸🇬 Singapore / สิงคโปร์', value: 'Singapore', countryCode: 'SG' },
      ]
      return defaults
    }

    const filtered: CitySuggestion[] = []
    
    // Remote match
    if (
      'remote'.includes(q) || 
      'wfh'.includes(q) || 
      'work from home'.includes(q) ||
      'ทำงานระยะไกล'.includes(q) ||
      'ระยะไกล'.includes(q) ||
      'ทำงานที่บ้าน'.includes(q)
    ) {
      filtered.push(remoteOption)
    }

    // Match countries
    const matchingCountries = (citiesData.countries as CountryData[])
      .filter((c: CountryData) => 
        c.name.toLowerCase().includes(q) || 
        c.thaiName.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((c: CountryData) => ({
        type: 'country',
        label: `${getFlag(c.code)} ${c.name} ${c.thaiName ? `/ ${c.thaiName}` : ''}`,
        value: c.name,
        countryCode: c.code,
      }))
    filtered.push(...matchingCountries)

    // Match cities
    const matchingCities = (citiesData.cities as CityData[])
      .filter((c: CityData) => 
        c.city.toLowerCase().includes(q) || 
        (c.thaiCity && c.thaiCity.toLowerCase().includes(q)) ||
        c.country.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((c: CityData) => ({
        type: 'city',
        label: `${getFlag(c.code)} ${c.city} ${c.thaiCity ? `/ ${c.thaiCity}` : ''}`,
        value: c.city,
        countryCode: c.code,
      }))
    filtered.push(...matchingCities)

    return filtered
  }, [value])

  // 3. Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 4. Handle selection
  const handleSelect = (item: CitySuggestion) => {
    if (item.type === 'remote') {
      onChange('Remote')
      onSelectCountryCode('')
      onSelectRemoteOnly(true)
    } else {
      onChange(item.value)
      onSelectCountryCode(item.countryCode)
      onSelectRemoteOnly(false)
    }
    setIsOpen(false)
    setActiveIndex(-1)
  }

  // 5. Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
      } else if (e.key === 'Enter') {
        onKeyDownEnter()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex])
        } else {
          onKeyDownEnter()
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-[150px]">
      <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          onSelectCountryCode('') // Reset code on typing custom value
          setIsOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Location…"
        className="w-full rounded-sm border border-border bg-background py-1.5 pl-8 pr-6 text-[12px] outline-none focus:border-primary"
      />
      {value && (
        <button
          onClick={() => {
            onChange('')
            onSelectCountryCode('')
            setActiveIndex(-1)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={10} />
        </button>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[220px] overflow-y-auto rounded-sm border border-border bg-card shadow-lg">
          {suggestions.map((item: CitySuggestion, idx: number) => (
            <button
              key={idx}
              onClick={() => handleSelect(item)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors ${
                idx === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              {item.type === 'remote' ? (
                <Globe size={11} className="text-primary" />
              ) : (
                <span className="text-[12px]" role="img" aria-label="flag">
                  {getFlag(item.countryCode)}
                </span>
              )}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
