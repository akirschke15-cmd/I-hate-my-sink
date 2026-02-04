ALTER TABLE "customers" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;