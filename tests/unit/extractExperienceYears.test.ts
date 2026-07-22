import { describe, it, expect } from 'vitest'
import { extractExperienceYears } from '~/lib/job-sources/types'

describe('extractExperienceYears', () => {
  it('extracts "3-5 years" from "3-5 years of experience"', () => {
    expect(extractExperienceYears('3-5 years of experience')).toBe('3-5 years')
  })

  it('extracts "2+ years" from "2+ years"', () => {
    expect(extractExperienceYears('2+ years')).toBe('2+ years')
  })

  it('extracts "5+ years" from "minimum 5 years"', () => {
    expect(extractExperienceYears('minimum 5 years')).toBe('5+ years')
  })

  it('returns undefined when no experience text is present', () => {
    expect(extractExperienceYears('no relevant text')).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(extractExperienceYears('')).toBeUndefined()
  })

  it('returns the first match when multiple matches exist', () => {
    expect(extractExperienceYears('Requires 3-5 years experience and 7+ years total in tech')).toBe('3-5 years')
  })

  it('handles "3 to 5 years" pattern', () => {
    expect(extractExperienceYears('3 to 5 years of experience required')).toBe('3-5 years')
  })

  it('handles "yrs" abbreviation', () => {
    expect(extractExperienceYears('2-4 yrs of experience')).toBe('2-4 years')
  })

  it('handles "5+ yrs" pattern', () => {
    expect(extractExperienceYears('5+ yrs experience')).toBe('5+ years')
  })

  it('handles "at least 3 years of experience"', () => {
    expect(extractExperienceYears('at least 3 years of experience')).toBe('3+ years')
  })

  it('handles en-dash separator "3–5 years"', () => {
    expect(extractExperienceYears('3–5 years experience')).toBe('3-5 years')
  })
})
