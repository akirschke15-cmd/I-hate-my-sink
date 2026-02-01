import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { db } from '@ihms/db';
import { quotes, quoteLineItems, customers, companies } from '@ihms/db/schema';
import { eq, and } from 'drizzle-orm';
import { createWorkizJob, isWorkizConfigured } from '../../services/workiz';
import { isEmailConfigured } from '../../services/email';

// Environment variables (passed from server)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY;
const WORKIZ_ENABLED = process.env.WORKIZ_ENABLED === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const quotesIntegrationsRouter = router({
  // Create Workiz job from accepted quote
  createWorkizJob: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch quote
      const quote = await db.query.quotes.findFirst({
        where: and(eq(quotes.id, input.id), eq(quotes.companyId, ctx.user.companyId)),
      });

      if (!quote) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      if (quote.status !== 'accepted') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Quote must be accepted before creating a Workiz job',
        });
      }

      if (quote.workizJobId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workiz job already exists for this quote',
        });
      }

      // Fetch related data
      const [customer, company, lineItems] = await Promise.all([
        db.query.customers.findFirst({ where: eq(customers.id, quote.customerId) }),
        db.query.companies.findFirst({ where: eq(companies.id, quote.companyId) }),
        db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quote.id)),
      ]);

      if (!customer || !company) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Quote data incomplete',
        });
      }

      const result = await createWorkizJob(
        {
          quote,
          customer,
          company,
          lineItems: lineItems.map((li) => ({
            name: li.name,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            type: li.type,
          })),
        },
        WORKIZ_API_KEY,
        WORKIZ_ENABLED
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to create Workiz job',
        });
      }

      // Update quote with Workiz info
      await db
        .update(quotes)
        .set({
          workizJobId: result.jobId,
          workizJobUrl: result.jobUrl,
          workizSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, input.id));

      return {
        success: true,
        jobId: result.jobId,
        jobUrl: result.jobUrl,
      };
    }),

  // Check integration status
  getIntegrationStatus: protectedProcedure.query(async () => {
    return {
      emailConfigured: isEmailConfigured(RESEND_API_KEY, NODE_ENV === 'development'),
      workizConfigured: isWorkizConfigured(WORKIZ_API_KEY, WORKIZ_ENABLED),
    };
  }),
});
