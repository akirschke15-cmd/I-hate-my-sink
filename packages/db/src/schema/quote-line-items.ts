import { pgTable, uuid, varchar, text, integer, decimal, pgEnum, index } from 'drizzle-orm/pg-core';
import { quotes } from './quotes';
import { sinks } from './sinks';

export const lineItemTypeEnum = pgEnum('line_item_type', ['product', 'labor', 'material', 'other']);

export const quoteLineItems = pgTable('quote_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  sinkId: uuid('sink_id').references(() => sinks.id, { onDelete: 'set null' }),
  // Line item details
  type: lineItemTypeEnum('type').notNull().default('product'),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sku: varchar('sku', { length: 100 }),
  // Pricing
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 10, scale: 2 }).notNull(),
  // Sorting
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  quoteIdIdx: index('quote_line_items_quote_id_idx').on(table.quoteId),
}));

export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type NewQuoteLineItem = typeof quoteLineItems.$inferInsert;
