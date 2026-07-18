ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint

-- ── Bootstrap founder as admin (one-time seed) ──
-- Idempotent: safe to re-run on rollback/replay.
UPDATE "user"
SET "role" = 'admin'
WHERE "email" = 'longpantorn@gmail.com'
  AND ("role" IS NULL OR "role" = 'user');
