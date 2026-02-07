import { z } from 'zod';

export const sinkMaterials = [
  'stainless_steel',
  'granite_composite',
  'quartz_composite',
  'cast_iron',
  'fireclay',
  'copper',
  'porcelain',
] as const;

export const sinkMountingStyles = ['undermount', 'drop_in', 'farmhouse', 'flush_mount'] as const;

export const sinkSeries = [
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
] as const;

export const bowlConfigurations = [
  'single',
  'double_equal',
  'large_small',
  'triple',
  'bar',
] as const;

export const drainLocations = ['rear', 'center', 'right_offset', 'left_offset'] as const;

export const sinkInstallTypes = [
  'undermount',
  'top_mount',
  'farmhouse_apron',
  'seamless_undermount',
  'flush_mount',
] as const;

export const listSinksSchema = z.object({
  material: z.enum(sinkMaterials).optional(),
  mountingStyle: z.enum(sinkMountingStyles).optional(),
  series: z.enum(sinkSeries).optional(),
  bowlConfiguration: z.enum(bowlConfigurations).optional(),
  installationType: z.enum(sinkInstallTypes).optional(),
  isWorkstation: z.boolean().optional(),
  minWidthInches: z.number().positive().optional(),
  maxWidthInches: z.number().positive().optional(),
  minDepthInches: z.number().positive().optional(),
  maxDepthInches: z.number().positive().optional(),
  maxMinCabinetWidth: z.number().positive().optional(),
  bowlCount: z.number().int().min(1).max(3).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'width', 'series', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const createSinkSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  material: z.enum(sinkMaterials),
  mountingStyle: z.enum(sinkMountingStyles),
  widthInches: z.number().positive().max(60),
  depthInches: z.number().positive().max(36),
  heightInches: z.number().positive().max(18),
  bowlCount: z.number().int().min(1).max(3).default(1),
  basePrice: z.number().positive(),
  laborCost: z.number().min(0).default(0),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  // Karran catalogue fields
  series: z.enum(sinkSeries).optional(),
  manufacturer: z.string().max(100).optional(),
  modelNumber: z.string().max(50).optional(),
  installationType: z.enum(sinkInstallTypes).optional(),
  bowlConfiguration: z.enum(bowlConfigurations).optional(),
  mfgMinCabinetWidthInches: z.number().positive().optional(),
  ihmsMinCabinetWidthInches: z.number().positive().optional(),
  faucetHoles: z.number().int().min(0).max(5).optional(),
  drainSize: z.string().max(20).optional(),
  drainLocation: z.enum(drainLocations).optional(),
  cornerRadius: z.string().max(20).optional(),
  apronDepthInches: z.number().positive().optional(),
  steelGauge: z.string().max(10).optional(),
  heatSafeTempF: z.number().int().positive().optional(),
  templateIncluded: z.boolean().optional(),
  clipsIncluded: z.boolean().optional(),
  isWorkstation: z.boolean().optional(),
  accessoriesIncluded: z.array(z.string()).optional(),
  bowlDimensions: z.record(z.unknown()).optional(),
  availableColors: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        hex: z.string().optional(),
      })
    )
    .optional(),
  countertopCompatibility: z.array(z.string()).optional(),
});

export const updateSinkSchema = createSinkSchema.partial().extend({
  id: z.string().uuid(),
});

export const matchToMeasurementSchema = z.object({
  measurementId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(10),
  preferences: z
    .object({
      colorPreference: z.string().optional(),
      bowlConfiguration: z.enum(bowlConfigurations).optional(),
      installationType: z.enum(sinkInstallTypes).optional(),
      maxPrice: z.number().positive().optional(),
      preferWorkstation: z.boolean().optional(),
    })
    .optional(),
});

export type ListSinksInput = z.infer<typeof listSinksSchema>;
export type CreateSinkInput = z.infer<typeof createSinkSchema>;
export type UpdateSinkInput = z.infer<typeof updateSinkSchema>;
export type MatchToMeasurementInput = z.infer<typeof matchToMeasurementSchema>;
export type SinkMaterial = (typeof sinkMaterials)[number];
export type SinkMountingStyle = (typeof sinkMountingStyles)[number];
export type SinkSeries = (typeof sinkSeries)[number];
export type BowlConfiguration = (typeof bowlConfigurations)[number];
export type DrainLocation = (typeof drainLocations)[number];
export type SinkInstallType = (typeof sinkInstallTypes)[number];
