import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * Fetch a resume by ID, scoped to the authenticated user and excluding soft-deleted rows.
 * Returns `undefined` if not found or not owned by the user.
 *
 * This is the standard ownership check used by all resume-scoped API routes.
 * Using this helper ensures consistent soft-delete filtering across the codebase.
 */
export async function getResumeForUser(
  userId: string,
  resumeId: string,
): Promise<typeof resumes.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId), isNull(resumes.deletedAt)))
    .limit(1)
  return row
}
