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
  jsonb,
} from 'drizzle-orm/pg-core';
import { companies } from './companies';

export const sinkMaterialEnum = pgEnum('sink_material', [
  'stainless_steel',
  'granite_composite',
  'quartz_composite',
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

export const sinkSeriesEnum = pgEnum('sink_series', [
  'quartz_farmhouse',
  'quartz_undermount',
  'quartz_top_mount',
  'quartz_workstation',
  'quartz_seamless',
  'fusion_stainless',
  'elite_stainless',
  'elite_workstation',
  'matrix_workstation',
  'select_stainless',
  'profile_stainless',
  'edge_stainless',
  'fireclay',
  'sternhagen',
  'cinox',
]);

export const bowlConfigEnum = pgEnum('bowl_config', [
  'single',
  'double_equal',
  'large_small',
  'triple',
  'bar',
]);

export const drainLocationEnum = pgEnum('drain_location', [
  'rear',
  'center',
  'right_offset',
  'left_offset',
]);

export const sinkInstallTypeEnum = pgEnum('sink_install_type', [
  'undermount',
  'top_mount',
  'farmhouse_apron',
  'seamless_undermount',
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
  // Karran catalogue fields
  series: sinkSeriesEnum('series'),
  manufacturer: varchar('manufacturer', { length: 100 }).default('Karran'),
  modelNumber: varchar('model_number', { length: 50 }),
  installationType: sinkInstallTypeEnum('installation_type'),
  bowlConfiguration: bowlConfigEnum('bowl_configuration'),
  mfgMinCabinetWidthInches: decimal('mfg_min_cabinet_width_inches', { precision: 6, scale: 2 }),
  ihmsMinCabinetWidthInches: decimal('ihms_min_cabinet_width_inches', { precision: 6, scale: 2 }),
  faucetHoles: integer('faucet_holes'),
  drainSize: varchar('drain_size', { length: 20 }),
  drainLocation: drainLocationEnum('drain_location'),
  cornerRadius: varchar('corner_radius', { length: 20 }),
  apronDepthInches: decimal('apron_depth_inches', { precision: 6, scale: 2 }),
  steelGauge: varchar('steel_gauge', { length: 10 }),
  heatSafeTempF: integer('heat_safe_temp_f'),
  templateIncluded: boolean('template_included').default(false),
  clipsIncluded: boolean('clips_included').default(false),
  isWorkstation: boolean('is_workstation').default(false),
  accessoriesIncluded: jsonb('accessories_included').$type<string[]>(),
  bowlDimensions: jsonb('bowl_dimensions').$type<Record<string, unknown>>(),
  availableColors: jsonb('available_colors').$type<{ code: string; name: string; hex?: string }[]>(),
  countertopCompatibility: jsonb('countertop_compatibility').$type<string[]>(),
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
  seriesIdx: index('sinks_series_idx').on(table.series),
  modelNumberIdx: index('sinks_model_number_idx').on(table.modelNumber),
  installationTypeIdx: index('sinks_installation_type_idx').on(table.installationType),
}));

export type Sink = typeof sinks.$inferSelect;
export type NewSink = typeof sinks.$inferInsert;
