import { db } from '~/lib/db'
import { user, resumes, applications, interviewSessions, coverLetters } from '~/lib/schema'
import { requireAdmin } from '~/lib/auth-helpers'
import { count, desc, sql } from 'drizzle-orm'
import { SourceHealth } from '~/components/admin/source-health'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // ── Auth check (admin-only) ──
  await requireAdmin()

  // ── Stats queries ──
  const [userCount] = await db.select({ total: count() }).from(user)
  const [resumeCount] = await db.select({ total: count() }).from(resumes)
  const [applicationCount] = await db.select({ total: count() }).from(applications)
  const [interviewCount] = await db.select({ total: count() }).from(interviewSessions)
  let coverLetterCount = { total: 0 }
  try {
    ;[coverLetterCount] = await db.select({ total: count() }).from(coverLetters)
  } catch {
    // Table might not exist yet if Task B migration hasn't run
  }

  // ── Plan breakdown (Free vs Pro) ──
  const [freeUsers] = await db
    .select({ total: count() })
    .from(user)
    .where(sql`${user.plan} = 'free'`)
  const [proUsers] = await db
    .select({ total: count() })
    .from(user)
    .where(sql`${user.plan} = 'pro'`)

  // ── Recent signups (last 10) ──
  const recentUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(10)

  // ── Recent interviews (last 5) ──
  const recentInterviews = await db
    .select({
      id: interviewSessions.id,
      company: interviewSessions.company,
      role: interviewSessions.role,
      score: interviewSessions.score,
      type: interviewSessions.type,
      createdAt: interviewSessions.createdAt,
      userId: interviewSessions.userId,
    })
    .from(interviewSessions)
    .orderBy(desc(interviewSessions.createdAt))
    .limit(5)

  // ── Users joined this week ──
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [weekCount] = await db
    .select({ total: count() })
    .from(user)
    .where(sql`${user.createdAt} >= ${oneWeekAgo}`)

  return (
    <div className="h-full overflow-y-auto neuro-surface">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">Read-only overview of your database</p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <StatCard label="Users" value={userCount.total} />
          <StatCard label="New This Week" value={weekCount.total} />
          <StatCard label="Free Users" value={freeUsers.total} />
          <StatCard label="Pro Users" value={proUsers.total} />
          <StatCard label="Resumes" value={resumeCount.total} />
          <StatCard label="Applications" value={applicationCount.total} />
          <StatCard label="Interviews" value={interviewCount.total} />
          <StatCard label="Cover Letters" value={coverLetterCount.total} />
        </div>

        {/* ── Recent Signups ── */}
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Signups
          </h2>
          <div className="overflow-hidden rounded-lg neuro-card">
            <table className="w-full text-xs">
              <thead className="neuro-inset">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      No users yet
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{u.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent Interviews ── */}
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Interviews
          </h2>
          <div className="overflow-hidden rounded-lg neuro-card">
            <table className="w-full text-xs">
              <thead className="neuro-inset">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Company</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Score</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No interviews yet
                    </td>
                  </tr>
                ) : (
                  recentInterviews.map((iv) => (
                    <tr key={iv.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{iv.company}</td>
                      <td className="px-3 py-2 text-muted-foreground">{iv.role}</td>
                      <td className="px-3 py-2 text-muted-foreground">{iv.type}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-primary">{iv.score}/10</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {new Date(iv.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Source Health ── */}
        <SourceHealth />
      </div>
    </div>
  )
}

// ── Helper component ──
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg neuro-card p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}
