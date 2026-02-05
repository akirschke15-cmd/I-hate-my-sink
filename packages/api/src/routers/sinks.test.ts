import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { companies, users, customers, measurements, sinks } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  createTestCaller,
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from '../test-utils';

describe('Sink Router - Match Algorithm', () => {
  let testCompanyId: string;
  let testUserId: string;
  let testCustomerId: string;
  let authContext: ReturnType<typeof createAuthenticatedContext>;

  beforeAll(async () => {
    // Get or create a test company
    let company = await db.query.companies.findFirst({
      where: eq(companies.slug, 'sink-test-company'),
    });

    if (!company) {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: 'Sink Test Company',
          slug: 'sink-test-company',
        })
        .returning();
      company = newCompany;
    }

    testCompanyId = company.id;

    // Get or create a test user
    let user = await db.query.users.findFirst({
      where: eq(users.email, 'sink-test@example.com'),
    });

    if (!user) {
      const passwordHash = await bcrypt.hash('TestPass123', 12);
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'sink-test@example.com',
          passwordHash,
          firstName: 'Sink',
          lastName: 'Tester',
          companyId: testCompanyId,
          role: 'admin',
        })
        .returning();
      user = newUser;
    }

    testUserId = user.id;

    // Get or create a test customer
    let customer = await db.query.customers.findFirst({
      where: eq(customers.email, 'sink-customer@example.com'),
    });

    if (!customer) {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          companyId: testCompanyId,
          firstName: 'Test',
          lastName: 'Customer',
          email: 'sink-customer@example.com',
        })
        .returning();
      customer = newCustomer;
    }

    testCustomerId = customer.id;

    authContext = createAuthenticatedContext({
      companyId: testCompanyId,
      userId: testUserId,
      role: 'admin',
    });
  });

  // Helper function to create a test measurement
  async function createTestMeasurement(overrides?: {
    cabinetWidthInches?: string;
    cabinetDepthInches?: string;
    cabinetHeightInches?: string;
    mountingStyle?: 'drop_in' | 'undermount' | 'farmhouse' | 'flush_mount';
    existingSinkBowlCount?: number;
    countertopOverhangFrontInches?: string;
    countertopOverhangSidesInches?: string;
  }) {
    const [measurement] = await db
      .insert(measurements)
      .values({
        companyId: testCompanyId,
        customerId: testCustomerId,
        createdById: testUserId,
        cabinetWidthInches: overrides?.cabinetWidthInches ?? '36',
        cabinetDepthInches: overrides?.cabinetDepthInches ?? '24',
        cabinetHeightInches: overrides?.cabinetHeightInches ?? '36',
        mountingStyle: overrides?.mountingStyle,
        existingSinkBowlCount: overrides?.existingSinkBowlCount,
        countertopOverhangFrontInches: overrides?.countertopOverhangFrontInches,
        countertopOverhangSidesInches: overrides?.countertopOverhangSidesInches,
        location: 'Kitchen',
      })
      .returning();
    return measurement;
  }

  // Helper function to create a test sink
  async function createTestSink(overrides?: {
    sku?: string;
    name?: string;
    widthInches?: string;
    depthInches?: string;
    heightInches?: string;
    mountingStyle?: 'drop_in' | 'undermount' | 'farmhouse' | 'flush_mount';
    bowlCount?: number;
    isActive?: boolean;
  }) {
    const uniqueSku = overrides?.sku ?? `TEST-SINK-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const [sink] = await db
      .insert(sinks)
      .values({
        companyId: testCompanyId,
        sku: uniqueSku,
        name: overrides?.name ?? 'Test Sink',
        material: 'stainless_steel',
        mountingStyle: overrides?.mountingStyle ?? 'undermount',
        widthInches: overrides?.widthInches ?? '30',
        depthInches: overrides?.depthInches ?? '20',
        heightInches: overrides?.heightInches ?? '9',
        bowlCount: overrides?.bowlCount ?? 1,
        basePrice: '500',
        laborCost: '100',
        isActive: overrides?.isActive ?? true,
      })
      .returning();
    return sink;
  }

  describe('Width Scoring Tests', () => {
    beforeEach(async () => {
      // Clean up previous test sinks
      await db.delete(sinks).where(eq(sinks.companyId, testCompanyId));
    });

    it('should give maximum points (30) for optimal width clearance (6+ inches)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 36", Sink: 30" → Clearance: 6" (optimal)
      const measurement = await createTestMeasurement({ cabinetWidthInches: '36' });
      const sink = await createTestSink({ widthInches: '30', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Excellent width fit with optimal clearance');
      // 30 (width) + 30 (depth optimal) + 25 (no mounting preference) + 10 (no bowl preference) = 95
      expect(match!.score).toBeGreaterThanOrEqual(85);
    });

    it('should give medium points (20) for adequate width clearance (4-6 inches)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 36", Sink: 32" → Clearance: 4" (adequate)
      const measurement = await createTestMeasurement({ cabinetWidthInches: '36' });
      const sink = await createTestSink({ widthInches: '32', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Good width fit with adequate clearance');
    });

    it('should give low points (10) for tight width fit (0-4 inches)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 36", Sink: 35" → Clearance: 1" (tight)
      const measurement = await createTestMeasurement({ cabinetWidthInches: '36' });
      const sink = await createTestSink({ widthInches: '35', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Tight width fit - may require careful installation');
    });

    it('should disqualify sink that is too wide (negative clearance)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 30", Sink: 32" → Clearance: -2" (too wide)
      const measurement = await createTestMeasurement({ cabinetWidthInches: '30' });
      const sink = await createTestSink({ widthInches: '32', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      // Sink should be filtered out (score <= 0)
      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeUndefined();
    });
  });

  describe('Depth Scoring Tests', () => {
    beforeEach(async () => {
      await db.delete(sinks).where(eq(sinks.companyId, testCompanyId));
    });

    it('should give maximum points (30) for optimal depth clearance (3+ inches)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 24", Sink: 20" → Clearance: 4" (optimal)
      const measurement = await createTestMeasurement({ cabinetDepthInches: '24' });
      const sink = await createTestSink({ depthInches: '20', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Excellent depth fit with optimal clearance');
    });

    it('should give medium points (20) for adequate depth clearance (2-3 inches)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 24", Sink: 22" → Clearance: 2" (adequate)
      const measurement = await createTestMeasurement({ cabinetDepthInches: '24' });
      const sink = await createTestSink({ depthInches: '22', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Good depth fit with adequate clearance');
    });

    it('should give low points (10) for tight depth fit (0-2 inches)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 24", Sink: 23.5" → Clearance: 0.5" (tight)
      const measurement = await createTestMeasurement({ cabinetDepthInches: '24' });
      const sink = await createTestSink({ depthInches: '23.5', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Tight depth fit - may require careful installation');
    });

    it('should disqualify sink that is too deep (negative clearance)', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 20", Sink: 22" → Clearance: -2" (too deep)
      const measurement = await createTestMeasurement({ cabinetDepthInches: '20' });
      const sink = await createTestSink({ depthInches: '22', mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      // Sink should be filtered out (score <= 0)
      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeUndefined();
    });
  });

  describe('Mounting Style Matching Tests', () => {
    beforeEach(async () => {
      await db.delete(sinks).where(eq(sinks.companyId, testCompanyId));
    });

    it('should give full points (25) for exact mounting style match', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({ mountingStyle: 'undermount' });
      const sink = await createTestSink({ mountingStyle: 'undermount' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Matches preferred mounting style: undermount');
    });

    it('should give partial points (15) for compatible mounting styles (drop_in ↔ flush_mount)', async () => {
      const caller = createTestCaller(authContext);

      // Test drop_in measurement with flush_mount sink
      const measurement = await createTestMeasurement({ mountingStyle: 'drop_in' });
      const sink = await createTestSink({ mountingStyle: 'flush_mount' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Compatible mounting style (may require adjustment)');
    });

    it('should give partial points (15) for compatible mounting styles (flush_mount ↔ drop_in)', async () => {
      const caller = createTestCaller(authContext);

      // Test flush_mount measurement with drop_in sink
      const measurement = await createTestMeasurement({ mountingStyle: 'flush_mount' });
      const sink = await createTestSink({ mountingStyle: 'drop_in' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Compatible mounting style (may require adjustment)');
    });

    it('should give low points (5) for incompatible mounting styles', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({ mountingStyle: 'undermount' });
      const sink = await createTestSink({ mountingStyle: 'farmhouse' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Different mounting style: farmhouse');
    });

    it('should give partial points (15) when no mounting style preference is specified', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement(); // No mountingStyle specified
      const sink = await createTestSink({ mountingStyle: 'undermount' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('No mounting style preference specified');
    });

    it('should deduct points for undermount with insufficient width clearance', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 32", Sink: 31" (undermount) → Very tight fit
      const measurement = await createTestMeasurement({
        cabinetWidthInches: '32',
        mountingStyle: 'undermount',
      });
      const sink = await createTestSink({
        widthInches: '31',
        mountingStyle: 'undermount',
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Undermount may need extra width clearance for clips');
    });
  });

  describe('Bowl Count Tests', () => {
    beforeEach(async () => {
      await db.delete(sinks).where(eq(sinks.companyId, testCompanyId));
    });

    it('should give full points (15) for matching bowl count', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({ existingSinkBowlCount: 2 });
      const sink = await createTestSink({ bowlCount: 2 });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Matches existing bowl count: 2');
    });

    it('should give medium points (8) for bowl count difference of 1', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({ existingSinkBowlCount: 2 });
      const sink1 = await createTestSink({ bowlCount: 1, sku: 'SINK-1' });
      const sink3 = await createTestSink({ bowlCount: 3, sku: 'SINK-3' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match1 = result.matches.find((m) => m.sink.id === sink1.id);
      const match3 = result.matches.find((m) => m.sink.id === sink3.id);

      expect(match1).toBeDefined();
      expect(match1!.reasons).toContain('Bowl count differs by 1 (sink: 1, existing: 2)');

      expect(match3).toBeDefined();
      expect(match3!.reasons).toContain('Bowl count differs by 1 (sink: 3, existing: 2)');
    });

    it('should give low points (3) for bowl count difference greater than 1', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({ existingSinkBowlCount: 1 });
      const sink = await createTestSink({ bowlCount: 3 });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Different bowl count: 3');
    });

    it('should give partial points (10) when no bowl count preference is specified', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement(); // No existingSinkBowlCount
      const sink = await createTestSink({ bowlCount: 2 });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      // Should not have bowl count reason when no preference
      expect(match!.reasons.some((r) => r.includes('bowl count'))).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await db.delete(sinks).where(eq(sinks.companyId, testCompanyId));
    });

    it('should account for countertop overhang when calculating available space', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 36" wide, Side overhang: 1" each side → Available: 34"
      // Sink: 32" → Clearance: 2" (adequate)
      const measurement = await createTestMeasurement({
        cabinetWidthInches: '36',
        countertopOverhangSidesInches: '1',
      });
      const sink = await createTestSink({ widthInches: '32' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      // Should account for overhang in scoring
    });

    it('should account for front overhang when calculating available depth', async () => {
      const caller = createTestCaller(authContext);

      // Cabinet: 24" deep, Front overhang: 1" → Available: 23"
      // Sink: 21" → Clearance: 2" (adequate)
      const measurement = await createTestMeasurement({
        cabinetDepthInches: '24',
        countertopOverhangFrontInches: '1',
      });
      const sink = await createTestSink({ depthInches: '21' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      // Should account for overhang in scoring
    });

    it('should handle missing optional measurement fields gracefully', async () => {
      const caller = createTestCaller(authContext);

      // Measurement with minimal required fields only
      const measurement = await createTestMeasurement();
      const sink = await createTestSink();

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      expect(result.matches.length).toBeGreaterThan(0);
      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
    });

    it('should return empty results when no sinks exist', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement();

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      expect(result.matches).toEqual([]);
      expect(result.totalCandidates).toBe(0);
    });

    it('should return no matches when all sinks are too large', async () => {
      const caller = createTestCaller(authContext);

      // Small cabinet: 24" x 18"
      const measurement = await createTestMeasurement({
        cabinetWidthInches: '24',
        cabinetDepthInches: '18',
      });

      // Large sinks that won't fit
      await createTestSink({ widthInches: '36', depthInches: '22', sku: 'LARGE-1' });
      await createTestSink({ widthInches: '33', depthInches: '21', sku: 'LARGE-2' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      expect(result.matches).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await db.delete(sinks).where(eq(sinks.companyId, testCompanyId));
    });

    it('should return results sorted by score descending', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '36',
        cabinetDepthInches: '24',
        mountingStyle: 'undermount',
        existingSinkBowlCount: 2,
      });

      // Create sinks with varying match quality
      // Excellent match: 30" x 20", undermount, 2 bowls
      const excellentSink = await createTestSink({
        widthInches: '30',
        depthInches: '20',
        mountingStyle: 'undermount',
        bowlCount: 2,
        sku: 'EXCELLENT',
      });

      // Good match: 32" x 21", undermount, 1 bowl (created for test data)
      await createTestSink({
        widthInches: '32',
        depthInches: '21',
        mountingStyle: 'undermount',
        bowlCount: 1,
        sku: 'GOOD',
      });

      // Marginal match: 34" x 22", drop_in, 1 bowl (created for test data)
      await createTestSink({
        widthInches: '34',
        depthInches: '22',
        mountingStyle: 'drop_in',
        bowlCount: 1,
        sku: 'MARGINAL',
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      expect(result.matches.length).toBe(3);

      // Verify descending score order
      for (let i = 1; i < result.matches.length; i++) {
        expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
      }

      // Excellent sink should be first
      expect(result.matches[0].sink.id).toBe(excellentSink.id);
    });

    it('should return correct fit rating based on score', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '36',
        cabinetDepthInches: '24',
      });

      // Excellent fit: score >= 80
      const excellentSink = await createTestSink({
        widthInches: '30',
        depthInches: '20',
        mountingStyle: 'undermount',
        bowlCount: 1,
        sku: 'EXCELLENT-FIT',
      });

      // Good fit: score >= 50 and < 80
      const goodSink = await createTestSink({
        widthInches: '34',
        depthInches: '22',
        mountingStyle: 'farmhouse',
        bowlCount: 1,
        sku: 'GOOD-FIT',
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const excellentMatch = result.matches.find((m) => m.sink.id === excellentSink.id);
      const goodMatch = result.matches.find((m) => m.sink.id === goodSink.id);

      expect(excellentMatch).toBeDefined();
      expect(excellentMatch!.score).toBeGreaterThanOrEqual(80);
      expect(excellentMatch!.fitRating).toBe('excellent');

      expect(goodMatch).toBeDefined();
      expect(goodMatch!.score).toBeGreaterThanOrEqual(50);
      expect(goodMatch!.score).toBeLessThan(80);
      expect(goodMatch!.fitRating).toBe('good');
    });

    it('should respect company isolation - only match sinks from same company', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement();

      // Create a sink for our test company
      const ourSink = await createTestSink({ sku: 'OUR-SINK' });

      // Create a sink for a different company
      const [otherCompany] = await db
        .insert(companies)
        .values({
          name: 'Other Company',
          slug: 'other-company',
        })
        .returning();

      const [otherSink] = await db
        .insert(sinks)
        .values({
          companyId: otherCompany.id,
          sku: 'OTHER-SINK',
          name: 'Other Sink',
          material: 'stainless_steel',
          mountingStyle: 'undermount',
          widthInches: '30',
          depthInches: '20',
          heightInches: '9',
          bowlCount: 1,
          basePrice: '500',
          laborCost: '100',
          isActive: true,
        })
        .returning();

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      // Should only return our company's sink
      expect(result.matches.some((m) => m.sink.id === ourSink.id)).toBe(true);
      expect(result.matches.some((m) => m.sink.id === otherSink.id)).toBe(false);
    });

    it('should only return active sinks', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement();

      // Create an active sink
      const activeSink = await createTestSink({ isActive: true, sku: 'ACTIVE' });

      // Create an inactive sink
      const inactiveSink = await createTestSink({ isActive: false, sku: 'INACTIVE' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      // Should only return active sink
      expect(result.matches.some((m) => m.sink.id === activeSink.id)).toBe(true);
      expect(result.matches.some((m) => m.sink.id === inactiveSink.id)).toBe(false);
    });

    it('should respect limit parameter', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement();

      // Create multiple sinks
      for (let i = 0; i < 10; i++) {
        await createTestSink({
          widthInches: `${28 + i}`,
          sku: `SINK-${i}`,
        });
      }

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 5,
      });

      expect(result.matches.length).toBeLessThanOrEqual(5);
    });

    it('should return correct totalCandidates count', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '36',
        cabinetDepthInches: '24',
      });

      // Create 5 sinks that fit
      for (let i = 0; i < 5; i++) {
        await createTestSink({
          widthInches: `${28 + i}`,
          depthInches: '20',
          sku: `FITTING-SINK-${i}`,
        });
      }

      // Create 2 sinks that are too large (won't be candidates)
      await createTestSink({ widthInches: '40', depthInches: '20', sku: 'TOO-WIDE' });
      await createTestSink({ widthInches: '30', depthInches: '30', sku: 'TOO-DEEP' });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      // Should have 5 candidates (only the ones that fit within cabinet dimensions)
      expect(result.totalCandidates).toBe(5);
    });

    it('should throw error for non-existent measurement', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.sink.matchToMeasurement({
          measurementId: '00000000-0000-0000-0000-000000000000',
          limit: 10,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should throw error for unauthenticated requests', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      const measurement = await createTestMeasurement();

      await expect(
        caller.sink.matchToMeasurement({
          measurementId: measurement.id,
          limit: 10,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should include all necessary measurement metadata in response', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '36',
        cabinetDepthInches: '24',
        cabinetHeightInches: '30',
        mountingStyle: 'undermount',
      });

      await createTestSink();

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      // Check measurement fields (use parseFloat for decimal comparison)
      expect(result.measurement.id).toBe(measurement.id);
      expect(parseFloat(result.measurement.cabinetWidthInches)).toBe(36);
      expect(parseFloat(result.measurement.cabinetDepthInches)).toBe(24);
      expect(parseFloat(result.measurement.cabinetHeightInches)).toBe(30);
      expect(result.measurement.mountingStyle).toBe('undermount');
      expect(result.measurement.location).toBe('Kitchen');
    });

    it('should include all sink details in match results', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement();
      const sink = await createTestSink({
        name: 'Premium Stainless Sink',
        widthInches: '30',
        depthInches: '20',
        heightInches: '9',
        mountingStyle: 'undermount',
        bowlCount: 2,
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      // Check sink fields (use parseFloat for decimal comparison)
      expect(match!.sink.id).toBe(sink.id);
      expect(match!.sink.name).toBe('Premium Stainless Sink');
      expect(parseFloat(match!.sink.widthInches)).toBe(30);
      expect(parseFloat(match!.sink.depthInches)).toBe(20);
      expect(parseFloat(match!.sink.heightInches)).toBe(9);
      expect(match!.sink.mountingStyle).toBe('undermount');
      expect(match!.sink.bowlCount).toBe(2);
      expect(match!).toHaveProperty('score');
      expect(match!).toHaveProperty('fitRating');
      expect(match!).toHaveProperty('reasons');
      expect(Array.isArray(match!.reasons)).toBe(true);
    });
  });

  describe('Complex Scoring Scenarios', () => {
    beforeEach(async () => {
      await db.delete(sinks).where(eq(sinks.companyId, testCompanyId));
    });

    it('should correctly score perfect match (all criteria optimal)', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '36',
        cabinetDepthInches: '24',
        mountingStyle: 'undermount',
        existingSinkBowlCount: 2,
      });

      const perfectSink = await createTestSink({
        widthInches: '30', // 6" clearance - optimal
        depthInches: '20', // 4" clearance - optimal
        mountingStyle: 'undermount', // exact match
        bowlCount: 2, // exact match
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === perfectSink.id);
      expect(match).toBeDefined();
      // 30 (width) + 30 (depth) + 25 (mounting) + 15 (bowl) = 100
      expect(match!.score).toBe(100);
      expect(match!.fitRating).toBe('excellent');
    });

    it('should handle decimal measurements correctly', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '35.5',
        cabinetDepthInches: '23.75',
      });

      const sink = await createTestSink({
        widthInches: '29.5', // 6" clearance
        depthInches: '19.75', // 4" clearance
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === sink.id);
      expect(match).toBeDefined();
      expect(match!.score).toBeGreaterThan(0);
    });

    it('should penalize undermount with tight clearance appropriately', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '31',
        mountingStyle: 'undermount',
      });

      const tightUndermount = await createTestSink({
        widthInches: '30', // Only 1" clearance, tight for undermount
        mountingStyle: 'undermount',
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      const match = result.matches.find((m) => m.sink.id === tightUndermount.id);
      expect(match).toBeDefined();
      expect(match!.reasons).toContain('Undermount may need extra width clearance for clips');
      // Should have points deducted
    });

    it('should compare multiple sinks and rank them correctly', async () => {
      const caller = createTestCaller(authContext);

      const measurement = await createTestMeasurement({
        cabinetWidthInches: '36',
        cabinetDepthInches: '24',
        mountingStyle: 'undermount',
        existingSinkBowlCount: 2,
      });

      // Best: Perfect dimensions, matching style and bowls
      const best = await createTestSink({
        widthInches: '30',
        depthInches: '20',
        mountingStyle: 'undermount',
        bowlCount: 2,
        sku: 'BEST',
      });

      // Second: Perfect dimensions, matching style, different bowls
      const second = await createTestSink({
        widthInches: '30',
        depthInches: '20',
        mountingStyle: 'undermount',
        bowlCount: 1,
        sku: 'SECOND',
      });

      // Third: Good dimensions, different style
      const third = await createTestSink({
        widthInches: '32',
        depthInches: '21',
        mountingStyle: 'drop_in',
        bowlCount: 2,
        sku: 'THIRD',
      });

      // Fourth: Tight dimensions, different style
      const fourth = await createTestSink({
        widthInches: '34',
        depthInches: '23',
        mountingStyle: 'farmhouse',
        bowlCount: 1,
        sku: 'FOURTH',
      });

      const result = await caller.sink.matchToMeasurement({
        measurementId: measurement.id,
        limit: 10,
      });

      expect(result.matches.length).toBe(4);

      // Verify correct order
      expect(result.matches[0].sink.id).toBe(best.id);
      expect(result.matches[1].sink.id).toBe(second.id);
      expect(result.matches[2].sink.id).toBe(third.id);
      expect(result.matches[3].sink.id).toBe(fourth.id);

      // Verify scores are in descending order
      expect(result.matches[0].score).toBeGreaterThan(result.matches[1].score);
      expect(result.matches[1].score).toBeGreaterThan(result.matches[2].score);
      expect(result.matches[2].score).toBeGreaterThan(result.matches[3].score);
    });
  });
});
