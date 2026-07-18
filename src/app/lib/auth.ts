import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { db } from '~/lib/db'
import { sendVerificationEmail, sendPasswordResetEmail } from '~/lib/email'

// Fail-fast: Better Auth silently generates a random secret if unset, which
// invalidates all sessions on every serverless cold start. Refuse to boot.
if (!process.env.BETTER_AUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'BETTER_AUTH_SECRET must be set in production. Generate one with: openssl rand -base64 32',
  )
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ user, url })
    },
    // Required by admin plugin when requireEmailVerification is on —
    // prevents email enumeration by returning a synthetic user that
    // includes the plugin's extra fields (role, banned, …).
    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      role: 'user',
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      id,
    }),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ user, url })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
  ],
  trustedOrigins: (() => {
    const origins = [
      process.env.BETTER_AUTH_URL,
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
      process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
      process.env.NODE_ENV === 'development' && 'http://localhost:3000',
    ].filter(Boolean) as string[]
    if (origins.length === 0) {
      console.warn('[auth] No trusted origins configured — auth may reject requests')
    }
    return origins
  })(),
})
