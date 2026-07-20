DROP INDEX "subscriptions_stripeCustomer_plan_idx";--> statement-breakpoint
DROP INDEX "usage_events_userId_feature_createdAt_idx";--> statement-breakpoint
CREATE INDEX "usage_events_userId_feature_createdAt_idx" ON "usage_events" USING btree ("user_id","feature","created_at");