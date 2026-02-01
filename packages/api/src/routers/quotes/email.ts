import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { db } from '@ihms/db';
import { quotes, quoteLineItems, customers, companies, emailLogs } from '@ihms/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { sendEmail, isEmailConfigured } from '../../services/email';
import { generateQuoteEmailSubject, generateQuoteEmailHtml } from '../../services/email-templates';
import { generateQuotePdfBuffer } from '../../services/quote-pdf';

// Environment variables (passed from server)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'IHMS Quotes';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'quotes@ihms.app';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const quotesEmailRouter = router({
  // Send quote via email
  emailQuote: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify email is configured
      if (!isEmailConfigured(RESEND_API_KEY, NODE_ENV === 'development')) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Email service is not configured',
        });
      }

      // Fetch quote with ownership check
      const quote = await db.query.quotes.findFirst({
        where: and(eq(quotes.id, input.id), eq(quotes.companyId, ctx.user.companyId)),
      });

      if (!quote) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      // Fetch related data
      const [customer, company, lineItems] = await Promise.all([
        db.query.customers.findFirst({
          where: eq(customers.id, quote.customerId),
        }),
        db.query.companies.findFirst({
          where: eq(companies.id, quote.companyId),
        }),
        db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quote.id)).orderBy(quoteLineItems.sortOrder),
      ]);

      if (!customer || !company) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Quote data incomplete',
        });
      }

      if (!customer.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer does not have an email address',
        });
      }

      // Generate PDF
      const pdfBuffer = await generateQuotePdfBuffer(quote, customer, company, lineItems);

      // Prepare email content
      const emailData = { quote, customer, company };
      const subject = generateQuoteEmailSubject(emailData);
      const html = generateQuoteEmailHtml(emailData);

      // Create email log entry
      const [emailLog] = await db
        .insert(emailLogs)
        .values({
          quoteId: quote.id,
          sentById: ctx.user.userId,
          recipientEmail: customer.email,
          recipientName: `${customer.firstName} ${customer.lastName}`,
          subject,
          status: 'pending',
        })
        .returning();

      // Send email
      const result = await sendEmail(
        {
          to: customer.email,
          toName: `${customer.firstName} ${customer.lastName}`,
          subject,
          html,
          fromName: EMAIL_FROM_NAME,
          fromAddress: EMAIL_FROM_ADDRESS,
          attachments: [
            {
              filename: `Quote-${quote.quoteNumber}.pdf`,
              content: pdfBuffer,
            },
          ],
        },
        RESEND_API_KEY,
        NODE_ENV === 'development'
      );

      // Update email log with result
      await db
        .update(emailLogs)
        .set({
          status: result.success ? 'sent' : 'failed',
          resendMessageId: result.messageId,
          errorMessage: result.error,
          sentAt: result.success ? new Date() : null,
        })
        .where(eq(emailLogs.id, emailLog.id));

      // Update quote if successful
      if (result.success) {
        await db
          .update(quotes)
          .set({
            status: quote.status === 'draft' ? 'sent' : quote.status,
            emailedAt: new Date(),
            emailCount: sql`${quotes.emailCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, quote.id));
      } else {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to send email',
        });
      }

      return { success: true, emailLogId: emailLog.id };
    }),

  // Get email history for a quote
  getEmailHistory: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify quote belongs to company
      const quote = await db.query.quotes.findFirst({
        where: and(eq(quotes.id, input.quoteId), eq(quotes.companyId, ctx.user.companyId)),
      });

      if (!quote) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      return db.query.emailLogs.findMany({
        where: eq(emailLogs.quoteId, input.quoteId),
        orderBy: [desc(emailLogs.createdAt)],
      });
    }),
});
