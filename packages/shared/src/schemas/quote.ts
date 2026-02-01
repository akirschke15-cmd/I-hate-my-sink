import { z } from 'zod';

export const quoteStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'] as const;
export const lineItemTypes = ['product', 'labor', 'material', 'other'] as const;

export const createQuoteSchema = z.object({
  customerId: z.string().uuid(),
  measurementId: z.string().uuid().optional(),
  taxRate: z.number().min(0).max(1).default(0), // 0.0825 = 8.25%
  discountAmount: z.number().min(0).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  lineItems: z.array(z.object({
    sinkId: z.string().uuid().optional(),
    type: z.enum(lineItemTypes),
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    sku: z.string().max(100).optional(),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.number().min(0),
    discountPercent: z.number().min(0).max(100).default(0),
  })).min(1),
  localId: z.string().max(100).optional(),
});

export const updateQuoteSchema = z.object({
  id: z.string().uuid(),
  taxRate: z.number().min(0).max(1).optional(),
  discountAmount: z.number().min(0).optional(),
  validUntil: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const addLineItemSchema = z.object({
  quoteId: z.string().uuid(),
  sinkId: z.string().uuid().optional(),
  type: z.enum(lineItemTypes),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  sku: z.string().max(100).optional(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
});

export const updateLineItemSchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type AddLineItemInput = z.infer<typeof addLineItemSchema>;
export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>;
