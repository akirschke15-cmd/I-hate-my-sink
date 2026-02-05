import { useMemo } from 'react';

export interface LineItem {
  id: string;
  sinkId?: string;
  type: 'product' | 'labor' | 'material' | 'other';
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

interface QuoteCalculations {
  subtotal: number;
  taxAmount: number;
  total: number;
  formatPrice: (price: number) => string;
}

export function useQuoteCalculations(
  lineItems: LineItem[],
  taxRate: number,
  discountAmount: number
): QuoteCalculations {
  const calculations = useMemo(() => {
    const sub = lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
      return sum + lineTotal;
    }, 0);

    const taxable = Math.max(0, sub - discountAmount);
    const tax = taxable * (taxRate / 100);
    const tot = sub - discountAmount + tax;

    return {
      subtotal: Math.round(sub * 100) / 100,
      taxAmount: Math.round(tax * 100) / 100,
      total: Math.round(tot * 100) / 100,
    };
  }, [lineItems, taxRate, discountAmount]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return {
    ...calculations,
    formatPrice,
  };
}
