import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { db } from '@ihms/db';
import { customers } from '@ihms/db/schema';
import { eq, ilike, or, desc, and, sql } from 'drizzle-orm';
import { createCustomerSchema, updateCustomerSchema } from '@ihms/shared';
import { isSalesperson } from '../utils/rbac';

export const customerRouter = router({
  // List customers with search and pagination
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(customers.companyId, ctx.user.companyId)];

      // Salespeople can only see their assigned customers
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(customers.assignedUserId, ctx.user.userId));
      }

      if (input.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            ilike(customers.firstName, searchTerm),
            ilike(customers.lastName, searchTerm),
            ilike(customers.email, searchTerm),
            ilike(customers.phone, searchTerm)
          )!
        );
      }

      const whereClause = and(...conditions);

      const results = await db.query.customers.findMany({
        where: whereClause,
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(customers.createdAt)],
      });

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(whereClause);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items: results.map((customer) => ({
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        })),
        total,
        hasMore: input.offset + results.length < total,
      };
    }),

  // Get single customer by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(customers.id, input.id), eq(customers.companyId, ctx.user.companyId)];

      // Salespeople can only access their assigned customers
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(customers.assignedUserId, ctx.user.userId));
      }

      const customer = await db.query.customers.findFirst({
        where: and(...conditions),
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      return {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        assignedUserId: customer.assignedUserId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    }),

  // Create new customer
  create: protectedProcedure.input(createCustomerSchema).mutation(async ({ ctx, input }) => {
    const [customer] = await db
      .insert(customers)
      .values({
        companyId: ctx.user.companyId,
        assignedUserId: ctx.user.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        notes: input.notes,
      })
      .returning();

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt,
    };
  }),

  // Update customer
  update: protectedProcedure.input(updateCustomerSchema).mutation(async ({ ctx, input }) => {
    const { id, version, ...updateData } = input;

    const conditions = [eq(customers.id, id), eq(customers.companyId, ctx.user.companyId)];

    // Salespeople can only update their assigned customers
    if (isSalesperson(ctx.user.role)) {
      conditions.push(eq(customers.assignedUserId, ctx.user.userId));
    }

    // Verify customer exists and belongs to user's company
    const existing = await db.query.customers.findFirst({
      where: and(...conditions),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }

    // Check for version conflict
    if (version !== undefined && version !== existing.version) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This record was modified by another user. Please refresh and try again.',
        cause: {
          serverVersion: existing.version,
          clientVersion: version,
          serverData: existing,
        },
      });
    }

    const [updated] = await db
      .update(customers)
      .set({
        ...updateData,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      notes: updated.notes,
      version: updated.version,
      updatedAt: updated.updatedAt,
    };
  }),

  // Delete customer
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const conditions = [eq(customers.id, input.id), eq(customers.companyId, ctx.user.companyId)];

      // Salespeople can only delete their assigned customers
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(customers.assignedUserId, ctx.user.userId));
      }

      // Verify customer exists and belongs to user's company
      const existing = await db.query.customers.findFirst({
        where: and(...conditions),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      await db.delete(customers).where(eq(customers.id, input.id));

      return { success: true };
    }),
});
