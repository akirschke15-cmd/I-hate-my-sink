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

  describe('account lockout', () => {
    const lockoutEmail = `lockout-test-${Date.now()}@example.com`;

    beforeAll(async () => {
      // Create a user for lockout tests
      const caller = createTestCaller(createUnauthenticatedContext());
      await caller.auth.register({
        email: lockoutEmail,
        password: testPassword,
        firstName: 'Lockout',
        lastName: 'Test',
        companyId: testCompanyId,
      });
    });

    it('should increment failed login attempts on wrong password', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());
      const testEmail = generateTestEmail();

      // Create test user
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'Fail',
        lastName: 'Counter',
        companyId: testCompanyId,
      });

      // Attempt login with wrong password
      try {
        await caller.auth.login({
          email: testEmail,
          password: 'WrongPassword123',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.message).toContain('4 attempt');
        }
      }
    });

    it('should lock account after 5 failed attempts', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());
      const testEmail = generateTestEmail();

      // Create test user
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'Lock',
        lastName: 'Test',
        companyId: testCompanyId,
      });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        try {
          await caller.auth.login({
            email: testEmail,
            password: 'WrongPassword123',
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // 5th attempt should lock the account
      try {
        await caller.auth.login({
          email: testEmail,
          password: 'WrongPassword123',
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe('FORBIDDEN');
          expect(error.message).toContain('locked');
        }
      }
    });

    it('should prevent login even with correct password when locked', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());
      const testEmail = generateTestEmail();

      // Create test user
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'Lock',
        lastName: 'Verify',
        companyId: testCompanyId,
      });

      // Lock the account with 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await caller.auth.login({
            email: testEmail,
            password: 'WrongPassword123',
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Try with correct password while locked
      try {
        await caller.auth.login({
          email: testEmail,
          password: testPassword,
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe('FORBIDDEN');
          expect(error.message).toContain('locked');
        }
      }
    });

    it('should reset failed attempts on successful login', async () => {
      const caller = createTestCaller(createUnauthenticatedContext());
      const testEmail = generateTestEmail();

      // Create test user
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'Reset',
        lastName: 'Test',
        companyId: testCompanyId,
      });

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await caller.auth.login({
            email: testEmail,
            password: 'WrongPassword123',
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Successful login should reset counter
      const result = await caller.auth.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result).toHaveProperty('accessToken');

      // Should allow another 5 attempts before locking again
      // Do 3 more failed attempts (counter now at 3)
      for (let i = 0; i < 3; i++) {
        try {
          await caller.auth.login({
            email: testEmail,
            password: 'WrongPassword123',
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // 4th attempt should not lock (2 attempts remaining)
      try {
        await caller.auth.login({
          email: testEmail,
          password: 'WrongPassword123',
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).toBe('UNAUTHORIZED');
          expect(error.message).toContain('attempt'); // 1 attempt remaining
        }
      }
    });
  });
});
