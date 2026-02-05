import { describe, it, expect, beforeAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from '@ihms/db';
import { companies, users } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';
import {
  createTestCaller,
  createAuthenticatedContext,
  createUnauthenticatedContext,
  generateTestEmail,
} from '../test-utils';

describe('User Router', () => {
  let testCompanyId: string;
  let adminUserId: string;
  const testPassword = 'TestPass123';

  beforeAll(async () => {
    // Get or create a test company
    let company = await db.query.companies.findFirst({
      where: eq(companies.slug, 'test-company-user'),
    });

    if (!company) {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: 'Test Company User',
          slug: 'test-company-user',
        })
        .returning();
      company = newCompany;
    }

    testCompanyId = company.id;

    // Create an admin user for testing
    const caller = createTestCaller(createUnauthenticatedContext());
    const adminEmail = generateTestEmail();
    await caller.auth.register({
      email: adminEmail,
      password: testPassword,
      firstName: 'Admin',
      lastName: 'User',
      companyId: testCompanyId,
    });

    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, adminEmail.toLowerCase()),
    });

    if (adminUser) {
      // Update user to admin role
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, adminUser.id));
      adminUserId = adminUser.id;
    }
  });

  describe('unlockAccount', () => {
    it('should unlock a locked user account as admin', async () => {
      const unauthCaller = createTestCaller(createUnauthenticatedContext());
      const testEmail = generateTestEmail();

      // Create test user
      await unauthCaller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'Locked',
        lastName: 'User',
        companyId: testCompanyId,
      });

      // Lock the account with 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await unauthCaller.auth.login({
            email: testEmail,
            password: 'WrongPassword123',
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify account is locked
      try {
        await unauthCaller.auth.login({
          email: testEmail,
          password: testPassword,
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.message).toContain('locked');
        }
      }

      // Get the locked user
      const lockedUser = await db.query.users.findFirst({
        where: eq(users.email, testEmail.toLowerCase()),
      });

      expect(lockedUser).toBeTruthy();
      expect(lockedUser?.lockedUntil).toBeTruthy();

      // Admin unlocks the account
      const adminCaller = createTestCaller(
        createAuthenticatedContext({
          userId: adminUserId,
          companyId: testCompanyId,
          role: 'admin',
        })
      );

      const unlockResult = await adminCaller.user.unlockAccount({
        userId: lockedUser!.id,
      });

      expect(unlockResult.failedLoginAttempts).toBe(0);
      expect(unlockResult.lockedUntil).toBeNull();

      // Should be able to login now
      const loginResult = await unauthCaller.auth.login({
        email: testEmail,
        password: testPassword,
      });

      expect(loginResult).toHaveProperty('accessToken');
    });

    it('should prevent non-admin from unlocking accounts', async () => {
      const testEmail = generateTestEmail();
      const salesEmail = generateTestEmail();

      // Create admin caller
      const unauthCaller = createTestCaller(createUnauthenticatedContext());

      // Create test user to lock
      await unauthCaller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
        companyId: testCompanyId,
      });

      // Create salesperson user
      await unauthCaller.auth.register({
        email: salesEmail,
        password: testPassword,
        firstName: 'Sales',
        lastName: 'Person',
        companyId: testCompanyId,
      });

      const salesUser = await db.query.users.findFirst({
        where: eq(users.email, salesEmail.toLowerCase()),
      });

      const testUser = await db.query.users.findFirst({
        where: eq(users.email, testEmail.toLowerCase()),
      });

      // Try to unlock as salesperson (should fail)
      const salesCaller = createTestCaller(
        createAuthenticatedContext({
          userId: salesUser!.id,
          companyId: testCompanyId,
          role: 'salesperson',
        })
      );

      await expect(
        salesCaller.user.unlockAccount({
          userId: testUser!.id,
        })
      ).rejects.toThrow();
    });

    it('should not allow unlocking users from different companies', async () => {
      const unauthCaller = createTestCaller(createUnauthenticatedContext());

      // Create another company
      const [otherCompany] = await db
        .insert(companies)
        .values({
          name: 'Other Company',
          slug: `other-company-${Date.now()}`,
        })
        .returning();

      // Create user in other company
      const otherEmail = generateTestEmail();
      await unauthCaller.auth.register({
        email: otherEmail,
        password: testPassword,
        firstName: 'Other',
        lastName: 'User',
        companyId: otherCompany.id,
      });

      const otherUser = await db.query.users.findFirst({
        where: eq(users.email, otherEmail.toLowerCase()),
      });

      // Try to unlock as admin from different company
      const adminCaller = createTestCaller(
        createAuthenticatedContext({
          userId: adminUserId,
          companyId: testCompanyId,
          role: 'admin',
        })
      );

      await expect(
        adminCaller.user.unlockAccount({
          userId: otherUser!.id,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('list', () => {
    it('should include lockout information in user list', async () => {
      const unauthCaller = createTestCaller(createUnauthenticatedContext());
      const testEmail = generateTestEmail();

      // Create test user
      await unauthCaller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'List',
        lastName: 'Test',
        companyId: testCompanyId,
      });

      // Lock the account
      for (let i = 0; i < 5; i++) {
        try {
          await unauthCaller.auth.login({
            email: testEmail,
            password: 'WrongPassword123',
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Admin lists users
      const adminCaller = createTestCaller(
        createAuthenticatedContext({
          userId: adminUserId,
          companyId: testCompanyId,
          role: 'admin',
        })
      );

      const userList = await adminCaller.user.list({});

      // Find the locked user in the list
      const lockedUser = userList.find((u) => u.email === testEmail.toLowerCase());

      expect(lockedUser).toBeTruthy();
      expect(lockedUser?.failedLoginAttempts).toBeGreaterThanOrEqual(5);
      expect(lockedUser?.lockedUntil).toBeTruthy();
    });
  });
});
