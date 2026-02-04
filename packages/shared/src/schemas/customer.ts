import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: addressSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: z.string().uuid(),
  version: z.number().int().positive().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
