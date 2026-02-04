import { pgTable, uuid, varchar, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { users } from './users';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: jsonb('address').$type<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }>(),
  notes: text('notes'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
