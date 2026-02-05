import { describe, it, expect, beforeAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { companies, customers, users } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  createTestCaller,
  createUnauthenticatedContext,
  createAuthenticatedContext,
} from '../test-utils';

describe('Measurement Router', () => {
  let testCompanyId: string;
  let testCustomerId: string;
  let testUserId: string;
  let authContext: ReturnType<typeof createAuthenticatedContext>;

  beforeAll(async () => {
    // Get or create a test company
    let company = await db.query.companies.findFirst({
      where: eq(companies.slug, 'measurement-test-company'),
    });

    if (!company) {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: 'Measurement Test Company',
          slug: 'measurement-test-company',
        })
        .returning();
      company = newCompany;
    }

    testCompanyId = company.id;

    // Get or create a test user
    let user = await db.query.users.findFirst({
      where: eq(users.email, 'measurement-test@example.com'),
    });

    if (!user) {
      const passwordHash = await bcrypt.hash('TestPass123', 12);
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'measurement-test@example.com',
          passwordHash,
          firstName: 'Measurement',
          lastName: 'Tester',
          companyId: testCompanyId,
          role: 'salesperson',
        })
        .returning();
      user = newUser;
    }

    testUserId = user.id;

    authContext = createAuthenticatedContext({
      companyId: testCompanyId,
      userId: testUserId,
    });

    // Create a test customer assigned to the test user (required for salesperson RBAC)
    const [customer] = await db
      .insert(customers)
      .values({
        companyId: testCompanyId,
        firstName: 'Measurement',
        lastName: `Customer${Date.now()}`,
        assignedUserId: testUserId,
      })
      .returning();

    testCustomerId = customer.id;
  });

  describe('create', () => {
    it('should create a measurement with required fields', async () => {
      const caller = createTestCaller(authContext);

      const result = await caller.measurement.create({
        customerId: testCustomerId,
        cabinetWidthInches: 36,
        cabinetDepthInches: 24,
        cabinetHeightInches: 34,
      });

      expect(result).toHaveProperty('id');
      // Decimal values include trailing zeros from database
      expect(parseFloat(result.cabinetWidthInches)).toBe(36);
      expect(parseFloat(result.cabinetDepthInches)).toBe(24);
      expect(parseFloat(result.cabinetHeightInches)).toBe(34);
    });

    it('should create a measurement with all optional fields', async () => {
      const caller = createTestCaller(authContext);

      const result = await caller.measurement.create({
        customerId: testCustomerId,
        cabinetWidthInches: 48,
        cabinetDepthInches: 25,
        cabinetHeightInches: 36,
        countertopMaterial: 'granite',
        countertopThicknessInches: 1.5,
        countertopOverhangFrontInches: 1,
        countertopOverhangSidesInches: 0.5,
        mountingStyle: 'undermount',
        faucetHoleCount: 3,
        faucetHoleSpacing: '4 inch center',
        existingSinkWidthInches: 33,
        existingSinkDepthInches: 22,
        existingSinkBowlCount: 2,
        backsplashHeightInches: 4,
        windowClearanceInches: 12,
        plumbingCenterlineFromLeft: 18,
        garbageDisposal: true,
        dishwasherAirGap: false,
        location: 'Kitchen',
        notes: 'Corner cabinet installation',
      });

      expect(result.countertopMaterial).toBe('granite');
      expect(result.mountingStyle).toBe('undermount');
      expect(result.faucetHoleCount).toBe(3);
      expect(result.garbageDisposal).toBe(true);
      expect(result.location).toBe('Kitchen');
    });

    it('should reject invalid countertop material', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.create({
          customerId: testCustomerId,
          cabinetWidthInches: 36,
          cabinetDepthInches: 24,
          cabinetHeightInches: 34,
          countertopMaterial: 'invalid_material' as 'granite',
        })
      ).rejects.toThrow();
    });

    it('should reject invalid mounting style', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.create({
          customerId: testCustomerId,
          cabinetWidthInches: 36,
          cabinetDepthInches: 24,
          cabinetHeightInches: 34,
          mountingStyle: 'invalid_style' as 'drop_in',
        })
      ).rejects.toThrow();
    });

    it('should reject negative dimensions', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.create({
          customerId: testCustomerId,
          cabinetWidthInches: -10,
          cabinetDepthInches: 24,
          cabinetHeightInches: 34,
        })
      ).rejects.toThrow();
    });

    it('should reject dimensions exceeding maximum', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.create({
          customerId: testCustomerId,
          cabinetWidthInches: 200, // Max is 120
          cabinetDepthInches: 24,
          cabinetHeightInches: 34,
        })
      ).rejects.toThrow();
    });

    it('should reject non-existent customer', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.create({
          customerId: '00000000-0000-0000-0000-000000000000',
          cabinetWidthInches: 36,
          cabinetDepthInches: 24,
          cabinetHeightInches: 34,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject unauthenticated requests', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.measurement.create({
          customerId: testCustomerId,
          cabinetWidthInches: 36,
          cabinetDepthInches: 24,
          cabinetHeightInches: 34,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('listByCustomer', () => {
    it('should list measurements for a customer', async () => {
      const caller = createTestCaller(authContext);

      // Create a measurement
      await caller.measurement.create({
        customerId: testCustomerId,
        cabinetWidthInches: 30,
        cabinetDepthInches: 22,
        cabinetHeightInches: 32,
        location: 'Bathroom',
      });

      const result = await caller.measurement.listByCustomer({
        customerId: testCustomerId,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const caller = createTestCaller(authContext);

      const result = await caller.measurement.listByCustomer({
        customerId: testCustomerId,
        limit: 2,
        offset: 0,
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should reject non-existent customer', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.listByCustomer({
          customerId: '00000000-0000-0000-0000-000000000000',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('get', () => {
    it('should get a measurement by ID', async () => {
      const caller = createTestCaller(authContext);

      // Create a measurement
      const created = await caller.measurement.create({
        customerId: testCustomerId,
        cabinetWidthInches: 42,
        cabinetDepthInches: 24,
        cabinetHeightInches: 35,
        location: 'Master Bath',
      });

      const result = await caller.measurement.get({ id: created.id });

      expect(result.id).toBe(created.id);
      expect(result.location).toBe('Master Bath');
    });

    it('should reject non-existent measurement', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.get({ id: '00000000-0000-0000-0000-000000000000' })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('update', () => {
    it('should update a measurement', async () => {
      const caller = createTestCaller(authContext);

      // Create a measurement
      const created = await caller.measurement.create({
        customerId: testCustomerId,
        cabinetWidthInches: 36,
        cabinetDepthInches: 24,
        cabinetHeightInches: 34,
      });

      // Update the measurement
      const result = await caller.measurement.update({
        id: created.id,
        cabinetWidthInches: 40,
        countertopMaterial: 'quartz',
      });

      expect(parseFloat(result.cabinetWidthInches)).toBe(40);
      expect(result.countertopMaterial).toBe('quartz');
    });

    it('should reject update of non-existent measurement', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.update({
          id: '00000000-0000-0000-0000-000000000000',
          cabinetWidthInches: 40,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('delete', () => {
    it('should delete a measurement', async () => {
      const caller = createTestCaller(authContext);

      // Create a measurement
      const created = await caller.measurement.create({
        customerId: testCustomerId,
        cabinetWidthInches: 36,
        cabinetDepthInches: 24,
        cabinetHeightInches: 34,
      });

      // Delete the measurement
      const result = await caller.measurement.delete({ id: created.id });

      expect(result.success).toBe(true);

      // Verify deletion
      await expect(caller.measurement.get({ id: created.id })).rejects.toThrow(TRPCError);
    });

    it('should reject deletion of non-existent measurement', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.measurement.delete({ id: '00000000-0000-0000-0000-000000000000' })
      ).rejects.toThrow(TRPCError);
    });
  });
});
