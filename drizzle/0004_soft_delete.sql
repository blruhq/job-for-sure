ALTER TABLE "resumes" ADD COLUMN "deleted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "deleted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "deleted_at" timestamp;
