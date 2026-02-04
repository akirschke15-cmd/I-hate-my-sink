import { db } from '@ihms/db';
import { quotes } from '@ihms/db/schema';
import { and, or, eq, lte, isNotNull } from 'drizzle-orm';

/**
 * Expires quotes that have passed their validUntil date.
 * Only expires quotes in 'draft', 'sent', or 'viewed' status.
 *
 * @returns The number of quotes that were expired
 */
export async function expireStaleQuotes(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(quotes)
    .set({
      status: 'expired',
      updatedAt: now,
    })
    .where(
      and(
        or(
          eq(quotes.status, 'draft'),
          eq(quotes.status, 'sent'),
          eq(quotes.status, 'viewed')
        ),
        isNotNull(quotes.validUntil),
        lte(quotes.validUntil, now)
      )
    )
    .returning({ id: quotes.id });

  return result.length;
}
