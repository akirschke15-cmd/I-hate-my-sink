import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@ihms/db';
import { quotes, companies, users, customers } from '@ihms/db/schema';
import { expireStaleQuotes } from './expire-quotes';
import { eq } from 'drizzle-orm';

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

  it('should not expire quotes without validUntil', async () => {
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

    const expiredCount = await expireStaleQuotes();
    expect(expiredCount).toBe(0);

    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-003'));
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

    const expiredCount = await expireStaleQuotes();
    expect(expiredCount).toBe(0);

    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, 'Q-004'));
    expect(quote.status).toBe('accepted');
  });

  it('should expire multiple quotes at once', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(quotes).values([
      {
        companyId,
        customerId,
        createdById: userId,
        quoteNumber: 'Q-005',
        status: 'draft',
        validUntil: yesterday,
        subtotal: '1000.00',
        total: '1000.00',
      },
      {
        companyId,
        customerId,
        createdById: userId,
        quoteNumber: 'Q-006',
        status: 'sent',
        validUntil: yesterday,
        subtotal: '2000.00',
        total: '2000.00',
      },
      {
        companyId,
        customerId,
        createdById: userId,
        quoteNumber: 'Q-007',
        status: 'viewed',
        validUntil: yesterday,
        subtotal: '3000.00',
        total: '3000.00',
      },
    ]);

    const expiredCount = await expireStaleQuotes();
    expect(expiredCount).toBe(3);

    // Verify all quotes were expired
    const allQuotes = await db.select().from(quotes);
    expect(allQuotes.every((q) => q.status === 'expired')).toBe(true);
  });
});
