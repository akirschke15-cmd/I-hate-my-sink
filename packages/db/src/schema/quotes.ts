import { pgTable, uuid, varchar, text, timestamp, decimal, pgEnum, integer, index } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { customers } from './customers';
import { users } from './users';
import { measurements } from './measurements';

export const quoteStatusEnum = pgEnum('quote_status', [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
]);

export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  measurementId: uuid('measurement_id').references(() => measurements.id, { onDelete: 'set null' }),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  // Quote details
  quoteNumber: varchar('quote_number', { length: 50 }).notNull().unique(),
  status: quoteStatusEnum('status').notNull().default('draft'),
  // Totals (calculated from line items)
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 4 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull().default('0'),
  // Customer acceptance
  signatureUrl: text('signature_url'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  // Email tracking
  emailedAt: timestamp('emailed_at', { withTimezone: true }),
  emailCount: integer('email_count').notNull().default(0),
  // Workiz integration
  workizJobId: varchar('workiz_job_id', { length: 100 }),
  workizJobUrl: text('workiz_job_url'),
  workizSyncedAt: timestamp('workiz_synced_at', { withTimezone: true }),
  // Validity
  validUntil: timestamp('valid_until', { withTimezone: true }),
  notes: text('notes'),
  // Offline sync support
  localId: varchar('local_id', { length: 100 }),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('quotes_company_id_idx').on(table.companyId),
  customerIdIdx: index('quotes_customer_id_idx').on(table.customerId),
  createdByIdIdx: index('quotes_created_by_id_idx').on(table.createdById),
  statusIdx: index('quotes_status_idx').on(table.status),
  createdAtIdx: index('quotes_created_at_idx').on(table.createdAt),
  companyStatusIdx: index('quotes_company_status_idx').on(table.companyId, table.status),
}));

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
