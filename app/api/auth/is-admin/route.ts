import { NextResponse } from 'next/server'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const h = await headers()
    const session = await auth.api.getSession({ headers: h })

    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false })
    }

    const isAdmin = session.user.email === process.env.ADMIN_EMAIL
    return NextResponse.json({ isAdmin })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
