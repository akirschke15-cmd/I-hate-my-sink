import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { customers, measurements, quotes, sinks } from '@ihms/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Verifies a customer exists and belongs to the specified company.
 * Throws NOT_FOUND if customer doesn't exist or belongs to different company.
 */
export async function verifyCustomerAccess(customerId: string, companyId: string) {
  const customer = await db.query.customers.findFirst({
    where: and(
      eq(customers.id, customerId),
      eq(customers.companyId, companyId)
    ),
  });

  if (!customer) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Customer not found',
    });
  }

  return customer;
}

/**
 * Verifies a measurement exists and belongs to the specified company.
 * Throws NOT_FOUND if measurement doesn't exist or belongs to different company.
 */
export async function verifyMeasurementAccess(measurementId: string, companyId: string) {
  const measurement = await db.query.measurements.findFirst({
    where: and(
      eq(measurements.id, measurementId),
      eq(measurements.companyId, companyId)
    ),
  });

  if (!measurement) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Measurement not found',
    });
  }

  return measurement;
}

/**
 * Verifies a quote exists and belongs to the specified company.
 * Throws NOT_FOUND if quote doesn't exist or belongs to different company.
 */
export async function verifyQuoteAccess(quoteId: string, companyId: string) {
  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      eq(quotes.companyId, companyId)
    ),
  });

  if (!quote) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Quote not found',
    });
  }

  return quote;
}

/**
 * Verifies a sink exists and belongs to the specified company.
 * Throws NOT_FOUND if sink doesn't exist or belongs to different company.
 */
export async function verifySinkAccess(sinkId: string, companyId: string) {
  const sink = await db.query.sinks.findFirst({
    where: and(
      eq(sinks.id, sinkId),
      eq(sinks.companyId, companyId)
    ),
  });

  if (!sink) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Sink not found',
    });
  }

  return sink;
}
