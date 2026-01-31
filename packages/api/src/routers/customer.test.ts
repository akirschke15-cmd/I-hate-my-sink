import { describe, it, expect, beforeAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { companies, users } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  createTestCaller,
  createUnauthenticatedContext,
  createAuthenticatedContext,
} from '../test-utils';

describe('Customer Router', () => {
  let testCompanyId: string;
  let testUserId: string;
  let authContext: ReturnType<typeof createAuthenticatedContext>;

  beforeAll(async () => {
    // Get or create a test company
    let company = await db.query.companies.findFirst({
      where: eq(companies.slug, 'customer-test-company'),
    });

    if (!company) {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: 'Customer Test Company',
          slug: 'customer-test-company',
        })
        .returning();
      company = newCompany;
    }

    testCompanyId = company.id;

    // Get or create a test user
    let user = await db.query.users.findFirst({
      where: eq(users.email, 'customer-test@example.com'),
    });

    if (!user) {
      const passwordHash = await bcrypt.hash('TestPass123', 12);
      const [newUser] = await db
        .insert(users)
        .values({
          email: 'customer-test@example.com',
          passwordHash,
          firstName: 'Customer',
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
  });

  describe('create', () => {
    it('should create a customer successfully', async () => {
      const caller = createTestCaller(authContext);

      const result = await caller.customer.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
      });

      expect(result).toHaveProperty('id');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('555-1234');
    });

    it('should create a customer with address', async () => {
      const caller = createTestCaller(authContext);

      const result = await caller.customer.create({
        firstName: 'Jane',
        lastName: 'Smith',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zip: '90210',
        },
      });

      expect(result.address).toEqual({
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '90210',
      });
    });

    it('should create a customer with notes', async () => {
      const caller = createTestCaller(authContext);

      const result = await caller.customer.create({
        firstName: 'Bob',
        lastName: 'Builder',
        notes: 'Prefers morning appointments',
      });

      expect(result.notes).toBe('Prefers morning appointments');
    });

    it('should reject unauthenticated requests', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.customer.create({
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should require firstName and lastName', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.customer.create({
          firstName: '',
          lastName: 'Doe',
        })
      ).rejects.toThrow();

      await expect(
        caller.customer.create({
          firstName: 'John',
          lastName: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should list customers for the company', async () => {
      const caller = createTestCaller(authContext);

      // Create a customer first
      await caller.customer.create({
        firstName: 'List',
        lastName: 'Test',
      });

      const result = await caller.customer.list({});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should support search', async () => {
      const caller = createTestCaller(authContext);
      const uniqueName = `Unique${Date.now()}`;

      // Create a customer with unique name
      await caller.customer.create({
        firstName: uniqueName,
        lastName: 'Searchable',
      });

      const result = await caller.customer.list({
        search: uniqueName,
      });

      expect(result.some((c) => c.firstName === uniqueName)).toBe(true);
    });

    it('should support pagination', async () => {
      const caller = createTestCaller(authContext);

      const result = await caller.customer.list({
        limit: 5,
        offset: 0,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should reject unauthenticated requests', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(caller.customer.list({})).rejects.toThrow(TRPCError);
    });
  });

  describe('get', () => {
    it('should get a customer by ID', async () => {
      const caller = createTestCaller(authContext);

      // Create a customer
      const created = await caller.customer.create({
        firstName: 'Get',
        lastName: 'Test',
      });

      const result = await caller.customer.get({ id: created.id });

      expect(result.id).toBe(created.id);
      expect(result.firstName).toBe('Get');
      expect(result.lastName).toBe('Test');
    });

    it('should reject non-existent customer ID', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.customer.get({ id: '00000000-0000-0000-0000-000000000000' })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid UUID format', async () => {
      const caller = createTestCaller(authContext);

      await expect(caller.customer.get({ id: 'invalid-id' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const caller = createTestCaller(authContext);

      // Create a customer
      const created = await caller.customer.create({
        firstName: 'Update',
        lastName: 'Test',
      });

      // Update the customer
      const result = await caller.customer.update({
        id: created.id,
        firstName: 'Updated',
        email: 'updated@example.com',
      });

      expect(result.firstName).toBe('Updated');
      expect(result.email).toBe('updated@example.com');
      expect(result.lastName).toBe('Test'); // Unchanged
    });

    it('should update address', async () => {
      const caller = createTestCaller(authContext);

      // Create a customer
      const created = await caller.customer.create({
        firstName: 'Address',
        lastName: 'Update',
      });

      // Update with address
      const result = await caller.customer.update({
        id: created.id,
        address: {
          city: 'New City',
          state: 'NY',
        },
      });

      expect(result.address?.city).toBe('New City');
      expect(result.address?.state).toBe('NY');
    });

    it('should reject update of non-existent customer', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.customer.update({
          id: '00000000-0000-0000-0000-000000000000',
          firstName: 'Test',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('delete', () => {
    it('should delete a customer', async () => {
      const caller = createTestCaller(authContext);

      // Create a customer
      const created = await caller.customer.create({
        firstName: 'Delete',
        lastName: 'Test',
      });

      // Delete the customer
      const result = await caller.customer.delete({ id: created.id });

      expect(result.success).toBe(true);

      // Verify deletion
      await expect(caller.customer.get({ id: created.id })).rejects.toThrow(TRPCError);
    });

    it('should reject deletion of non-existent customer', async () => {
      const caller = createTestCaller(authContext);

      await expect(
        caller.customer.delete({ id: '00000000-0000-0000-0000-000000000000' })
      ).rejects.toThrow(TRPCError);
    });
  });
});
