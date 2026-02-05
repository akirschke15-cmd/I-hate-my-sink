import { db } from '@ihms/db';
import { quotes, quoteLineItems } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';

// Type for database or transaction
type DbOrTx = typeof db;

// Helper function to generate quote number
export function generateQuoteNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `Q${year}${month}-${random}`;
}

// Helper function to calculate line item total
export function calculateLineTotal(quantity: number, unitPrice: number, discountPercent: number): number {
  const subtotal = quantity * unitPrice;
  const discount = subtotal * (discountPercent / 100);
  return Math.round((subtotal - discount) * 100) / 100;
}

// Helper function to recalculate quote totals
// Accepts optional transaction parameter for atomic operations
export async function recalculateQuoteTotals(
  quoteId: string,
  taxRate: number,
  discountAmount: number,
  dbOrTx?: DbOrTx
) {
  const database = dbOrTx ?? db;

  const lineItems = await database
    .select({ lineTotal: quoteLineItems.lineTotal })
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quoteId));

  const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
  // Total uses taxableAmount (clamped) to ensure non-negative totals
  const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

  await database
    .update(quotes)
    .set({
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      total: total.toString(),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  return { subtotal, taxAmount, total };
}
