import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@ihms/db';
import { quotes, companies, users, customers } from '@ihms/db/schema';
import { expireStaleQuotes } from './expire-quotes';
import { eq, sql } from 'drizzle-orm';

describe('expireStaleQuotes', () => {
  let companyId: string;
  let userId: string;
  let customerId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(quotes);
    await db.delete(customers);
    await db.delete(users);
    await db.delete(companies);

    // Create test company
    const [company] = await db
      .insert(companies)
      .values({
        name: 'Test Company',
        slug: 'test-company-expire',
      })
      .returning();
    companyId = company.id;

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        companyId,
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        role: 'salesperson',
      })
      .returning();
    userId = user.id;

    // Create test customer
    const [customer] = await db
      .insert(customers)
      .values({
        companyId,
        email: 'customer@example.com',
        firstName: 'Test',
        lastName: 'Customer',
      })
      .returning();
    customerId = customer.id;
  });

  it('should expire quotes with validUntil in the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Create a quote that should expire
    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-001',
      status: 'sent',
      validUntil: yesterday,
      subtotal: '1000.00',
      total: '1000.00',
    });

    const expiredCount = await expireStaleQuotes();
    expect(expiredCount).toBe(1);

    // Verify the quote status was updated
    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-001'));
    expect(quote.status).toBe('expired');
  });

  it('should not expire quotes with validUntil in the future', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-002',
      status: 'sent',
      validUntil: tomorrow,
      subtotal: '1000.00',
      total: '1000.00',
    });

    const expiredCount = await expireStaleQuotes();
    expect(expiredCount).toBe(0);

    // Verify the quote status was not updated
    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-002'));
    expect(quote.status).toBe('sent');
  });

  it('should expire quotes older than configured days (createdAt-based)', async () => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // Insert quote with old createdAt date
    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-003',
      status: 'sent',
      validUntil: null,
      subtotal: '1000.00',
      total: '1000.00',
    });

    // Update createdAt to 15 days ago using raw SQL
    await db.execute(
      sql`UPDATE quotes SET created_at = ${fifteenDaysAgo.toISOString()} WHERE quote_number = 'Q-003'`
    );

    const expiredCount = await expireStaleQuotes(14); // 14 day expiration
    expect(expiredCount).toBe(1);

    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-003'));
    expect(quote.status).toBe('expired');
  });

  it('should not expire quotes within configured days', async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-003B',
      status: 'sent',
      validUntil: null,
      subtotal: '1000.00',
      total: '1000.00',
    });

    // Update createdAt to 10 days ago
    await db.execute(
      sql`UPDATE quotes SET created_at = ${tenDaysAgo.toISOString()} WHERE quote_number = 'Q-003B'`
    );

    const expiredCount = await expireStaleQuotes(14); // 14 day expiration
    expect(expiredCount).toBe(0);

    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-003B'));
    expect(quote.status).toBe('sent');
  });

  it('should not expire accepted quotes', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-004',
      status: 'accepted',
      validUntil: yesterday,
      subtotal: '1000.00',
      total: '1000.00',
    });

    const expiredCount = await expireStaleQuotes(14);
    expect(expiredCount).toBe(0);

    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-004'));
    expect(quote.status).toBe('accepted');
  });

  it('should not expire rejected quotes', async () => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-004B',
      status: 'rejected',
      validUntil: null,
      subtotal: '1000.00',
      total: '1000.00',
    });

    // Update createdAt to 15 days ago
    await db.execute(
      sql`UPDATE quotes SET created_at = ${fifteenDaysAgo.toISOString()} WHERE quote_number = 'Q-004B'`
    );

    const expiredCount = await expireStaleQuotes(14);
    expect(expiredCount).toBe(0);

    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-004B'));
    expect(quote.status).toBe('rejected');
  });

  it('should not expire draft quotes based on createdAt', async () => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-004C',
      status: 'draft',
      validUntil: null,
      subtotal: '1000.00',
      total: '1000.00',
    });

    // Update createdAt to 15 days ago
    await db.execute(
      sql`UPDATE quotes SET created_at = ${fifteenDaysAgo.toISOString()} WHERE quote_number = 'Q-004C'`
    );

    const expiredCount = await expireStaleQuotes(14);
    expect(expiredCount).toBe(0);

    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-004C'));
    expect(quote.status).toBe('draft');
  });

  it('should expire multiple quotes at once', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    await db.insert(quotes).values([
      {
        companyId,
        customerId,
        createdById: userId,
        quoteNumber: 'Q-005',
        status: 'sent',
        validUntil: yesterday, // Expires due to validUntil
        subtotal: '1000.00',
        total: '1000.00',
      },
      {
        companyId,
        customerId,
        createdById: userId,
        quoteNumber: 'Q-006',
        status: 'sent',
        validUntil: null, // Will expire due to createdAt
        subtotal: '2000.00',
        total: '2000.00',
      },
      {
        companyId,
        customerId,
        createdById: userId,
        quoteNumber: 'Q-007',
        status: 'viewed',
        validUntil: yesterday, // Expires due to validUntil
        subtotal: '3000.00',
        total: '3000.00',
      },
    ]);

    // Update Q-006 to have old createdAt
    await db.execute(
      sql`UPDATE quotes SET created_at = ${fifteenDaysAgo.toISOString()} WHERE quote_number = 'Q-006'`
    );

    const expiredCount = await expireStaleQuotes(14);
    expect(expiredCount).toBe(3);

    // Verify all quotes were expired
    const allQuotes = await db.select().from(quotes);
    expect(allQuotes.every((q) => q.status === 'expired')).toBe(true);
  });

  it('should respect custom expiration days parameter', async () => {
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    await db.insert(quotes).values({
      companyId,
      customerId,
      createdById: userId,
      quoteNumber: 'Q-008',
      status: 'sent',
      validUntil: null,
      subtotal: '1000.00',
      total: '1000.00',
    });

    // Update createdAt to 20 days ago
    await db.execute(
      sql`UPDATE quotes SET created_at = ${twentyDaysAgo.toISOString()} WHERE quote_number = 'Q-008'`
    );

    // Should not expire with 30 day expiration
    let expiredCount = await expireStaleQuotes(30);
    expect(expiredCount).toBe(0);

    let [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-008'));
    expect(quote.status).toBe('sent');

    // Should expire with 14 day expiration
    expiredCount = await expireStaleQuotes(14);
    expect(expiredCount).toBe(1);

    [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-008'));
    expect(quote.status).toBe('expired');
  });
});
