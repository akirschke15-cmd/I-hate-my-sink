import { z } from 'zod';

export const countertopMaterials = [
  'granite',
  'quartz',
  'marble',
  'laminate',
  'solid_surface',
  'butcher_block',
  'concrete',
  'tile',
  'stainless_steel',
] as const;

export const measurementSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  // Cabinet measurements (in inches)
  cabinetWidthInches: z
    .number()
    .positive('Width must be positive')
    .max(120, 'Width cannot exceed 120 inches'),
  cabinetDepthInches: z
    .number()
    .positive('Depth must be positive')
    .max(48, 'Depth cannot exceed 48 inches'),
  cabinetHeightInches: z
    .number()
    .positive('Height must be positive')
    .max(48, 'Height cannot exceed 48 inches'),
  // Countertop details (optional)
  countertopMaterial: z.enum(countertopMaterials).optional(),
  countertopThicknessInches: z
    .number()
    .positive('Thickness must be positive')
    .max(4, 'Thickness cannot exceed 4 inches')
    .optional(),
  // Existing cutout (optional, for replacements)
  existingCutoutWidthInches: z
    .number()
    .positive('Cutout width must be positive')
    .max(120, 'Cutout width cannot exceed 120 inches')
    .optional(),
  existingCutoutDepthInches: z
    .number()
    .positive('Cutout depth must be positive')
    .max(48, 'Cutout depth cannot exceed 48 inches')
    .optional(),
  // Additional metadata
  location: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).optional(),
  // Offline sync
  localId: z.string().max(100).optional(),
});

export const updateMeasurementSchema = measurementSchema.partial().extend({
  id: z.string().uuid('Invalid measurement ID'),
  version: z.number().int().positive().optional(),
});

export type MeasurementInput = z.infer<typeof measurementSchema>;
