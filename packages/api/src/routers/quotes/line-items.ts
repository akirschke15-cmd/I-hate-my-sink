import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { db } from '@ihms/db';
import { quotes, quoteLineItems } from '@ihms/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateLineTotal, recalculateQuoteTotals } from './utils';
import { addLineItemSchema, updateLineItemSchema } from './schemas';

export const quotesLineItemsRouter = router({
  // Add line item to quote
  addLineItem: protectedProcedure.input(addLineItemSchema).mutation(async ({ input }) => {
    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, input.quoteId),
    });

    if (!quote) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }

    // Get max sort order
    const maxSortResult = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, input.quoteId));

    const sortOrder = (maxSortResult[0]?.maxSort ?? -1) + 1;

    const [lineItem] = await db
      .insert(quoteLineItems)
      .values({
        quoteId: input.quoteId,
        sinkId: input.sinkId,
        type: input.type,
        name: input.name,
        description: input.description,
        sku: input.sku,
        quantity: input.quantity,
        unitPrice: input.unitPrice.toString(),
        discountPercent: input.discountPercent.toString(),
        lineTotal: calculateLineTotal(input.quantity, input.unitPrice, input.discountPercent).toString(),
        sortOrder,
      })
      .returning();

    // Recalculate quote totals
    await recalculateQuoteTotals(
      input.quoteId,
      parseFloat(quote.taxRate),
      parseFloat(quote.discountAmount)
    );

    return lineItem;
  }),

  // Update line item
  updateLineItem: protectedProcedure.input(updateLineItemSchema).mutation(async ({ input }) => {
    const { id, quoteId, ...updateData } = input;

    // Verify quote exists
    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, quoteId),
    });

    if (!quote) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Quote not found',
      });
    }

    // Get existing line item
    const existing = await db.query.quoteLineItems.findFirst({
      where: and(
        eq(quoteLineItems.id, id),
        eq(quoteLineItems.quoteId, quoteId)
      ),
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Line item not found',
      });
    }

    const dbUpdateData: Record<string, unknown> = {};

    if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
    if (updateData.description !== undefined) dbUpdateData.description = updateData.description;
    if (updateData.quantity !== undefined) dbUpdateData.quantity = updateData.quantity;
    if (updateData.unitPrice !== undefined) dbUpdateData.unitPrice = updateData.unitPrice.toString();
    if (updateData.discountPercent !== undefined) dbUpdateData.discountPercent = updateData.discountPercent.toString();

    // Recalculate line total
    const quantity = updateData.quantity ?? existing.quantity;
    const unitPrice = updateData.unitPrice ?? parseFloat(existing.unitPrice);
    const discountPercent = updateData.discountPercent ?? parseFloat(existing.discountPercent);
    dbUpdateData.lineTotal = calculateLineTotal(quantity, unitPrice, discountPercent).toString();

    const [updated] = await db
      .update(quoteLineItems)
      .set(dbUpdateData)
      .where(eq(quoteLineItems.id, id))
      .returning();

    // Recalculate quote totals
    await recalculateQuoteTotals(
      quoteId,
      parseFloat(quote.taxRate),
      parseFloat(quote.discountAmount)
    );

    return updated;
  }),

  // Delete line item
  deleteLineItem: protectedProcedure
    .input(z.object({ id: z.string().uuid(), quoteId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Verify quote exists
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, input.quoteId),
      });

      if (!quote) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      const existing = await db.query.quoteLineItems.findFirst({
        where: and(
          eq(quoteLineItems.id, input.id),
          eq(quoteLineItems.quoteId, input.quoteId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Line item not found',
        });
      }

      await db.delete(quoteLineItems).where(eq(quoteLineItems.id, input.id));

      // Recalculate quote totals
      await recalculateQuoteTotals(
        input.quoteId,
        parseFloat(quote.taxRate),
        parseFloat(quote.discountAmount)
      );

      return { success: true };
    }),
});
