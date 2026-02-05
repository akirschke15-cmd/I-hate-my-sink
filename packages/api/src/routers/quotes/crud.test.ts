import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { companies, users, customers, sinks, quotes } from '@ihms/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  createTestCaller,
  createUnauthenticatedContext,
  createAuthenticatedContext,
} from '../../test-utils';

describe('Quote CRUD Router - Integration Tests', () => {
  let testCompanyId: string;
  let testAdminUserId: string;
  let testSalespersonUserId: string;
  let otherSalespersonUserId: string;
  let testCustomerId: string;
  let testSinkId: string;
  let adminContext: ReturnType<typeof createAuthenticatedContext>;
  let salespersonContext: ReturnType<typeof createAuthenticatedContext>;
  let otherSalespersonContext: ReturnType<typeof createAuthenticatedContext>;

  beforeAll(async () => {
    // Create test company
    let company = await db.query.companies.findFirst({
      where: eq(companies.slug, 'quote-test-company'),
    });

    if (!company) {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: 'Quote Test Company',
          slug: 'quote-test-company',
        })
        .returning();
      company = newCompany;
    }

    testCompanyId = company.id;

    // Create admin user
    let adminUser = await db.query.users.findFirst({
      where: eq(users.email, 'quote-admin@example.com'),
    });

    if (!adminUser) {
      const passwordHash = await bcrypt.hash('TestPass123', 12);
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'quote-admin@example.com',
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          companyId: testCompanyId,
          role: 'admin',
        })
        .returning();
      adminUser = newUser;
    }

    testAdminUserId = adminUser.id;

    // Create first salesperson
    let salesperson = await db.query.users.findFirst({
      where: eq(users.email, 'quote-salesperson@example.com'),
    });

    if (!salesperson) {
      const passwordHash = await bcrypt.hash('TestPass123', 12);
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'quote-salesperson@example.com',
          passwordHash,
          firstName: 'Sales',
          lastName: 'Person',
          companyId: testCompanyId,
          role: 'salesperson',
        })
        .returning();
      salesperson = newUser;
    }

    testSalespersonUserId = salesperson.id;

    // Create second salesperson for RBAC tests
    let otherSalesperson = await db.query.users.findFirst({
      where: eq(users.email, 'quote-other-salesperson@example.com'),
    });

    if (!otherSalesperson) {
      const passwordHash = await bcrypt.hash('TestPass123', 12);
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'quote-other-salesperson@example.com',
          passwordHash,
          firstName: 'Other',
          lastName: 'Sales',
          companyId: testCompanyId,
          role: 'salesperson',
        })
        .returning();
      otherSalesperson = newUser;
    }

    otherSalespersonUserId = otherSalesperson.id;

    // Create test customer assigned to first salesperson
    const [customer] = await db
      .insert(customers)
      .values({
        companyId: testCompanyId,
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test-customer@example.com',
        assignedUserId: testSalespersonUserId,
      })
      .returning();

    testCustomerId = customer.id;

    // Create test sink for quote line items
    const [sink] = await db
      .insert(sinks)
      .values({
        companyId: testCompanyId,
        sku: 'TEST-SINK-001',
        name: 'Test Sink',
        description: 'Test sink for quotes',
        material: 'stainless_steel',
        mountingStyle: 'undermount',
        widthInches: '32.00',
        depthInches: '18.00',
        heightInches: '10.00',
        basePrice: '450.00',
        laborCost: '150.00',
      })
      .returning();

    testSinkId = sink.id;

    // Create contexts
    adminContext = createAuthenticatedContext({
      companyId: testCompanyId,
      userId: testAdminUserId,
      role: 'admin',
    });

    salespersonContext = createAuthenticatedContext({
      companyId: testCompanyId,
      userId: testSalespersonUserId,
      role: 'salesperson',
    });

    otherSalespersonContext = createAuthenticatedContext({
      companyId: testCompanyId,
      userId: otherSalespersonUserId,
      role: 'salesperson',
    });
  });

  beforeEach(async () => {
    // Clean up quotes between tests
    await db.delete(quotes).where(eq(quotes.companyId, testCompanyId));
  });

  describe('1. Quote Creation Tests', () => {
    it('should create a quote with line items', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            sinkId: testSinkId,
            type: 'product',
            name: 'Test Sink',
            quantity: 2,
            unitPrice: 450,
            discountPercent: 0,
          },
          {
            type: 'labor',
            name: 'Installation Labor',
            quantity: 2,
            unitPrice: 150,
            discountPercent: 0,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
      expect(result?.quoteNumber).toBeDefined();
      expect(result?.status).toBe('draft');
      expect(result?.customerId).toBe(testCustomerId);
      expect(result?.lineItems).toHaveLength(2);
      expect(result?.lineItems?.[0].name).toBe('Test Sink');
      expect(result?.lineItems?.[1].name).toBe('Installation Labor');
    });

    it('should create a quote with measurement reference', async () => {
      const caller = createTestCaller(salespersonContext);

      // First create a measurement
      const measurement = await caller.measurement.create({
        customerId: testCustomerId,
        cabinetWidthInches: 36,
        cabinetDepthInches: 24,
        cabinetHeightInches: 36,
      });

      const result = await caller.quote.create({
        customerId: testCustomerId,
        measurementId: measurement.id,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      expect(result?.measurementId).toBe(measurement.id);
      expect(result?.measurement).toBeDefined();
    });

    it('should ensure quote number uniqueness', async () => {
      const caller = createTestCaller(salespersonContext);

      // Create multiple quotes
      const quote1 = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Sink 1',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      const quote2 = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Sink 2',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      expect(quote1?.quoteNumber).not.toBe(quote2?.quoteNumber);
    });

    it('should enforce transaction atomicity - if line item fails, quote should not exist', async () => {
      const caller = createTestCaller(salespersonContext);

      // This should fail because we're passing an invalid line item structure
      await expect(
        caller.quote.create({
          customerId: testCustomerId,
          taxRate: 0.0825,
          discountAmount: 0,
          lineItems: [
            {
              type: 'product',
              name: 'Valid Item',
              quantity: 1,
              unitPrice: 450,
              discountPercent: 0,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {
              type: 'product',
              // Missing required 'name' field to test transaction rollback
              quantity: 1,
              unitPrice: 450,
            } as any,
          ],
        })
      ).rejects.toThrow();

      // Verify no quote was created
      const allQuotes = await db
        .select()
        .from(quotes)
        .where(eq(quotes.companyId, testCompanyId));

      expect(allQuotes).toHaveLength(0);
    });

    it('should enforce RBAC - salesperson can only quote their assigned customers', async () => {
      // Create a customer assigned to another salesperson
      const [otherCustomer] = await db
        .insert(customers)
        .values({
          companyId: testCompanyId,
          firstName: 'Other',
          lastName: 'Customer',
          assignedUserId: otherSalespersonUserId,
        })
        .returning();

      const caller = createTestCaller(salespersonContext);

      // Try to create quote for customer not assigned to this salesperson
      await expect(
        caller.quote.create({
          customerId: otherCustomer.id,
          taxRate: 0.0825,
          discountAmount: 0,
          lineItems: [
            {
              type: 'product',
              name: 'Sink',
              quantity: 1,
              unitPrice: 450,
              discountPercent: 0,
            },
          ],
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should calculate totals correctly on creation', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825, // 8.25% tax
        discountAmount: 50,
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 2,
            unitPrice: 450,
            discountPercent: 10, // 10% discount per item
          },
          {
            type: 'labor',
            name: 'Labor',
            quantity: 2,
            unitPrice: 150,
            discountPercent: 0,
          },
        ],
      });

      // Line 1: 2 * 450 * 0.9 = 810
      // Line 2: 2 * 150 = 300
      // Subtotal: 810 + 300 = 1110
      // After discount: 1110 - 50 = 1060
      // Tax: 1060 * 0.0825 = 87.45
      // Total: 1060 + 87.45 = 1147.45

      expect(parseFloat(result?.subtotal ?? '0')).toBe(1110);
      expect(parseFloat(result?.taxAmount ?? '0')).toBe(87.45);
      expect(parseFloat(result?.total ?? '0')).toBe(1147.45);
    });

    it('should reject quote creation without line items', async () => {
      const caller = createTestCaller(salespersonContext);

      await expect(
        caller.quote.create({
          customerId: testCustomerId,
          taxRate: 0.0825,
          discountAmount: 0,
          lineItems: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Quote State Machine Tests', () => {
    let testQuoteId: string;

    beforeEach(async () => {
      // Create a quote for state transition tests
      const caller = createTestCaller(salespersonContext);
      const quote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });
      testQuoteId = quote!.id;
    });

    it('should allow valid transition: draft → sent', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'sent',
      });

      expect(result.status).toBe('sent');
    });

    it('should allow valid transition: sent → viewed', async () => {
      const caller = createTestCaller(salespersonContext);

      await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'sent',
      });

      const result = await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'viewed',
      });

      expect(result.status).toBe('viewed');
    });

    it('should allow valid transition: viewed → accepted', async () => {
      const caller = createTestCaller(salespersonContext);

      await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'sent',
      });

      await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'viewed',
      });

      const result = await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'accepted',
      });

      expect(result.status).toBe('accepted');
    });

    it('should reject invalid transition: draft → accepted', async () => {
      const caller = createTestCaller(salespersonContext);

      await expect(
        caller.quote.updateStatus({
          id: testQuoteId,
          status: 'accepted',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid transition: accepted → draft', async () => {
      const caller = createTestCaller(salespersonContext);

      // Move to accepted state
      await caller.quote.updateStatus({ id: testQuoteId, status: 'sent' });
      await caller.quote.updateStatus({ id: testQuoteId, status: 'viewed' });
      await caller.quote.updateStatus({ id: testQuoteId, status: 'accepted' });

      // Try to go back to draft
      await expect(
        caller.quote.updateStatus({
          id: testQuoteId,
          status: 'draft',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject accepting an expired quote', async () => {
      const caller = createTestCaller(salespersonContext);

      // Create a quote that's already expired
      const expiredQuote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        validUntil: new Date(Date.now() - 1000).toISOString(), // Already expired
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      await caller.quote.updateStatus({ id: expiredQuote!.id, status: 'sent' });
      await caller.quote.updateStatus({ id: expiredQuote!.id, status: 'viewed' });

      await expect(
        caller.quote.updateStatus({
          id: expiredQuote!.id,
          status: 'accepted',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should allow transition to expired from sent', async () => {
      const caller = createTestCaller(salespersonContext);

      await caller.quote.updateStatus({ id: testQuoteId, status: 'sent' });

      const result = await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'expired',
      });

      expect(result.status).toBe('expired');
    });

    it('should allow transition to rejected from viewed', async () => {
      const caller = createTestCaller(salespersonContext);

      await caller.quote.updateStatus({ id: testQuoteId, status: 'sent' });
      await caller.quote.updateStatus({ id: testQuoteId, status: 'viewed' });

      const result = await caller.quote.updateStatus({
        id: testQuoteId,
        status: 'rejected',
      });

      expect(result.status).toBe('rejected');
    });
  });

  describe('3. Quote Calculation Tests', () => {
    it('should calculate subtotal correctly - sum of line totals', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Item 1',
            quantity: 2,
            unitPrice: 100,
            discountPercent: 0,
          },
          {
            type: 'product',
            name: 'Item 2',
            quantity: 3,
            unitPrice: 50,
            discountPercent: 0,
          },
        ],
      });

      // 2*100 + 3*50 = 200 + 150 = 350
      expect(parseFloat(result?.subtotal ?? '0')).toBe(350);
    });

    it('should calculate tax correctly - taxRate × taxableAmount', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.1, // 10% tax
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Item',
            quantity: 1,
            unitPrice: 100,
            discountPercent: 0,
          },
        ],
      });

      // Tax: 100 * 0.1 = 10
      expect(parseFloat(result?.taxAmount ?? '0')).toBe(10);
      expect(parseFloat(result?.total ?? '0')).toBe(110);
    });

    it('should apply discount before calculating tax', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.1, // 10% tax
        discountAmount: 20,
        lineItems: [
          {
            type: 'product',
            name: 'Item',
            quantity: 1,
            unitPrice: 100,
            discountPercent: 0,
          },
        ],
      });

      // Subtotal: 100
      // After discount: 100 - 20 = 80
      // Tax: 80 * 0.1 = 8
      // Total: 80 + 8 = 88
      expect(parseFloat(result?.subtotal ?? '0')).toBe(100);
      expect(parseFloat(result?.taxAmount ?? '0')).toBe(8);
      expect(parseFloat(result?.total ?? '0')).toBe(88);
    });

    it('should calculate line item total with discount - quantity × unitPrice × (1 - discountPercent/100)', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Item',
            quantity: 5,
            unitPrice: 100,
            discountPercent: 20, // 20% off
          },
        ],
      });

      // Line total: 5 * 100 * 0.8 = 400
      expect(parseFloat(result?.lineItems?.[0].lineTotal ?? '0')).toBe(400);
      expect(parseFloat(result?.subtotal ?? '0')).toBe(400);
    });

    it('should handle very large discounts correctly', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.1,
        discountAmount: 10000, // Discount larger than subtotal
        lineItems: [
          {
            type: 'product',
            name: 'Item',
            quantity: 1,
            unitPrice: 100,
            discountPercent: 0,
          },
        ],
      });

      // Subtotal: 100
      // After discount: max(0, 100 - 10000) = 0
      // Tax: 0 * 0.1 = 0
      // Total: 0
      expect(parseFloat(result?.taxAmount ?? '0')).toBe(0);
      expect(parseFloat(result?.total ?? '0')).toBe(0);
    });

    it('should round monetary values to 2 decimal places', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825, // 8.25% - will produce fractional cents
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Item',
            quantity: 3,
            unitPrice: 33.33,
            discountPercent: 0,
          },
        ],
      });

      // Subtotal: 3 * 33.33 = 99.99
      // Tax: 99.99 * 0.0825 = 8.249175 → should round to 8.25
      const taxAmount = parseFloat(result?.taxAmount ?? '0');
      expect(taxAmount).toBe(8.25);
      expect(Number.isInteger(taxAmount * 100)).toBe(true); // Verify exactly 2 decimal places
    });
  });

  describe('4. Line Items Tests', () => {
    let testQuoteId: string;

    beforeEach(async () => {
      const caller = createTestCaller(salespersonContext);
      const quote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Initial Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });
      testQuoteId = quote!.id;
    });

    it('should add line item to quote', async () => {
      const caller = createTestCaller(salespersonContext);

      const lineItem = await caller.quote.addLineItem({
        quoteId: testQuoteId,
        type: 'labor',
        name: 'Installation',
        quantity: 1,
        unitPrice: 150,
        discountPercent: 0,
      });

      expect(lineItem.quoteId).toBe(testQuoteId);
      expect(lineItem.name).toBe('Installation');
      expect(lineItem.sortOrder).toBe(1); // Second item
    });

    it('should update line item and recalculate totals', async () => {
      const caller = createTestCaller(salespersonContext);

      const quote = await caller.quote.get({ id: testQuoteId });
      const lineItemId = quote.lineItems[0].id;
      const originalTotal = parseFloat(quote.total);

      // Update quantity from 1 to 2
      await caller.quote.updateLineItem({
        id: lineItemId,
        quoteId: testQuoteId,
        quantity: 2,
      });

      const updatedQuote = await caller.quote.get({ id: testQuoteId });
      const newTotal = parseFloat(updatedQuote.total);

      // Total should approximately double (accounting for tax)
      expect(newTotal).toBeGreaterThan(originalTotal * 1.9);
      expect(newTotal).toBeLessThan(originalTotal * 2.1);
    });

    it('should delete line item and recalculate totals', async () => {
      const caller = createTestCaller(salespersonContext);

      // Add a second line item
      const lineItem = await caller.quote.addLineItem({
        quoteId: testQuoteId,
        type: 'labor',
        name: 'Installation',
        quantity: 1,
        unitPrice: 150,
        discountPercent: 0,
      });

      const quoteBeforeDelete = await caller.quote.get({ id: testQuoteId });
      expect(quoteBeforeDelete.lineItems).toHaveLength(2);

      // Delete the second line item
      await caller.quote.deleteLineItem({
        id: lineItem.id,
        quoteId: testQuoteId,
      });

      const quoteAfterDelete = await caller.quote.get({ id: testQuoteId });
      expect(quoteAfterDelete.lineItems).toHaveLength(1);

      // Verify totals recalculated correctly
      const expectedSubtotal = 450;
      const expectedTax = Math.round(expectedSubtotal * 0.0825 * 100) / 100;
      expect(parseFloat(quoteAfterDelete.subtotal)).toBe(expectedSubtotal);
      expect(parseFloat(quoteAfterDelete.taxAmount)).toBe(expectedTax);
    });

    it('should enforce RBAC - cannot modify other company quotes', async () => {
      // Create another company and quote
      const [otherCompany] = await db
        .insert(companies)
        .values({
          name: 'Other Company',
          slug: 'other-company-quotes',
        })
        .returning();

      const passwordHash = await bcrypt.hash('TestPass123', 12);
      const [otherUser] = await db
        .insert(users)
        .values({
          email: 'other-company-user@example.com',
          passwordHash,
          firstName: 'Other',
          lastName: 'User',
          companyId: otherCompany.id,
          role: 'admin',
        })
        .returning();

      // Create customer in other company (not used, but required to have customer data)
      await db
        .insert(customers)
        .values({
          companyId: otherCompany.id,
          firstName: 'Other',
          lastName: 'Customer',
        })
        .returning();

      const otherContext = createAuthenticatedContext({
        companyId: otherCompany.id,
        userId: otherUser.id,
        role: 'admin',
      });

      const otherCaller = createTestCaller(otherContext);

      // Try to add line item to quote from different company
      await expect(
        otherCaller.quote.addLineItem({
          quoteId: testQuoteId,
          type: 'labor',
          name: 'Unauthorized',
          quantity: 1,
          unitPrice: 100,
          discountPercent: 0,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should enforce RBAC - salesperson cannot modify other user quotes', async () => {
      // First get the line item ID using the original salesperson's context
      const originalCaller = createTestCaller(salespersonContext);
      const quote = await originalCaller.quote.get({ id: testQuoteId });
      const lineItemId = quote.lineItems[0].id;

      // Other salesperson tries to modify - should fail
      const otherCaller = createTestCaller(otherSalespersonContext);
      await expect(
        otherCaller.quote.updateLineItem({
          id: lineItemId,
          quoteId: testQuoteId,
          quantity: 5,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should update line item price and recalculate line total', async () => {
      const caller = createTestCaller(salespersonContext);

      const quote = await caller.quote.get({ id: testQuoteId });
      const lineItemId = quote.lineItems[0].id;

      await caller.quote.updateLineItem({
        id: lineItemId,
        quoteId: testQuoteId,
        unitPrice: 500,
        discountPercent: 10,
      });

      const updatedQuote = await caller.quote.get({ id: testQuoteId });
      const updatedLineItem = updatedQuote.lineItems[0];

      // 1 * 500 * 0.9 = 450
      expect(parseFloat(updatedLineItem.lineTotal)).toBe(450);
    });
  });

  describe('5. Quote Listing Tests', () => {
    beforeEach(async () => {
      // Create multiple quotes with different statuses
      const caller = createTestCaller(salespersonContext);

      // Draft quote
      await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Draft Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      // Sent quote
      const sentQuote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Sent Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });
      await caller.quote.updateStatus({ id: sentQuote!.id, status: 'sent' });

      // Accepted quote
      const acceptedQuote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lineItems: [
          {
            type: 'product',
            name: 'Accepted Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });
      await caller.quote.updateStatus({ id: acceptedQuote!.id, status: 'sent' });
      await caller.quote.updateStatus({ id: acceptedQuote!.id, status: 'viewed' });
      await caller.quote.updateStatus({ id: acceptedQuote!.id, status: 'accepted' });
    });

    it('should filter by status - draft', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.list({ status: 'draft' });

      expect(result.items.every((q: { status: string }) => q.status === 'draft')).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should filter by status - sent', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.list({ status: 'sent' });

      expect(result.items.every((q: { status: string }) => q.status === 'sent')).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should filter by status - accepted', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.list({ status: 'accepted' });

      expect(result.items.every((q: { status: string }) => q.status === 'accepted')).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should allow admin to see all company quotes', async () => {
      const adminCaller = createTestCaller(adminContext);
      const salespersonCaller = createTestCaller(salespersonContext);

      const adminResult = await adminCaller.quote.list({});
      const salespersonResult = await salespersonCaller.quote.list({});

      // Admin should see at least as many quotes as salesperson
      expect(adminResult.total).toBeGreaterThanOrEqual(salespersonResult.total);
    });

    it('should limit salesperson to only their quotes', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.list({});

      // All quotes should be created by this salesperson
      const allQuotes = await db
        .select()
        .from(quotes)
        .where(
          and(eq(quotes.companyId, testCompanyId), eq(quotes.createdById, testSalespersonUserId))
        );

      expect(result.total).toBe(allQuotes.length);
    });

    it('should paginate correctly', async () => {
      const caller = createTestCaller(salespersonContext);

      const page1 = await caller.quote.list({ limit: 2, offset: 0 });
      const page2 = await caller.quote.list({ limit: 2, offset: 2 });

      expect(page1.items.length).toBeLessThanOrEqual(2);
      expect(page2.items.length).toBeLessThanOrEqual(2);

      // Items should be different
      if (page1.items.length > 0 && page2.items.length > 0) {
        expect(page1.items[0].id).not.toBe(page2.items[0].id);
      }
    });

    it('should return hasMore flag correctly', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.list({ limit: 1, offset: 0 });

      if (result.total > 1) {
        expect(result.hasMore).toBe(true);
      } else {
        expect(result.hasMore).toBe(false);
      }
    });
  });

  describe('6. Edge Cases', () => {
    it('should handle quote with minimum valid line item count (1)', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Single Item',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      expect(result?.lineItems).toHaveLength(1);
    });

    it('should handle 100% line item discount', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Free Item',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 100, // 100% off
          },
        ],
      });

      expect(parseFloat(result?.lineItems?.[0].lineTotal ?? '0')).toBe(0);
      expect(parseFloat(result?.subtotal ?? '0')).toBe(0);
      expect(parseFloat(result?.total ?? '0')).toBe(0);
    });

    it('should handle quote expiration boundary - exactly at expiration time', async () => {
      const caller = createTestCaller(salespersonContext);

      // Create quote expiring in 1 second
      const expirationTime = new Date(Date.now() + 1000);
      const quote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        validUntil: expirationTime.toISOString(),
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      await caller.quote.updateStatus({ id: quote!.id, status: 'sent' });
      await caller.quote.updateStatus({ id: quote!.id, status: 'viewed' });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should reject acceptance after expiration
      await expect(
        caller.quote.updateStatus({ id: quote!.id, status: 'accepted' })
      ).rejects.toThrow(TRPCError);
    });

    it('should handle quote without expiration date', async () => {
      const caller = createTestCaller(salespersonContext);

      const quote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        // No validUntil specified
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      expect(quote?.validUntil).toBeNull();

      // Should allow acceptance without expiration check
      await caller.quote.updateStatus({ id: quote!.id, status: 'sent' });
      await caller.quote.updateStatus({ id: quote!.id, status: 'viewed' });

      const accepted = await caller.quote.updateStatus({
        id: quote!.id,
        status: 'accepted',
      });

      expect(accepted.status).toBe('accepted');
    });

    it('should handle very large quantity values', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Bulk Order',
            quantity: 1000,
            unitPrice: 10,
            discountPercent: 0,
          },
        ],
      });

      expect(parseFloat(result?.subtotal ?? '0')).toBe(10000);
    });

    it('should handle very small unit prices', async () => {
      const caller = createTestCaller(salespersonContext);

      const result = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'material',
            name: 'Small Part',
            quantity: 1,
            unitPrice: 0.01,
            discountPercent: 0,
          },
        ],
      });

      expect(parseFloat(result?.subtotal ?? '0')).toBe(0.01);
    });

    it('should reject unauthenticated quote creation', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.quote.create({
          customerId: testCustomerId,
          taxRate: 0.0825,
          discountAmount: 0,
          lineItems: [
            {
              type: 'product',
              name: 'Sink',
              quantity: 1,
              unitPrice: 450,
              discountPercent: 0,
            },
          ],
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should handle customer signature flow', async () => {
      const caller = createTestCaller(salespersonContext);

      const quote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      await caller.quote.updateStatus({ id: quote!.id, status: 'sent' });
      await caller.quote.updateStatus({ id: quote!.id, status: 'viewed' });

      const signedQuote = await caller.quote.saveSignature({
        id: quote!.id,
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      });

      expect(signedQuote.status).toBe('accepted');
      expect(signedQuote.signatureUrl).toBeDefined();
      expect(signedQuote.signedAt).toBeDefined();
    });

    it('should reject signature on draft quote', async () => {
      const caller = createTestCaller(salespersonContext);

      const quote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      await expect(
        caller.quote.saveSignature({
          id: quote!.id,
          signatureDataUrl: 'data:image/png;base64,test',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject signature on expired quote', async () => {
      const caller = createTestCaller(salespersonContext);

      const quote = await caller.quote.create({
        customerId: testCustomerId,
        taxRate: 0.0825,
        discountAmount: 0,
        validUntil: new Date(Date.now() - 1000).toISOString(), // Already expired
        lineItems: [
          {
            type: 'product',
            name: 'Sink',
            quantity: 1,
            unitPrice: 450,
            discountPercent: 0,
          },
        ],
      });

      await caller.quote.updateStatus({ id: quote!.id, status: 'sent' });

      await expect(
        caller.quote.saveSignature({
          id: quote!.id,
          signatureDataUrl: 'data:image/png;base64,test',
        })
      ).rejects.toThrow(TRPCError);
    });
  });
});
