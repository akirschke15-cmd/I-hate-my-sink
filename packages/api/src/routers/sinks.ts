import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { db } from '@ihms/db';
import { sinks, measurements } from '@ihms/db/schema';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import {
  listSinksSchema,
  createSinkSchema,
  updateSinkSchema,
  matchToMeasurementSchema,
} from '@ihms/shared';

// Matching algorithm types (exported for type inference)
export interface SinkMatch {
  sink: typeof sinks.$inferSelect;
  score: number;
  fitRating: 'excellent' | 'good' | 'marginal';
  reasons: string[];
}

// Sink fitting clearances (inches)
const CLEARANCES = {
  MIN_CABINET_CLEARANCE: 2, // Minimum clearance from sink edge to cabinet edge
  OPTIMAL_CABINET_CLEARANCE: 3, // Optimal clearance for easy installation
  UNDERMOUNT_EXTRA_CLEARANCE: 0.5, // Extra clearance needed for undermount clips
};

function calculateMatchScore(
  sink: typeof sinks.$inferSelect,
  measurement: typeof measurements.$inferSelect
): SinkMatch {
  let score = 0;
  const reasons: string[] = [];

  const sinkWidth = parseFloat(sink.widthInches);
  const sinkDepth = parseFloat(sink.depthInches);
  const cabinetWidth = parseFloat(measurement.cabinetWidthInches);
  const cabinetDepth = parseFloat(measurement.cabinetDepthInches);

  // Calculate available space (account for countertop overhangs if present)
  const frontOverhang = measurement.countertopOverhangFrontInches
    ? parseFloat(measurement.countertopOverhangFrontInches)
    : 0;
  const sideOverhang = measurement.countertopOverhangSidesInches
    ? parseFloat(measurement.countertopOverhangSidesInches)
    : 0;

  const availableWidth = cabinetWidth - 2 * sideOverhang;
  const availableDepth = cabinetDepth - frontOverhang;

  // Width fit scoring (max 30 points)
  const widthClearance = availableWidth - sinkWidth;
  if (widthClearance >= CLEARANCES.OPTIMAL_CABINET_CLEARANCE * 2) {
    score += 30;
    reasons.push('Excellent width fit with optimal clearance');
  } else if (widthClearance >= CLEARANCES.MIN_CABINET_CLEARANCE * 2) {
    score += 20;
    reasons.push('Good width fit with adequate clearance');
  } else if (widthClearance >= 0) {
    score += 10;
    reasons.push('Tight width fit - may require careful installation');
  } else {
    score -= 50; // Sink too wide - disqualifying
    reasons.push('WARNING: Sink too wide for cabinet');
  }

  // Depth fit scoring (max 30 points)
  const depthClearance = availableDepth - sinkDepth;
  if (depthClearance >= CLEARANCES.OPTIMAL_CABINET_CLEARANCE) {
    score += 30;
    reasons.push('Excellent depth fit with optimal clearance');
  } else if (depthClearance >= CLEARANCES.MIN_CABINET_CLEARANCE) {
    score += 20;
    reasons.push('Good depth fit with adequate clearance');
  } else if (depthClearance >= 0) {
    score += 10;
    reasons.push('Tight depth fit - may require careful installation');
  } else {
    score -= 50; // Sink too deep - disqualifying
    reasons.push('WARNING: Sink too deep for cabinet');
  }

  // Mounting style match (max 25 points)
  if (measurement.mountingStyle) {
    // Map measurement mounting style enum to sink mounting style enum
    const measurementStyleMap: Record<string, string> = {
      drop_in: 'drop_in',
      undermount: 'undermount',
      farmhouse: 'farmhouse',
      flush_mount: 'flush_mount',
    };
    const normalizedMeasurementStyle = measurementStyleMap[measurement.mountingStyle];

    if (sink.mountingStyle === normalizedMeasurementStyle) {
      score += 25;
      reasons.push(`Matches preferred mounting style: ${sink.mountingStyle.replace('_', '-')}`);
    } else {
      // Partial points for compatible styles
      if (
        (normalizedMeasurementStyle === 'drop_in' && sink.mountingStyle === 'flush_mount') ||
        (normalizedMeasurementStyle === 'flush_mount' && sink.mountingStyle === 'drop_in')
      ) {
        score += 15;
        reasons.push('Compatible mounting style (may require adjustment)');
      } else {
        score += 5;
        reasons.push(`Different mounting style: ${sink.mountingStyle.replace('_', '-')}`);
      }
    }

    // Extra clearance check for undermount
    if (sink.mountingStyle === 'undermount') {
      if (widthClearance < CLEARANCES.MIN_CABINET_CLEARANCE * 2 + CLEARANCES.UNDERMOUNT_EXTRA_CLEARANCE * 2) {
        score -= 5;
        reasons.push('Undermount may need extra width clearance for clips');
      }
    }
  } else {
    score += 15; // No preference - give partial points
    reasons.push('No mounting style preference specified');
  }

  // Bowl count consideration (max 15 points)
  if (measurement.existingSinkBowlCount) {
    if (sink.bowlCount === measurement.existingSinkBowlCount) {
      score += 15;
      reasons.push(`Matches existing bowl count: ${sink.bowlCount}`);
    } else if (Math.abs(sink.bowlCount - measurement.existingSinkBowlCount) === 1) {
      score += 8;
      reasons.push(`Bowl count differs by 1 (sink: ${sink.bowlCount}, existing: ${measurement.existingSinkBowlCount})`);
    } else {
      score += 3;
      reasons.push(`Different bowl count: ${sink.bowlCount}`);
    }
  } else {
    score += 10; // No existing sink reference
  }

  // Determine fit rating
  let fitRating: 'excellent' | 'good' | 'marginal';
  if (score >= 80) {
    fitRating = 'excellent';
  } else if (score >= 50) {
    fitRating = 'good';
  } else {
    fitRating = 'marginal';
  }

  return {
    sink,
    score,
    fitRating,
    reasons,
  };
}

