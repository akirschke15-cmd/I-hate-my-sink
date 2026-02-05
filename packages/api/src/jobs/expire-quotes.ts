import { db } from '@ihms/db';
import { quotes } from '@ihms/db/schema';
import { and, or, eq, lte, isNotNull } from 'drizzle-orm';

/**
 * Expires quotes that have passed their expiration criteria.
 * A quote is considered expired if:
 * 1. It has a validUntil date that has passed, OR
 * 2. It was created more than X days ago (configurable, default 14 days)
 *
 * Only expires quotes in 'sent' or 'viewed' status.
 * Does not expire 'draft', 'accepted', 'rejected', or already 'expired' quotes.
 *
 * @param expirationDays - Number of days after creation before a quote expires (default: 14)
 * @returns The number of quotes that were expired
 */
export async function expireStaleQuotes(expirationDays: number = 14): Promise<number> {
  const now = new Date();
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - expirationDays);

  const result = await db
    .update(quotes)
    .set({
      status: 'expired',
      updatedAt: now,
    })
    .where(
      and(
        // Only expire quotes in 'sent' or 'viewed' status
        or(
          eq(quotes.status, 'sent'),
          eq(quotes.status, 'viewed')
        ),
        // Expire if either:
        // 1. validUntil date has passed, OR
        // 2. createdAt is older than expirationDays
        or(
          and(
            isNotNull(quotes.validUntil),
            lte(quotes.validUntil, now)
          ),
          lte(quotes.createdAt, expirationDate)
        )
      )
    )
    .returning({ id: quotes.id });

  return result.length;
}
