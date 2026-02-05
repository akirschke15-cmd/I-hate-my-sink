import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
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
}, (table) => ({
  companyIdIdx: index('customers_company_id_idx').on(table.companyId),
  assignedUserIdIdx: index('customers_assigned_user_id_idx').on(table.assignedUserId),
  emailIdx: index('customers_email_idx').on(table.email),
  createdAtIdx: index('customers_created_at_idx').on(table.createdAt),
  companyAssignedUserIdx: index('customers_company_assigned_user_idx').on(table.companyId, table.assignedUserId),
}));

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
