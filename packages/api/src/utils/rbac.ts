import type { UserRole } from '@ihms/shared';

/**
 * Role-Based Access Control (RBAC) Utilities
 *
 * @example
 * ```typescript
 * // Check user role
 * if (isAdmin(ctx.user.role)) {
 *   // Admin-only logic
 * }
 *
 * // Filter queries based on role
 * const conditions = [eq(table.companyId, ctx.user.companyId)];
 * if (isSalesperson(ctx.user.role)) {
 *   conditions.push(eq(table.createdById, ctx.user.userId));
 * }
 *
 * // Get optional filter for queries
 * const userFilter = getUserFilterForRole(ctx.user.role, ctx.user.userId);
 * if (userFilter) {
 *   conditions.push(eq(table.userId, userFilter));
 * }
 * ```
 */

/**
 * Check if user has admin role
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Check if user has salesperson role
 */
export function isSalesperson(userRole: UserRole): boolean {
  return userRole === 'salesperson';
}

/**
 * Get user filter condition for queries based on role
 * Returns userId if salesperson (should only see their own data)
 * Returns undefined if admin (can see all company data)
 */
export function getUserFilterForRole(userRole: UserRole, userId: string): string | undefined {
  if (isSalesperson(userRole)) {
    return userId;
  }
  // Admin can see all data in their company
  return undefined;
}
