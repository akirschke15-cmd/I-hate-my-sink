import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum, integer } from 'drizzle-orm/pg-core';
import { companies } from './companies';

export const userRoleEnum = pgEnum('user_role', ['admin', 'salesperson']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('salesperson'),
  phone: varchar('phone', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lastFailedLoginAt: timestamp('last_failed_login_at', { withTimezone: true }),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
