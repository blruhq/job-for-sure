'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import titlesData from '@/data/job-titles.json'

interface RoleAutocompleteProps {
  value: string
  onChange: (val: string) => void
  onKeyDownEnter: () => void
}

export function RoleAutocomplete({
  value,
  onChange,
  onKeyDownEnter,
}: RoleAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter job titles based on query
  const suggestions = useMemo(() => {
    const q = value.toLowerCase().trim()
    if (q.length < 2) return []

    return (titlesData as string[])
      .filter((t: string) => t.toLowerCase().includes(q))
      .slice(0, 8)
  }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (title: string) => {
    onChange(title)
    setIsOpen(false)
    setActiveIndex(-1)
  }

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
    <div ref={containerRef} className="relative flex-1 min-w-[200px]">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Job title or keywords…"
        className="w-full rounded-sm border border-border bg-background py-1.5 pl-8 pr-6 text-[12px] outline-none focus:border-primary"
      />
      {value && (
        <button
          onClick={() => {
            onChange('')
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
          {suggestions.map((title: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleSelect(title)}
              className={`block w-full px-3 py-1.5 text-left text-[11px] transition-colors ${
                idx === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
