DO $$ BEGIN
 CREATE TYPE "public"."bowl_config" AS ENUM('single', 'double_equal', 'large_small', 'triple', 'bar');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."drain_location" AS ENUM('rear', 'center', 'right_offset', 'left_offset');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sink_install_type" AS ENUM('undermount', 'top_mount', 'farmhouse_apron', 'seamless_undermount', 'flush_mount');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sink_series" AS ENUM('quartz_farmhouse', 'quartz_undermount', 'quartz_top_mount', 'quartz_workstation', 'quartz_seamless', 'fusion_stainless', 'elite_stainless', 'elite_workstation', 'matrix_workstation', 'select_stainless', 'profile_stainless', 'edge_stainless', 'fireclay', 'sternhagen', 'cinox');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."cabinet_integrity" AS ENUM('good', 'questionable', 'compromised');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."existing_sink_material" AS ENUM('cast_iron', 'stainless_steel', 'composite', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."supply_valve_position" AS ENUM('floor', 'low_back_wall', 'high_back_wall');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "sink_material" ADD VALUE 'quartz_composite';--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "series" "sink_series";--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "manufacturer" varchar(100) DEFAULT 'Karran';--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "model_number" varchar(50);--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "installation_type" "sink_install_type";--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "bowl_configuration" "bowl_config";--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "mfg_min_cabinet_width_inches" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "ihms_min_cabinet_width_inches" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "faucet_holes" integer;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "drain_size" varchar(20);--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "drain_location" "drain_location";--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "corner_radius" varchar(20);--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "apron_depth_inches" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "steel_gauge" varchar(10);--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "heat_safe_temp_f" integer;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "template_included" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "clips_included" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "is_workstation" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "accessories_included" jsonb;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "bowl_dimensions" jsonb;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "available_colors" jsonb;--> statement-breakpoint
ALTER TABLE "sinks" ADD COLUMN "countertop_compatibility" jsonb;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "existing_sink_material" "existing_sink_material";--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "backsplash_overhang_inches" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "cabinet_integrity" "cabinet_integrity";--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "ro_system_present" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "ro_tank_clearance_inches" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "supply_valve_position" "supply_valve_position";--> statement-breakpoint
ALTER TABLE "measurements" ADD COLUMN "basin_depth_clearance_inches" numeric(4, 2);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sinks_series_idx" ON "sinks" USING btree ("series");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sinks_model_number_idx" ON "sinks" USING btree ("model_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sinks_installation_type_idx" ON "sinks" USING btree ("installation_type");