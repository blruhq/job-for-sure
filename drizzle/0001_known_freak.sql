ALTER TABLE "tailored_resumes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tailored_resumes" CASCADE;--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_tailored_resume_id_tailored_resumes_id_fk";
--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "tailored_resume_id";