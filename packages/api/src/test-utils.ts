import { appRouter, type AppRouter } from './index';
import type { Context } from './trpc';

/**
 * Create a test caller for the tRPC router
 */
export function createTestCaller(ctx: Context): ReturnType<AppRouter['createCaller']> {
  return appRouter.createCaller(ctx);
}

/**
 * Create an unauthenticated context for testing public procedures
 */
export function createUnauthenticatedContext(): Context {
  return {
    user: null,
  };
}

/**
 * Create an authenticated context for testing protected procedures
 * Note: userId must be a valid UUID for database operations
 */
export function createAuthenticatedContext(overrides?: Partial<Context['user']>): Context {
  return {
    user: {
      userId: overrides?.userId ?? '00000000-0000-0000-0000-000000000001',
      email: overrides?.email ?? 'test@example.com',
      role: overrides?.role ?? 'salesperson',
      companyId: overrides?.companyId ?? '00000000-0000-0000-0000-000000000000',
    },
  };
}

/**
 * Generate a unique email for testing
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}
