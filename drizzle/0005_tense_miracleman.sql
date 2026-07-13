ALTER TABLE "applications_data" DROP CONSTRAINT "pipeline_data_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "applications_data" ADD CONSTRAINT "applications_data_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_userId_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cover_letters_userId_idx" ON "cover_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_userId_idx" ON "interview_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resumes_userId_idx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tailored_resumes_userId_idx" ON "tailored_resumes" USING btree ("user_id");