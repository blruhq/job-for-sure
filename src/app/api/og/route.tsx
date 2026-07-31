import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Job For Sure'
  const subtitle = searchParams.get('subtitle') || ''

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(56, 189, 248, 0.08), transparent 50%)',
          padding: '80px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#38bdf8',
              fontSize: '32px',
              fontWeight: 700,
              color: '#0a0a0a',
            }}
          >
            J
          </div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#38bdf8' }}>
            Job For Sure
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '60px', fontWeight: 700, lineHeight: 1.1, maxWidth: '900px' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '28px', color: '#94a3b8', maxWidth: '800px', lineHeight: 1.4 }}>
              {subtitle.length > 120 ? subtitle.substring(0, 120) + '...' : subtitle}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', color: '#475569' }}>
            jobforsure.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
