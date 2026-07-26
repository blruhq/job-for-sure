DROP INDEX "applications_userId_idx";--> statement-breakpoint
DROP INDEX "cover_letters_userId_idx";--> statement-breakpoint
DROP INDEX "interview_sessions_userId_idx";--> statement-breakpoint
DROP INDEX "resumes_userId_idx";--> statement-breakpoint
CREATE INDEX "applications_userId_deletedAt_idx" ON "applications" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "cover_letters_userId_deletedAt_idx" ON "cover_letters" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "interview_sessions_userId_deletedAt_idx" ON "interview_sessions" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "resumes_userId_deletedAt_idx" ON "resumes" USING btree ("user_id","deleted_at");