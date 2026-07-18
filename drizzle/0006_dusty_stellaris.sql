CREATE INDEX "applications_resumeId_idx" ON "applications" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "applications_coverLetterId_idx" ON "applications" USING btree ("cover_letter_id");--> statement-breakpoint
CREATE INDEX "cover_letters_resumeId_idx" ON "cover_letters" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_resumeId_idx" ON "interview_sessions" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resumes_userId_isBase_idx" ON "resumes" USING btree ("user_id","is_base");