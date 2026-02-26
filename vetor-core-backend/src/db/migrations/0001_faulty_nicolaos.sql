ALTER TABLE "brokers" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "brokers" ADD COLUMN "first_name" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "brokers" ADD COLUMN "last_name" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "external_id" varchar(255);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "stage" varchar(100);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "stage_entered_at" timestamp;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "potential_commission" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "exclusividade" jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "origem" varchar(100);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "company_id" varchar(255);