import { pgTable, uuid, varchar, text, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
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
  // Validity
  validUntil: timestamp('valid_until', { withTimezone: true }),
  notes: text('notes'),
  // Offline sync support
  localId: varchar('local_id', { length: 100 }),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
