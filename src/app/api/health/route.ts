import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { sql } from 'drizzle-orm'

/**
 * GET /api/health
 *
 * Public health check endpoint for deployment monitoring.
 * Verifies that the database connection is alive by executing SELECT 1.
 * Returns:
 *   - 200 { status: 'ok', timestamp } on success
 *   - 503 { status: 'error' } on failure
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
