import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { quotes } from './quotes';
import { users } from './users';

export const emailStatusEnum = pgEnum('email_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
]);

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  sentById: uuid('sent_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  subject: varchar('subject', { length: 500 }).notNull(),
  status: emailStatusEnum('status').notNull().default('pending'),
  resendMessageId: varchar('resend_message_id', { length: 100 }),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
