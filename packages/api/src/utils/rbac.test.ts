import { describe, it, expect } from 'vitest';
import { isAdmin, isSalesperson, getUserFilterForRole } from './rbac';

describe('RBAC Utilities', () => {
  describe('isAdmin', () => {
    it('returns true for admin role', () => {
      expect(isAdmin('admin')).toBe(true);
    });

    it('returns false for salesperson role', () => {
      expect(isAdmin('salesperson')).toBe(false);
    });
  });

  describe('isSalesperson', () => {
    it('returns true for salesperson role', () => {
      expect(isSalesperson('salesperson')).toBe(true);
    });

    it('returns false for admin role', () => {
      expect(isSalesperson('admin')).toBe(false);
    });
  });

  describe('getUserFilterForRole', () => {
    it('returns userId for salesperson role', () => {
      const userId = 'user-123';
      expect(getUserFilterForRole('salesperson', userId)).toBe(userId);
    });

    it('returns undefined for admin role', () => {
      const userId = 'user-123';
      expect(getUserFilterForRole('admin', userId)).toBeUndefined();
    });
  });
});
