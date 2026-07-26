import { describe, it, expect } from 'vitest'
import {
  cultureProfileUrl,
  redditSearchUrl,
  glassdoorUrl,
  openCorporatesUrl,
  dataForThaiUrl,
  crunchbaseUrl,
  openSanctionsUrl,
  housingUrl,
  directionsUrl,
  costOfLivingUrl,
  type PropertySite,
} from '~/lib/area-links'

describe('slug() via cultureProfileUrl — punctuation stripping', () => {
  it('handles simple company name', () => {
    expect(cultureProfileUrl('Thoughtworks')).toBe(
      'https://jobsbyculture.com/companies/thoughtworks'
    )
  })

  it('handles spaces', () => {
    expect(cultureProfileUrl('CJ MORE')).toBe(
      'https://jobsbyculture.com/companies/cj-more'
    )
  })

  it('strips periods and commas from legal suffixes', () => {
    expect(cultureProfileUrl('Keranos Tech Co., Ltd.')).toBe(
      'https://jobsbyculture.com/companies/keranos-tech-co-ltd'
    )
  })

  it('strips parentheses and punctuation', () => {
    expect(cultureProfileUrl('Max Savings (Thailand) Co., Ltd.')).toBe(
      'https://jobsbyculture.com/companies/max-savings-thailand-co-ltd'
    )
  })

  it('collapses consecutive hyphens and trims edges', () => {
    expect(cultureProfileUrl('  --Weird   Name--  ')).toBe(
      'https://jobsbyculture.com/companies/weird-name'
    )
  })
})

describe('company intelligence URLs — query-param encoding preserved', () => {
  it('redditSearchUrl uses enc() not slug()', () => {
    expect(redditSearchUrl('Keranos Tech Co., Ltd.')).toBe(
      'https://www.reddit.com/search/?q=Keranos%20Tech%20Co.%2C%20Ltd.'
    )
  })

  it('glassdoorUrl uses enc() not slug()', () => {
    expect(glassdoorUrl('CJ MORE')).toBe(
      'https://www.glassdoor.com/Search/results.htm?keyword=CJ%20MORE'
    )
  })

  it('openCorporatesUrl uses enc()', () => {
    expect(openCorporatesUrl('Thoughtworks')).toBe(
      'https://opencorporates.com/companies?q=Thoughtworks'
    )
  })

  it('dataForThaiUrl uses enc()', () => {
    expect(dataForThaiUrl('CJ MORE')).toBe(
      'https://www.dataforthai.com/search?q=CJ%20MORE'
    )
  })

  it('crunchbaseUrl uses enc()', () => {
    expect(crunchbaseUrl('Thoughtworks')).toBe(
      'https://crunchbase.com/textsearch?q=Thoughtworks'
    )
  })

  it('openSanctionsUrl uses enc()', () => {
    expect(openSanctionsUrl('Thoughtworks')).toBe(
      'https://opensanctions.org/search/?q=Thoughtworks'
    )
  })
})

describe('housingUrl — slug for area', () => {
  const baania: PropertySite = { name: 'Baania', url: 'https://baania.com/s/{area}/rent' }

  it('slugs area name into path', () => {
    expect(housingUrl(baania, 'Bangkok')).toBe('https://baania.com/s/bangkok/rent')
  })

  it('handles multi-word area', () => {
    expect(housingUrl(baania, 'Pathum Thani')).toBe('https://baania.com/s/pathum-thani/rent')
  })

  it('returns base URL when no {area} placeholder', () => {
    const hipflat: PropertySite = { name: 'Hipflat', url: 'https://www.hipflat.co.th/en/condo-for-rent' }
    expect(housingUrl(hipflat, 'Bangkok')).toBe('https://www.hipflat.co.th/en/condo-for-rent')
  })
})

describe('directionsUrl — Google Maps', () => {
  it('builds valid Google Maps directions URL', () => {
    const url = directionsUrl('Bangkok', 'Pathum Thani', 'transit')
    expect(url).toContain('https://www.google.com/maps/dir/?api=1')
    expect(url).toContain('origin=Bangkok')
    expect(url).toContain('destination=Pathum%20Thani')
    expect(url).toContain('travelmode=transit')
  })

  it('returns # for empty inputs', () => {
    expect(directionsUrl('', 'Bangkok')).toBe('#')
    expect(directionsUrl('Bangkok', '')).toBe('#')
  })
})

describe('costOfLivingUrl — Numbeo normalization', () => {
  it('builds Numbeo URL for Bangkok', () => {
    expect(costOfLivingUrl('Bangkok', 'TH')).toBe(
      'https://www.numbeo.com/cost-of-living/in/Bangkok'
    )
  })

  it('falls back to Bangkok for unsupported TH cities', () => {
    expect(costOfLivingUrl('Pathum Thani', 'TH')).toBe(
      'https://www.numbeo.com/cost-of-living/in/Bangkok'
    )
  })
})