export const sinkRouter = router({
  // List sinks with filtering
  list: protectedProcedure.input(listSinksSchema).query(async ({ ctx, input }) => {
    const conditions: ReturnType<typeof eq>[] = [eq(sinks.companyId, ctx.user.companyId)];

    if (input.material) {
      conditions.push(eq(sinks.material, input.material));
    }
    if (input.mountingStyle) {
      conditions.push(eq(sinks.mountingStyle, input.mountingStyle));
    }
    if (input.minWidthInches !== undefined) {
      conditions.push(gte(sinks.widthInches, input.minWidthInches.toString()));
    }
    if (input.maxWidthInches !== undefined) {
      conditions.push(lte(sinks.widthInches, input.maxWidthInches.toString()));
    }
    if (input.minDepthInches !== undefined) {
      conditions.push(gte(sinks.depthInches, input.minDepthInches.toString()));
    }
    if (input.maxDepthInches !== undefined) {
      conditions.push(lte(sinks.depthInches, input.maxDepthInches.toString()));
    }
    if (input.bowlCount !== undefined) {
      conditions.push(eq(sinks.bowlCount, input.bowlCount));
    }
    if (input.isActive !== undefined) {
      conditions.push(eq(sinks.isActive, input.isActive));
    }

    // Determine sort column
    const sortColumn = {
      name: sinks.name,
      price: sinks.basePrice,
      width: sinks.widthInches,
      createdAt: sinks.createdAt,
    }[input.sortBy];

    const orderFn = input.sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(sinks)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(input.limit)
      .offset(input.offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sinks)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    return {
      items: results,
      total,
      hasMore: input.offset + results.length < total,
    };
  }),

  // Get single sink by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sink = await db.query.sinks.findFirst({
        where: and(eq(sinks.id, input.id), eq(sinks.companyId, ctx.user.companyId)),
      });

      if (!sink) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sink not found',
        });
      }

      return sink;
    }),

  // Match sinks to a measurement
  matchToMeasurement: protectedProcedure
    .input(matchToMeasurementSchema)
    .query(async ({ ctx, input }) => {
      // Get the measurement and verify it belongs to user's company
      const measurement = await db.query.measurements.findFirst({
        where: and(
          eq(measurements.id, input.measurementId),
          eq(measurements.companyId, ctx.user.companyId)
        ),
      });

      if (!measurement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Measurement not found',
        });
      }

      const cabinetWidth = parseFloat(measurement.cabinetWidthInches);
      const cabinetDepth = parseFloat(measurement.cabinetDepthInches);

      // Query sinks that could potentially fit (with generous margins for scoring)
      const maxSinkWidth = cabinetWidth; // Will be scored down if too tight
      const maxSinkDepth = cabinetDepth;

      const candidateSinks = await db
        .select()
        .from(sinks)
        .where(
          and(
            eq(sinks.companyId, ctx.user.companyId),
            eq(sinks.isActive, true),
            lte(sinks.widthInches, maxSinkWidth.toString()),
            lte(sinks.depthInches, maxSinkDepth.toString())
          )
        );

      // Score and rank all candidates
      const matches: SinkMatch[] = candidateSinks
        .map((sink) => calculateMatchScore(sink, measurement))
        .filter((match) => match.score > 0) // Filter out disqualified sinks
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, input.limit);

      return {
        measurement: {
          id: measurement.id,
          cabinetWidthInches: measurement.cabinetWidthInches,
          cabinetDepthInches: measurement.cabinetDepthInches,
          cabinetHeightInches: measurement.cabinetHeightInches,
          mountingStyle: measurement.mountingStyle,
          countertopMaterial: measurement.countertopMaterial,
          location: measurement.location,
        },
        matches,
        totalCandidates: candidateSinks.length,
      };
    }),

  // Create a new sink (admin only)
  create: adminProcedure.input(createSinkSchema).mutation(async ({ ctx, input }) => {
    // Check for duplicate SKU within the company
    const existingSku = await db.query.sinks.findFirst({
      where: and(eq(sinks.sku, input.sku), eq(sinks.companyId, ctx.user.companyId)),
    });

    if (existingSku) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A sink with this SKU already exists',
      });
    }

    const [sink] = await db
      .insert(sinks)
      .values({
        companyId: ctx.user.companyId,
        sku: input.sku,
        name: input.name,
        description: input.description,
        material: input.material,
        mountingStyle: input.mountingStyle,
        widthInches: input.widthInches.toString(),
        depthInches: input.depthInches.toString(),
        heightInches: input.heightInches.toString(),
        bowlCount: input.bowlCount,
        basePrice: input.basePrice.toString(),
        laborCost: input.laborCost.toString(),
        imageUrl: input.imageUrl,
        isActive: input.isActive,
      })
      .returning();

    return sink;
  }),

  // Update a sink (admin only)
  update: adminProcedure.input(updateSinkSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Verify sink exists and belongs to user's company
    const existing = await db.query.sinks.findFirst({
      where: and(eq(sinks.id, id), eq(sinks.companyId, ctx.user.companyId)),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sink not found',
      });
    }

    // Check for duplicate SKU if SKU is being updated
    if (updateData.sku && updateData.sku !== existing.sku) {
      const existingSku = await db.query.sinks.findFirst({
        where: and(eq(sinks.sku, updateData.sku), eq(sinks.companyId, ctx.user.companyId)),
      });

      if (existingSku) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A sink with this SKU already exists',
        });
      }
    }

    // Build update object
    const dbUpdateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updateData.sku !== undefined) dbUpdateData.sku = updateData.sku;
    if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
    if (updateData.description !== undefined) dbUpdateData.description = updateData.description;
    if (updateData.material !== undefined) dbUpdateData.material = updateData.material;
    if (updateData.mountingStyle !== undefined) dbUpdateData.mountingStyle = updateData.mountingStyle;
    if (updateData.widthInches !== undefined) dbUpdateData.widthInches = updateData.widthInches.toString();
    if (updateData.depthInches !== undefined) dbUpdateData.depthInches = updateData.depthInches.toString();
    if (updateData.heightInches !== undefined) dbUpdateData.heightInches = updateData.heightInches.toString();
    if (updateData.bowlCount !== undefined) dbUpdateData.bowlCount = updateData.bowlCount;
    if (updateData.basePrice !== undefined) dbUpdateData.basePrice = updateData.basePrice.toString();
    if (updateData.laborCost !== undefined) dbUpdateData.laborCost = updateData.laborCost.toString();
    if (updateData.imageUrl !== undefined) dbUpdateData.imageUrl = updateData.imageUrl;
    if (updateData.isActive !== undefined) dbUpdateData.isActive = updateData.isActive;

    const [updated] = await db.update(sinks).set(dbUpdateData).where(eq(sinks.id, id)).returning();

    return updated;
  }),

  // Delete a sink (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.sinks.findFirst({
        where: and(eq(sinks.id, input.id), eq(sinks.companyId, ctx.user.companyId)),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sink not found',
        });
      }

      await db.delete(sinks).where(eq(sinks.id, input.id));

      return { success: true };
    }),

  // Toggle sink active status (admin only)
  toggleActive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.sinks.findFirst({
        where: and(eq(sinks.id, input.id), eq(sinks.companyId, ctx.user.companyId)),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sink not found',
        });
      }

      const [updated] = await db
        .update(sinks)
        .set({
          isActive: !existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(sinks.id, input.id))
        .returning();

      return updated;
    }),
});
