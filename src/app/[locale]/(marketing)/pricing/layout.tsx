import type { Metadata } from 'next'
import { buildAlternates, ogImageUrl } from '~/lib/seo'
import { productSchema, JsonLd } from '~/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = 'Pricing'
  const description = 'Start free with 3 resumes, 15 AI chats/day, and full job board access. Upgrade to Pro for unlimited everything — $4/month or $29/year.'

  return {
    title,
    description,
    alternates: buildAlternates('/pricing'),
    openGraph: {
      title: 'Pricing · Job For Sure',
      description,
      type: 'website',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      images: [{ url: ogImageUrl('Job For Sure Pricing', description), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Pricing · Job For Sure',
      description,
      images: [ogImageUrl('Job For Sure Pricing')],
    },
  }
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JsonLd data={productSchema(
        'Job For Sure Pro',
        '4.00',
        'USD',
        'Unlimited resumes, AI chats, cover letters, ATS matches, and interview prep sessions.'
      )} />
      <JsonLd data={productSchema(
        'Job For Sure Free',
        '0.00',
        'USD',
        '3 resumes, 15 AI chats per day, 3 cover letters per week, 5 ATS matches per day, 3 interview prep sessions per week.'
      )} />
    </>
  )
}
