import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { db } from '@ihms/db';
import { quotes, quoteLineItems, customers, measurements } from '@ihms/db/schema';
import { eq, desc, sql, and, asc } from 'drizzle-orm';
import { generateQuoteNumber, calculateLineTotal, recalculateQuoteTotals } from './utils';
import { createQuoteSchema, updateQuoteSchema, quoteStatuses } from './schemas';
import { isSalesperson } from '../../utils/rbac';

// State machine: valid quote status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['viewed', 'expired'],
  viewed: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
};

export const quotesCrudRouter = router({
  // Create a new quote with line items
  create: protectedProcedure.input(createQuoteSchema).mutation(async ({ ctx, input }) => {
    // Verify customer exists and belongs to user's company
    // For salespeople: also verify they are assigned to the customer
    const conditions = [eq(customers.id, input.customerId), eq(customers.companyId, ctx.user.companyId)];

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

    // Verify measurement if provided and belongs to user's company
    if (input.measurementId) {
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
    }

    // Generate unique quote number
    let quoteNumber = generateQuoteNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.query.quotes.findFirst({
        where: and(eq(quotes.quoteNumber, quoteNumber), eq(quotes.companyId, ctx.user.companyId)),
      });
      if (!existing) break;
      quoteNumber = generateQuoteNumber();
      attempts++;
    }

    if (attempts >= 10) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate unique quote number. Please try again.',
      });
    }

    // Wrap quote creation in transaction for data integrity
    const quoteId = await db.transaction(async (tx) => {
      // Create quote
      const [quote] = await tx
        .insert(quotes)
        .values({
          companyId: ctx.user.companyId,
          customerId: input.customerId,
          measurementId: input.measurementId,
          createdById: ctx.user.userId,
          quoteNumber,
          status: 'draft',
          taxRate: input.taxRate.toString(),
          discountAmount: input.discountAmount.toString(),
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          notes: input.notes,
          localId: input.localId,
          syncedAt: new Date(),
        })
        .returning();

      // Create line items
      const lineItemsToInsert = input.lineItems.map((item, index) => ({
        quoteId: quote.id,
        sinkId: item.sinkId,
        type: item.type,
        name: item.name,
        description: item.description,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        discountPercent: item.discountPercent.toString(),
        lineTotal: calculateLineTotal(item.quantity, item.unitPrice, item.discountPercent).toString(),
        sortOrder: index,
      }));

      await tx.insert(quoteLineItems).values(lineItemsToInsert);

      // Recalculate totals within transaction
      await recalculateQuoteTotals(quote.id, input.taxRate, input.discountAmount, tx);

      return quote.id;
    });

    // Fetch and return complete quote with relations (after transaction commits)
    return db.query.quotes.findFirst({
      where: eq(quotes.id, quoteId),
      with: {
        lineItems: {
          orderBy: [asc(quoteLineItems.sortOrder)],
        },
        customer: true,
        measurement: true,
      },
    });
  }),

  // List quotes for company
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(quoteStatuses).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(quotes.companyId, ctx.user.companyId)];
      if (input.status) {
        conditions.push(eq(quotes.status, input.status));
      }
      // If user is salesperson, only show quotes they created
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }
      const whereClause = and(...conditions);

      const results = await db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          status: quotes.status,
          subtotal: quotes.subtotal,
          total: quotes.total,
          validUntil: quotes.validUntil,
          createdAt: quotes.createdAt,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
        })
        .from(quotes)
        .innerJoin(customers, eq(quotes.customerId, customers.id))
        .where(whereClause)
        .orderBy(desc(quotes.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(whereClause);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items: results,
        total,
        hasMore: input.offset + results.length < total,
      };
    }),

  // List quotes for specific customer
  listByCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify customer exists and belongs to user's company
      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.customerId), eq(customers.companyId, ctx.user.companyId)),
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const conditions = [eq(quotes.customerId, input.customerId), eq(quotes.companyId, ctx.user.companyId)];
      // If user is salesperson, only show quotes they created
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }

      const results = await db.query.quotes.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(quotes.createdAt)],
      });

      return results;
    }),

  // Get single quote with line items
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Use Drizzle's relational query API with eager loading to fetch all data in a single query
      // This eliminates the N+1 query problem by using JOIN operations under the hood
      const conditions = [eq(quotes.id, input.id), eq(quotes.companyId, ctx.user.companyId)];
      // If user is salesperson, only allow access to quotes they created
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }

      const quote = await db.query.quotes.findFirst({
        where: and(...conditions),
        with: {
          lineItems: {
            orderBy: [asc(quoteLineItems.sortOrder)],
          },
          customer: true,
          measurement: true,
        },
      });

      if (!quote) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      return quote;
    }),

  // Update quote details
  update: protectedProcedure.input(updateQuoteSchema).mutation(async ({ ctx, input }) => {
    const { id, version, ...updateData } = input;

    const conditions = [eq(quotes.id, id), eq(quotes.companyId, ctx.user.companyId)];
    // If user is salesperson, only allow updating quotes they created
    if (isSalesperson(ctx.user.role)) {
      conditions.push(eq(quotes.createdById, ctx.user.userId));
    }

    const existing = await db.query.quotes.findFirst({
      where: and(...conditions),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Quote not found',
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

    const dbUpdateData: Record<string, unknown> = {
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    if (updateData.taxRate !== undefined) {
      dbUpdateData.taxRate = updateData.taxRate.toString();
    }
    if (updateData.discountAmount !== undefined) {
      dbUpdateData.discountAmount = updateData.discountAmount.toString();
    }
    if (updateData.validUntil !== undefined) {
      dbUpdateData.validUntil = updateData.validUntil ? new Date(updateData.validUntil) : null;
    }
    if (updateData.notes !== undefined) {
      dbUpdateData.notes = updateData.notes;
    }

    const [updated] = await db
      .update(quotes)
      .set(dbUpdateData)
      .where(eq(quotes.id, id))
      .returning();

    // Recalculate totals if tax rate or discount changed
    if (updateData.taxRate !== undefined || updateData.discountAmount !== undefined) {
      const taxRate = updateData.taxRate ?? parseFloat(existing.taxRate);
      const discountAmount = updateData.discountAmount ?? parseFloat(existing.discountAmount);
      await recalculateQuoteTotals(id, taxRate, discountAmount);
    }

    return updated;
  }),

  // Update quote status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(quoteStatuses),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conditions = [eq(quotes.id, input.id), eq(quotes.companyId, ctx.user.companyId)];
      // If user is salesperson, only allow updating quotes they created
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }

      const existing = await db.query.quotes.findFirst({
        where: and(...conditions),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      // Check if quote is expired before allowing transition to 'accepted'
      if (input.status === 'accepted' && existing.validUntil) {
        const now = new Date();
        if (new Date(existing.validUntil) < now) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This quote has expired and cannot be accepted',
          });
        }
      }

      // Validate status transition using state machine
      const allowedNextStatuses = VALID_TRANSITIONS[existing.status] || [];
      if (!allowedNextStatuses.includes(input.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot transition quote from '${existing.status}' to '${input.status}'`,
        });
      }

      const [updated] = await db
        .update(quotes)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, input.id))
        .returning();

      return updated;
    }),

  // Delete quote
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const conditions = [eq(quotes.id, input.id), eq(quotes.companyId, ctx.user.companyId)];
      // If user is salesperson, only allow deleting quotes they created
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }

      const existing = await db.query.quotes.findFirst({
        where: and(...conditions),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      // Line items will be cascade deleted
      await db.delete(quotes).where(eq(quotes.id, input.id));

      return { success: true };
    }),

  // Save customer signature and mark as accepted
  saveSignature: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        signatureDataUrl: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conditions = [eq(quotes.id, input.id), eq(quotes.companyId, ctx.user.companyId)];
      // If user is salesperson, only allow signing quotes they created
      if (isSalesperson(ctx.user.role)) {
        conditions.push(eq(quotes.createdById, ctx.user.userId));
      }

      const existing = await db.query.quotes.findFirst({
        where: and(...conditions),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      // Only allow signature on sent or viewed quotes
      if (!['sent', 'viewed'].includes(existing.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Quote must be sent before it can be signed',
        });
      }

      // Check if quote has expired
      if (existing.validUntil && new Date(existing.validUntil) < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This quote has expired and cannot be signed',
        });
      }

      const [updated] = await db
        .update(quotes)
        .set({
          signatureUrl: input.signatureDataUrl,
          signedAt: new Date(),
          status: 'accepted',
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, input.id))
        .returning();

      return updated;
    }),
});
