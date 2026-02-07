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

export const existingSinkMaterials = [
  'cast_iron',
  'stainless_steel',
  'composite',
  'unknown',
] as const;

export const cabinetIntegrities = ['good', 'questionable', 'compromised'] as const;

export const supplyValvePositions = ['floor', 'low_back_wall', 'high_back_wall'] as const;

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
  countertopOverhangFrontInches: z.number().min(0).max(12).optional(),
  countertopOverhangSidesInches: z.number().min(0).max(12).optional(),
  // Mounting style
  mountingStyle: z.enum(['drop_in', 'undermount', 'farmhouse', 'flush_mount'] as const).optional(),
  // Faucet configuration
  faucetHoleCount: z.number().int().min(0).max(5).optional(),
  faucetHoleSpacing: z.string().max(50).optional(),
  // Existing sink (if replacing)
  existingSinkWidthInches: z.number().positive().max(60).optional(),
  existingSinkDepthInches: z.number().positive().max(36).optional(),
  existingSinkBowlCount: z.number().int().min(1).max(3).optional(),
  // Clearances
  backsplashHeightInches: z.number().min(0).max(24).optional(),
  windowClearanceInches: z.number().min(0).max(120).optional(),
  plumbingCenterlineFromLeft: z.number().min(0).max(120).optional(),
  // Accessories
  garbageDisposal: z.boolean().optional(),
  dishwasherAirGap: z.boolean().optional(),
  // Colin's measurement hierarchy
  existingSinkMaterial: z.enum(existingSinkMaterials).optional(),
  backsplashOverhangInches: z.number().min(0).max(12).optional(),
  cabinetIntegrity: z.enum(cabinetIntegrities).optional(),
  roSystemPresent: z.boolean().optional(),
  roTankClearanceInches: z.number().min(0).max(24).optional(),
  supplyValvePosition: z.enum(supplyValvePositions).optional(),
  basinDepthClearanceInches: z.number().min(0).max(24).optional(),
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
export type UpdateMeasurementInput = z.infer<typeof updateMeasurementSchema>;
export type CountertopMaterial = (typeof countertopMaterials)[number];
export type ExistingSinkMaterial = (typeof existingSinkMaterials)[number];
export type CabinetIntegrity = (typeof cabinetIntegrities)[number];
export type SupplyValvePosition = (typeof supplyValvePositions)[number];
