import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from './companies';

export const sinkMaterialEnum = pgEnum('sink_material', [
  'stainless_steel',
  'granite_composite',
  'cast_iron',
  'fireclay',
  'copper',
  'porcelain',
]);

export const sinkMountingStyleEnum = pgEnum('sink_mounting_style', [
  'undermount',
  'drop_in',
  'farmhouse',
  'flush_mount',
]);

export const sinks = pgTable('sinks', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  material: sinkMaterialEnum('material').notNull(),
  mountingStyle: sinkMountingStyleEnum('mounting_style').notNull(),
  // Dimensions in inches
  widthInches: decimal('width_inches', { precision: 6, scale: 2 }).notNull(),
  depthInches: decimal('depth_inches', { precision: 6, scale: 2 }).notNull(),
  heightInches: decimal('height_inches', { precision: 6, scale: 2 }).notNull(),
  bowlCount: integer('bowl_count').notNull().default(1),
  // Pricing
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  laborCost: decimal('labor_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  // Metadata
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('sinks_company_id_idx').on(table.companyId),
  isActiveIdx: index('sinks_is_active_idx').on(table.isActive),
  materialIdx: index('sinks_material_idx').on(table.material),
  mountingStyleIdx: index('sinks_mounting_style_idx').on(table.mountingStyle),
}));

export type Sink = typeof sinks.$inferSelect;
export type NewSink = typeof sinks.$inferInsert;
