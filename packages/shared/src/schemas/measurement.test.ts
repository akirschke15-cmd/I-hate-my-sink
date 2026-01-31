import { describe, it, expect } from 'vitest';
import { measurementSchema } from './measurement';

describe('measurementSchema', () => {
  const validMeasurement = {
    customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    cabinetWidthInches: 36,
    cabinetDepthInches: 24,
    cabinetHeightInches: 34,
  };

  it('accepts valid basic measurements', () => {
    const result = measurementSchema.safeParse(validMeasurement);
    expect(result.success).toBe(true);
  });

  it('accepts measurements with optional fields', () => {
    const result = measurementSchema.safeParse({
      ...validMeasurement,
      countertopMaterial: 'granite',
      countertopThicknessInches: 1.5,
      location: 'Kitchen',
      notes: 'Corner installation',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative width', () => {
    const result = measurementSchema.safeParse({
      ...validMeasurement,
      cabinetWidthInches: -10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects width exceeding maximum', () => {
    const result = measurementSchema.safeParse({
      ...validMeasurement,
      cabinetWidthInches: 150,
    });
    expect(result.success).toBe(false);
  });

  it('rejects depth exceeding maximum', () => {
    const result = measurementSchema.safeParse({
      ...validMeasurement,
      cabinetDepthInches: 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid countertop material', () => {
    const result = measurementSchema.safeParse({
      ...validMeasurement,
      countertopMaterial: 'invalid_material',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid countertop materials', () => {
    const materials = [
      'granite',
      'quartz',
      'marble',
      'laminate',
      'solid_surface',
      'butcher_block',
      'concrete',
      'tile',
      'stainless_steel',
    ];

    materials.forEach((material) => {
      const result = measurementSchema.safeParse({
        ...validMeasurement,
        countertopMaterial: material,
      });
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid customerId format', () => {
    const result = measurementSchema.safeParse({
      ...validMeasurement,
      customerId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
