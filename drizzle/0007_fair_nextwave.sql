DROP INDEX "usage_events_userId_feature_createdAt_idx";--> statement-breakpoint
ALTER TABLE "interview_sessions" ALTER COLUMN "score" SET DATA TYPE numeric(4, 1);--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_stripeCustomer_plan_idx" ON "subscriptions" USING btree ("stripe_customer_id","plan");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_events_userId_feature_createdAt_idx" ON "usage_events" USING btree ("user_id","feature","created_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_stripe_customer_id_unique" UNIQUE("stripe_customer_id");