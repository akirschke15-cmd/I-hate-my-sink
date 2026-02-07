import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { db } from '@ihms/db';
import { sinks, measurements } from '@ihms/db/schema';
import { eq, and, gte, lte, desc, asc, sql, ilike, or } from 'drizzle-orm';
import {
  listSinksSchema,
  createSinkSchema,
  updateSinkSchema,
  matchToMeasurementSchema,
} from '@ihms/shared';
import { matchSinksToMeasurement } from '../services/sink-matching';

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
    if (input.series) {
      conditions.push(eq(sinks.series, input.series));
    }
    if (input.bowlConfiguration) {
      conditions.push(eq(sinks.bowlConfiguration, input.bowlConfiguration));
    }
    if (input.installationType) {
      conditions.push(eq(sinks.installationType, input.installationType));
    }
    if (input.isWorkstation !== undefined) {
      conditions.push(eq(sinks.isWorkstation, input.isWorkstation));
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
    if (input.maxMinCabinetWidth !== undefined) {
      // Filter sinks where min cabinet width <= provided value
      // Check both IHMS and manufacturer min cabinet width
      conditions.push(
        or(
          lte(sinks.ihmsMinCabinetWidthInches, input.maxMinCabinetWidth.toString()),
          lte(sinks.mfgMinCabinetWidthInches, input.maxMinCabinetWidth.toString())
        )!
      );
    }
    if (input.bowlCount !== undefined) {
      conditions.push(eq(sinks.bowlCount, input.bowlCount));
    }
    if (input.isActive !== undefined) {
      conditions.push(eq(sinks.isActive, input.isActive));
    }

    // Search filter (name or model number)
    if (input.search) {
      const searchTerm = `%${input.search}%`;
      conditions.push(
        or(
          ilike(sinks.name, searchTerm),
          ilike(sinks.modelNumber, searchTerm)
        )!
      );
    }

    // Determine sort column
    const sortColumnMap = {
      name: sinks.name,
      price: sinks.basePrice,
      width: sinks.widthInches,
      series: sinks.series,
      createdAt: sinks.createdAt,
    } as const;
    const sortColumn = sortColumnMap[input.sortBy] ?? sinks.name;

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

  // Get available series options
  getSeriesOptions: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .selectDistinct({ series: sinks.series })
      .from(sinks)
      .where(and(eq(sinks.companyId, ctx.user.companyId), eq(sinks.isActive, true)));
    return result.map((r) => r.series).filter(Boolean);
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

      // Use the new matching algorithm
      const allMatches = matchSinksToMeasurement(
        candidateSinks,
        measurement,
        input.preferences,
        input.limit + 5 // Get extra to split into feasible/no-go
      );

      // Separate feasible from no-go matches
      const feasibleMatches = allMatches.filter((m) => m.fitRating !== 'no_go');
      const noGoMatches = allMatches.filter((m) => m.fitRating === 'no_go').slice(0, 5);

      // Convert to old interface for backward compatibility (add score field as alias)
      const matches = feasibleMatches.slice(0, input.limit).map((match) => ({
        ...match,
        score: match.overallScore, // backward compat
      }));

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
        noGoMatches: noGoMatches.map((match) => ({
          ...match,
          score: match.overallScore, // backward compat
        })),
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
        // Karran catalogue fields
        series: input.series,
        manufacturer: input.manufacturer,
        modelNumber: input.modelNumber,
        installationType: input.installationType,
        bowlConfiguration: input.bowlConfiguration,
        mfgMinCabinetWidthInches: input.mfgMinCabinetWidthInches?.toString(),
        ihmsMinCabinetWidthInches: input.ihmsMinCabinetWidthInches?.toString(),
        faucetHoles: input.faucetHoles,
        drainSize: input.drainSize,
        drainLocation: input.drainLocation,
        cornerRadius: input.cornerRadius,
        apronDepthInches: input.apronDepthInches?.toString(),
        steelGauge: input.steelGauge,
        heatSafeTempF: input.heatSafeTempF,
        templateIncluded: input.templateIncluded,
        clipsIncluded: input.clipsIncluded,
        isWorkstation: input.isWorkstation,
        accessoriesIncluded: input.accessoriesIncluded,
        bowlDimensions: input.bowlDimensions,
        availableColors: input.availableColors,
        countertopCompatibility: input.countertopCompatibility,
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
    if (updateData.mountingStyle !== undefined)
      dbUpdateData.mountingStyle = updateData.mountingStyle;
    if (updateData.widthInches !== undefined)
      dbUpdateData.widthInches = updateData.widthInches.toString();
    if (updateData.depthInches !== undefined)
      dbUpdateData.depthInches = updateData.depthInches.toString();
    if (updateData.heightInches !== undefined)
      dbUpdateData.heightInches = updateData.heightInches.toString();
    if (updateData.bowlCount !== undefined) dbUpdateData.bowlCount = updateData.bowlCount;
    if (updateData.basePrice !== undefined)
      dbUpdateData.basePrice = updateData.basePrice.toString();
    if (updateData.laborCost !== undefined)
      dbUpdateData.laborCost = updateData.laborCost.toString();
    if (updateData.imageUrl !== undefined) dbUpdateData.imageUrl = updateData.imageUrl;
    if (updateData.isActive !== undefined) dbUpdateData.isActive = updateData.isActive;

    // Karran catalogue fields
    if (updateData.series !== undefined) dbUpdateData.series = updateData.series;
    if (updateData.manufacturer !== undefined)
      dbUpdateData.manufacturer = updateData.manufacturer;
    if (updateData.modelNumber !== undefined) dbUpdateData.modelNumber = updateData.modelNumber;
    if (updateData.installationType !== undefined)
      dbUpdateData.installationType = updateData.installationType;
    if (updateData.bowlConfiguration !== undefined)
      dbUpdateData.bowlConfiguration = updateData.bowlConfiguration;
    if (updateData.mfgMinCabinetWidthInches !== undefined)
      dbUpdateData.mfgMinCabinetWidthInches = updateData.mfgMinCabinetWidthInches.toString();
    if (updateData.ihmsMinCabinetWidthInches !== undefined)
      dbUpdateData.ihmsMinCabinetWidthInches = updateData.ihmsMinCabinetWidthInches.toString();
    if (updateData.faucetHoles !== undefined) dbUpdateData.faucetHoles = updateData.faucetHoles;
    if (updateData.drainSize !== undefined) dbUpdateData.drainSize = updateData.drainSize;
    if (updateData.drainLocation !== undefined)
      dbUpdateData.drainLocation = updateData.drainLocation;
    if (updateData.cornerRadius !== undefined)
      dbUpdateData.cornerRadius = updateData.cornerRadius;
    if (updateData.apronDepthInches !== undefined)
      dbUpdateData.apronDepthInches = updateData.apronDepthInches.toString();
    if (updateData.steelGauge !== undefined) dbUpdateData.steelGauge = updateData.steelGauge;
    if (updateData.heatSafeTempF !== undefined)
      dbUpdateData.heatSafeTempF = updateData.heatSafeTempF;
    if (updateData.templateIncluded !== undefined)
      dbUpdateData.templateIncluded = updateData.templateIncluded;
    if (updateData.clipsIncluded !== undefined)
      dbUpdateData.clipsIncluded = updateData.clipsIncluded;
    if (updateData.isWorkstation !== undefined)
      dbUpdateData.isWorkstation = updateData.isWorkstation;
    if (updateData.accessoriesIncluded !== undefined)
      dbUpdateData.accessoriesIncluded = updateData.accessoriesIncluded;
    if (updateData.bowlDimensions !== undefined)
      dbUpdateData.bowlDimensions = updateData.bowlDimensions;
    if (updateData.availableColors !== undefined)
      dbUpdateData.availableColors = updateData.availableColors;
    if (updateData.countertopCompatibility !== undefined)
      dbUpdateData.countertopCompatibility = updateData.countertopCompatibility;

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
