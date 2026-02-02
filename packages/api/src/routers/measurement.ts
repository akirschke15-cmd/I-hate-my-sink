import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { db } from '@ihms/db';
import { measurements, customers } from '@ihms/db/schema';
import { eq, desc } from 'drizzle-orm';

// Default company ID for single-tenant mode
const DEFAULT_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const countertopMaterials = [
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
] as const;

const mountingStyles = ['drop_in', 'undermount', 'farmhouse', 'flush_mount'] as const;

const createMeasurementSchema = z.object({
  customerId: z.string().uuid(),
  // Cabinet dimensions (required)
  cabinetWidthInches: z.number().positive().max(120),
  cabinetDepthInches: z.number().positive().max(48),
  cabinetHeightInches: z.number().positive().max(48),
  // Countertop details
  countertopMaterial: z.enum(countertopMaterials).optional(),
  countertopThicknessInches: z.number().positive().max(4).optional(),
  countertopOverhangFrontInches: z.number().min(0).max(12).optional(),
  countertopOverhangSidesInches: z.number().min(0).max(12).optional(),
  // Mounting preference
  mountingStyle: z.enum(mountingStyles).optional(),
  // Faucet configuration
  faucetHoleCount: z.number().int().min(0).max(4).optional(),
  faucetHoleSpacing: z.string().max(50).optional(), // e.g., "4 inch center", "8 inch spread"
  // Existing sink (for replacements)
  existingSinkWidthInches: z.number().positive().max(120).optional(),
  existingSinkDepthInches: z.number().positive().max(48).optional(),
  existingSinkBowlCount: z.number().int().min(1).max(3).optional(),
  // Clearances
  backsplashHeightInches: z.number().min(0).max(24).optional(),
  windowClearanceInches: z.number().min(0).max(120).optional(),
  plumbingCenterlineFromLeft: z.number().min(0).max(120).optional(),
  // Accessories
  garbageDisposal: z.boolean().optional(),
  dishwasherAirGap: z.boolean().optional(),
  // Metadata
  location: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).optional(),
  // Offline sync
  localId: z.string().max(100).optional(),
});

const updateMeasurementSchema = createMeasurementSchema.partial().extend({
  id: z.string().uuid(),
});

