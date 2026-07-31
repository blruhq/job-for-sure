import { describe, it, expect } from 'vitest'
import {
  buildAlternates,
  ogImageUrl,
  faqSchema,
  productSchema,
  SITE_URL,
  SITE_NAME,
  LOCALES,
} from '~/lib/seo'

describe('buildAlternates', () => {
  it('builds canonical + locale alternates for the landing page', () => {
    const result = buildAlternates('')
    expect(result).toEqual({
      canonical: '/',
      languages: {
        en: '/en',
        th: '/th',
        'x-default': '/en',
      },
    })
  })

  it('builds locale alternates for a nested path', () => {
    const result = buildAlternates('/pricing')
    expect(result).toEqual({
      canonical: '/pricing',
      languages: {
        en: '/en/pricing',
        th: '/th/pricing',
        'x-default': '/en/pricing',
      },
    })
  })
})

describe('ogImageUrl', () => {
  it('returns a URL with only the title param', () => {
    const url = ogImageUrl('Job For Sure')
    expect(url.startsWith('/api/og?')).toBe(true)
    const params = new URL(url, 'http://localhost').searchParams
    expect(params.get('title')).toBe('Job For Sure')
    expect(params.get('subtitle')).toBeNull()
  })

  it('includes the subtitle param when provided', () => {
    const url = ogImageUrl('Pricing', 'Start free today')
    const params = new URL(url, 'http://localhost').searchParams
    expect(params.get('title')).toBe('Pricing')
    expect(params.get('subtitle')).toBe('Start free today')
  })
})

describe('faqSchema', () => {
  it('returns FAQPage schema with mapped questions', () => {
    const result = faqSchema([
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
    ])
    expect(result['@type']).toBe('FAQPage')
    expect(result.mainEntity).toHaveLength(2)
    expect(result.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Q1',
      acceptedAnswer: { '@type': 'Answer', text: 'A1' },
    })
  })
})

describe('productSchema', () => {
  it('returns Product schema with offer details', () => {
    const result = productSchema('Job For Sure Pro', '4.00', 'USD', 'Unlimited everything.')
    expect(result['@type']).toBe('Product')
    expect(result.name).toBe('Job For Sure Pro')
    expect(result.offers).toEqual({
      '@type': 'Offer',
      price: '4.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    })
  })

  it('defaults currency to USD and description to name-based fallback', () => {
    const result = productSchema('Job For Sure Free', '0.00')
    expect(result.offers.priceCurrency).toBe('USD')
    expect(result.description).toBe('Job For Sure Free subscription')
  })
})

describe('shared constants', () => {
  it('exposes site name, fallback URL, and supported locales', () => {
    expect(SITE_NAME).toBe('Job For Sure')
    expect(SITE_URL).toBeTruthy()
    expect(LOCALES).toEqual(['en', 'th'])
  })
})
