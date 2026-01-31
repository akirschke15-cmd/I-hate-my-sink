import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  jsonb,
  pgEnum,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { customers } from './customers';
import { users } from './users';

export const countertopMaterialEnum = pgEnum('countertop_material', [
  'granite',
  'quartz',
  'marble',
  'laminate',
  'solid_surface',
  'butcher_block',
  'concrete',
  'tile',
  'stainless_steel',
  'other',
]);

export const mountingStyleEnum = pgEnum('mounting_style', [
  'drop_in',
  'undermount',
  'farmhouse',
  'flush_mount',
]);

export const measurements = pgTable('measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  // Cabinet measurements (inches)
  cabinetWidthInches: decimal('cabinet_width_inches', { precision: 6, scale: 2 }).notNull(),
  cabinetDepthInches: decimal('cabinet_depth_inches', { precision: 6, scale: 2 }).notNull(),
  cabinetHeightInches: decimal('cabinet_height_inches', { precision: 6, scale: 2 }).notNull(),
  // Countertop details
  countertopMaterial: countertopMaterialEnum('countertop_material'),
  countertopThicknessInches: decimal('countertop_thickness_inches', { precision: 4, scale: 2 }),
  countertopOverhangFrontInches: decimal('countertop_overhang_front_inches', {
    precision: 4,
    scale: 2,
  }),
  countertopOverhangSidesInches: decimal('countertop_overhang_sides_inches', {
    precision: 4,
    scale: 2,
  }),
  // Mounting style
  mountingStyle: mountingStyleEnum('mounting_style'),
  // Faucet configuration
  faucetHoleCount: integer('faucet_hole_count'),
  faucetHoleSpacing: varchar('faucet_hole_spacing', { length: 50 }), // e.g., "4 inch center", "8 inch spread"
  // Existing sink (if replacing)
  existingSinkWidthInches: decimal('existing_sink_width_inches', { precision: 6, scale: 2 }),
  existingSinkDepthInches: decimal('existing_sink_depth_inches', { precision: 6, scale: 2 }),
  existingSinkBowlCount: integer('existing_sink_bowl_count'),
  // Clearances
  backsplashHeightInches: decimal('backsplash_height_inches', { precision: 4, scale: 2 }),
  windowClearanceInches: decimal('window_clearance_inches', { precision: 4, scale: 2 }),
  plumbingCenterlineFromLeft: decimal('plumbing_centerline_from_left', { precision: 6, scale: 2 }),
  // Accessories
  garbageDisposal: boolean('garbage_disposal').default(false),
  dishwasherAirGap: boolean('dishwasher_air_gap').default(false),
  // Legacy fields (kept for backwards compatibility)
  existingCutoutWidthInches: decimal('existing_cutout_width_inches', { precision: 6, scale: 2 }),
  existingCutoutDepthInches: decimal('existing_cutout_depth_inches', { precision: 6, scale: 2 }),
  // Additional metadata
  photos: jsonb('photos').$type<string[]>().default([]),
  notes: text('notes'),
  location: varchar('location', { length: 100 }), // e.g., "Kitchen", "Bar", "Utility"
  // Offline sync support
  localId: varchar('local_id', { length: 100 }), // Client-generated ID for offline sync
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Measurement = typeof measurements.$inferSelect;
export type NewMeasurement = typeof measurements.$inferInsert;