export const measurementRouter = router({
  // List measurements for a customer
  listByCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      // Verify customer exists
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, input.customerId),
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const results = await db.query.measurements.findMany({
        where: eq(measurements.customerId, input.customerId),
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(measurements.createdAt)],
      });

      return results;
    }),

  // Get single measurement
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const measurement = await db.query.measurements.findFirst({
        where: eq(measurements.id, input.id),
      });

      if (!measurement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Measurement not found',
        });
      }

      return measurement;
    }),

  // Create measurement
  create: protectedProcedure.input(createMeasurementSchema).mutation(async ({ ctx, input }) => {
    // Verify customer exists
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, input.customerId),
    });

    if (!customer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }

    const [measurement] = await db
      .insert(measurements)
      .values({
        companyId: DEFAULT_COMPANY_ID,
        customerId: input.customerId,
        createdById: ctx.user.userId,
        // Cabinet dimensions
        cabinetWidthInches: input.cabinetWidthInches.toString(),
        cabinetDepthInches: input.cabinetDepthInches.toString(),
        cabinetHeightInches: input.cabinetHeightInches.toString(),
        // Countertop details
        countertopMaterial: input.countertopMaterial,
        countertopThicknessInches: input.countertopThicknessInches?.toString(),
        countertopOverhangFrontInches: input.countertopOverhangFrontInches?.toString(),
        countertopOverhangSidesInches: input.countertopOverhangSidesInches?.toString(),
        // Mounting style
        mountingStyle: input.mountingStyle,
        // Faucet configuration
        faucetHoleCount: input.faucetHoleCount,
        faucetHoleSpacing: input.faucetHoleSpacing,
        // Existing sink
        existingSinkWidthInches: input.existingSinkWidthInches?.toString(),
        existingSinkDepthInches: input.existingSinkDepthInches?.toString(),
        existingSinkBowlCount: input.existingSinkBowlCount,
        // Clearances
        backsplashHeightInches: input.backsplashHeightInches?.toString(),
        windowClearanceInches: input.windowClearanceInches?.toString(),
        plumbingCenterlineFromLeft: input.plumbingCenterlineFromLeft?.toString(),
        // Accessories
        garbageDisposal: input.garbageDisposal,
        dishwasherAirGap: input.dishwasherAirGap,
        // Metadata
        location: input.location,
        notes: input.notes,
        photos: input.photos || [],
        localId: input.localId,
        syncedAt: new Date(),
      })
      .returning();

    return measurement;
  }),

  // Update measurement
  update: protectedProcedure.input(updateMeasurementSchema).mutation(async ({ input }) => {
    const { id, ...updateData } = input;

    // Verify measurement exists
    const existing = await db.query.measurements.findFirst({
      where: eq(measurements.id, id),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Measurement not found',
      });
    }

    // Convert numbers to strings for decimal fields
    const dbUpdateData: Record<string, unknown> = {
      updatedAt: new Date(),
      syncedAt: new Date(),
    };

    if (updateData.cabinetWidthInches !== undefined) {
      dbUpdateData.cabinetWidthInches = updateData.cabinetWidthInches.toString();
    }
    if (updateData.cabinetDepthInches !== undefined) {
      dbUpdateData.cabinetDepthInches = updateData.cabinetDepthInches.toString();
    }
    if (updateData.cabinetHeightInches !== undefined) {
      dbUpdateData.cabinetHeightInches = updateData.cabinetHeightInches.toString();
    }
    if (updateData.countertopThicknessInches !== undefined) {
      dbUpdateData.countertopThicknessInches = updateData.countertopThicknessInches.toString();
    }
    if (updateData.countertopOverhangFrontInches !== undefined) {
      dbUpdateData.countertopOverhangFrontInches = updateData.countertopOverhangFrontInches.toString();
    }
    if (updateData.countertopOverhangSidesInches !== undefined) {
      dbUpdateData.countertopOverhangSidesInches = updateData.countertopOverhangSidesInches.toString();
    }
    if (updateData.mountingStyle !== undefined) {
      dbUpdateData.mountingStyle = updateData.mountingStyle;
    }
    if (updateData.faucetHoleCount !== undefined) {
      dbUpdateData.faucetHoleCount = updateData.faucetHoleCount;
    }
    if (updateData.faucetHoleSpacing !== undefined) {
      dbUpdateData.faucetHoleSpacing = updateData.faucetHoleSpacing;
    }
    if (updateData.existingSinkWidthInches !== undefined) {
      dbUpdateData.existingSinkWidthInches = updateData.existingSinkWidthInches.toString();
    }
    if (updateData.existingSinkDepthInches !== undefined) {
      dbUpdateData.existingSinkDepthInches = updateData.existingSinkDepthInches.toString();
    }
    if (updateData.existingSinkBowlCount !== undefined) {
      dbUpdateData.existingSinkBowlCount = updateData.existingSinkBowlCount;
    }
    if (updateData.backsplashHeightInches !== undefined) {
      dbUpdateData.backsplashHeightInches = updateData.backsplashHeightInches.toString();
    }
    if (updateData.windowClearanceInches !== undefined) {
      dbUpdateData.windowClearanceInches = updateData.windowClearanceInches.toString();
    }
    if (updateData.plumbingCenterlineFromLeft !== undefined) {
      dbUpdateData.plumbingCenterlineFromLeft = updateData.plumbingCenterlineFromLeft.toString();
    }
    if (updateData.garbageDisposal !== undefined) {
      dbUpdateData.garbageDisposal = updateData.garbageDisposal;
    }
    if (updateData.dishwasherAirGap !== undefined) {
      dbUpdateData.dishwasherAirGap = updateData.dishwasherAirGap;
    }
    if (updateData.countertopMaterial !== undefined) {
      dbUpdateData.countertopMaterial = updateData.countertopMaterial;
    }
    if (updateData.location !== undefined) {
      dbUpdateData.location = updateData.location;
    }
    if (updateData.notes !== undefined) {
      dbUpdateData.notes = updateData.notes;
    }
    if (updateData.photos !== undefined) {
      dbUpdateData.photos = updateData.photos;
    }

    const [updated] = await db
      .update(measurements)
      .set(dbUpdateData)
      .where(eq(measurements.id, id))
      .returning();

    return updated;
  }),

  // Delete measurement
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.measurements.findFirst({
        where: eq(measurements.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Measurement not found',
        });
      }

      await db.delete(measurements).where(eq(measurements.id, input.id));

      return { success: true };
    }),
});
