ALTER TABLE "pipeline_data" RENAME TO "applications_data";
--> statement-breakpoint
ALTER INDEX "pipeline_data_user_id_user_id_fk" RENAME TO "applications_data_user_id_user_id_fk";
