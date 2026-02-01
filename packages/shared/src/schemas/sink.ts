import { z } from 'zod';

export const sinkMaterials = [
  'stainless_steel',
  'granite_composite',
  'cast_iron',
  'fireclay',
  'copper',
  'porcelain',
] as const;

export const sinkMountingStyles = ['undermount', 'drop_in', 'farmhouse', 'flush_mount'] as const;

export const listSinksSchema = z.object({
  material: z.enum(sinkMaterials).optional(),
  mountingStyle: z.enum(sinkMountingStyles).optional(),
  minWidthInches: z.number().positive().optional(),
  maxWidthInches: z.number().positive().optional(),
  minDepthInches: z.number().positive().optional(),
  maxDepthInches: z.number().positive().optional(),
  bowlCount: z.number().int().min(1).max(3).optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['name', 'price', 'width', 'createdAt']).default('name'),
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
});

export const updateSinkSchema = createSinkSchema.partial().extend({
  id: z.string().uuid(),
});

export const matchToMeasurementSchema = z.object({
  measurementId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(10),
});

export type ListSinksInput = z.infer<typeof listSinksSchema>;
export type CreateSinkInput = z.infer<typeof createSinkSchema>;
export type UpdateSinkInput = z.infer<typeof updateSinkSchema>;
export type MatchToMeasurementInput = z.infer<typeof matchToMeasurementSchema>;
