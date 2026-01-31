import { describe, it, expect, beforeAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { companies } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';
import {
  createTestCaller,
  createUnauthenticatedContext,
  generateTestEmail,
} from '../test-utils';

describe('Auth Router', () => {
  let testCompanyId: string;
  const testPassword = 'TestPass123';

  beforeAll(async () => {
    // Get or create a test company
    let company = await db.query.companies.findFirst({
      where: eq(companies.slug, 'test-company'),
    });

    if (!company) {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: 'Test Company',
          slug: 'test-company',
        })
        .returning();
      company = newCompany;
    }

    testCompanyId = company.id;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());
      const email = generateTestEmail();

      const result = await caller.auth.register({
        email,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
        companyId: testCompanyId,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.user).toMatchObject({
        email: email.toLowerCase(),
        firstName: 'Test',
        lastName: 'User',
        role: 'salesperson',
      });
    });

    it('should reject duplicate email registration', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());
      const email = generateTestEmail();

      // First registration
      await caller.auth.register({
        email,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
        companyId: testCompanyId,
      });

      // Duplicate registration should fail
      await expect(
        caller.auth.register({
          email,
          password: testPassword,
          firstName: 'Another',
          lastName: 'User',
          companyId: testCompanyId,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject registration with invalid company ID', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.auth.register({
          email: generateTestEmail(),
          password: testPassword,
          firstName: 'Test',
          lastName: 'User',
          companyId: '00000000-0000-0000-0000-000000000000',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject weak passwords', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.auth.register({
          email: generateTestEmail(),
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
          companyId: testCompanyId,
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    const loginEmail = `login-test-${Date.now()}@example.com`;

    beforeAll(async () => {
      // Create a user for login tests
      const caller = createTestCaller(createUnauthenticatedContext());
      await caller.auth.register({
        email: loginEmail,
        password: testPassword,
        firstName: 'Login',
        lastName: 'Test',
        companyId: testCompanyId,
      });
    });

    it('should login successfully with correct credentials', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      const result = await caller.auth.login({
        email: loginEmail,
        password: testPassword,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(loginEmail.toLowerCase());
    });

    it('should reject login with wrong password', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.auth.login({
          email: loginEmail,
          password: 'WrongPassword123',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should reject login with non-existent email', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.auth.login({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should normalize email to lowercase', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      const result = await caller.auth.login({
        email: loginEmail.toUpperCase(),
        password: testPassword,
      });

      expect(result.user.email).toBe(loginEmail.toLowerCase());
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());
      const email = generateTestEmail();

      // Register to get initial tokens
      const registerResult = await caller.auth.register({
        email,
        password: testPassword,
        firstName: 'Refresh',
        lastName: 'Test',
        companyId: testCompanyId,
      });

      // Wait a moment to ensure different iat (issued at) timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Refresh the token
      const refreshResult = await caller.auth.refresh({
        refreshToken: registerResult.refreshToken,
      });

      expect(refreshResult).toHaveProperty('accessToken');
      expect(refreshResult).toHaveProperty('refreshToken');
      // Tokens should be different due to different iat timestamp
      expect(refreshResult.accessToken).not.toBe(registerResult.accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());

      await expect(
        caller.auth.refresh({
          refreshToken: 'invalid-token',
        })
      ).rejects.toThrow();
    });
  });
});
