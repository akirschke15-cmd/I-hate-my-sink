import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { db } from '@ihms/db';
import { customers } from '@ihms/db/schema';
import { eq, ilike, or, desc, and } from 'drizzle-orm';
import { createCustomerSchema, updateCustomerSchema } from '@ihms/shared';

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

      const results = await db.query.customers.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(customers.createdAt)],
      });

      return results.map((customer) => ({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }));
    }),

  // Get single customer by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.id), eq(customers.companyId, ctx.user.companyId)),
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
    const { id, ...updateData } = input;

    // Verify customer exists and belongs to user's company
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.companyId, ctx.user.companyId)),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }

    const [updated] = await db
      .update(customers)
      .set({
        ...updateData,
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
      updatedAt: updated.updatedAt,
    };
  }),

  // Delete customer
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify customer exists and belongs to user's company
      const existing = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.id), eq(customers.companyId, ctx.user.companyId)),
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
