import { Resend } from 'resend'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Job For Sure <noreply@blru.site>'

export async function sendVerificationEmail({
  user,
  url,
}: {
  user: { email: string; name?: string | null }
  url: string
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: 'Verify your email · Job For Sure',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="width: 14px; height: 14px; background: #8B6F47; border-radius: 3px; margin-bottom: 24px;" />
        <h1 style="font-size: 18px; font-weight: 600; margin: 0 0 8px;">Verify your email</h1>
        <p style="color: #71706A; font-size: 13px; line-height: 1.5; margin: 0 0 24px;">
          Click the button below to verify your email address and start using Job For Sure.
        </p>
        <a href="${escapeHtml(url)}" style="display: inline-block; background: #0D9488; color: white; font-size: 13px; font-weight: 500; padding: 10px 24px; border-radius: 6px; text-decoration: none;">
          Verify email
        </a>
        <p style="color: #9F9E98; font-size: 11px; margin-top: 32px;">
          If you didn't create an account, you can ignore this email.
        </p>
      </div>
    `,
  })
  if (error) {
    console.error('[Resend] Verification email failed:', error)
    throw new Error(`Failed to send verification email: ${error.message}`)
  }
}

export async function sendPasswordResetEmail({
  user,
  url,
}: {
  user: { email: string; name?: string | null }
  url: string
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: 'Reset your password · Job For Sure',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="width: 14px; height: 14px; background: #8B6F47; border-radius: 3px; margin-bottom: 24px;" />
        <h1 style="font-size: 18px; font-weight: 600; margin: 0 0 8px;">Reset your password</h1>
        <p style="color: #71706A; font-size: 13px; line-height: 1.5; margin: 0 0 24px;">
          Click the button below to reset your password. This link expires in 1 hour.
        </p>
        <a href="${escapeHtml(url)}" style="display: inline-block; background: #0D9488; color: white; font-size: 13px; font-weight: 500; padding: 10px 24px; border-radius: 6px; text-decoration: none;">
          Reset password
        </a>
        <p style="color: #9F9E98; font-size: 11px; margin-top: 32px;">
          If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  })
  if (error) {
    console.error('[Resend] Password reset email failed:', error)
    throw new Error(`Failed to send password reset email: ${error.message}`)
  }
}

export async function sendExistingAccountEmail({
  email,
  loginUrl,
}: {
  email: string
  loginUrl: string
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'You already have an account · Job For Sure',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="width: 14px; height: 14px; background: #8B6F47; border-radius: 3px; margin-bottom: 24px;" />
        <h1 style="font-size: 18px; font-weight: 600; margin: 0 0 8px;">You already have an account</h1>
        <p style="color: #71706A; font-size: 13px; line-height: 1.5; margin: 0 0 24px;">
          Someone tried to create a new account with this email address, but an account already exists.
          If this was you, sign in to your existing account.
        </p>
        <a href="${escapeHtml(loginUrl)}" style="display: inline-block; background: #0D9488; color: white; font-size: 13px; font-weight: 500; padding: 10px 24px; border-radius: 6px; text-decoration: none;">
          Sign in
        </a>
        <p style="color: #9F9E98; font-size: 11px; margin-top: 32px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })
  if (error) {
    console.error('[Resend] Existing account email failed:', error)
    throw new Error(`Failed to send existing account email: ${error.message}`)
  }
}
