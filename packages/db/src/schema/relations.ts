import { relations } from 'drizzle-orm';
import { quotes } from './quotes';
import { quoteLineItems } from './quote-line-items';
import { customers } from './customers';
import { measurements } from './measurements';
import { users } from './users';
import { companies } from './companies';

// Quote relations
export const quotesRelations = relations(quotes, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  measurement: one(measurements, {
    fields: [quotes.measurementId],
    references: [measurements.id],
  }),
  createdBy: one(users, {
    fields: [quotes.createdById],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [quotes.companyId],
    references: [companies.id],
  }),
  lineItems: many(quoteLineItems),
}));

// Quote line items relations
export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteLineItems.quoteId],
    references: [quotes.id],
  }),
}));

// Customer relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  assignedUser: one(users, {
    fields: [customers.assignedUserId],
    references: [users.id],
  }),
  quotes: many(quotes),
  measurements: many(measurements),
}));

// Measurement relations
export const measurementsRelations = relations(measurements, ({ one, many }) => ({
  customer: one(customers, {
    fields: [measurements.customerId],
    references: [customers.id],
  }),
  createdBy: one(users, {
    fields: [measurements.createdById],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [measurements.companyId],
    references: [companies.id],
  }),
  quotes: many(quotes),
}));
