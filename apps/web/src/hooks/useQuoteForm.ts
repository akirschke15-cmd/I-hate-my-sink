import { useState } from 'react';
import { LineItem } from './useQuoteCalculations';

interface QuoteFormData {
  customerId: string;
  taxRate: number;
  discountAmount: number;
  validUntil: string;
  notes: string;
}

interface QuoteFormValidation {
  validateQuote: (lineItems: LineItem[], subtotal: number) => boolean;
  errors: Record<string, string>;
  clearError: (field: string) => void;
}

export function useQuoteForm(
  initialData?: Partial<QuoteFormData>
): QuoteFormData & QuoteFormValidation & {
  setCustomerId: (id: string) => void;
  setTaxRate: (rate: number) => void;
  setDiscountAmount: (amount: number) => void;
  setValidUntil: (date: string) => void;
  setNotes: (notes: string) => void;
} {
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [taxRate, setTaxRate] = useState(initialData?.taxRate || 8.25);
  const [discountAmount, setDiscountAmount] = useState(initialData?.discountAmount || 0);
  const [validUntil, setValidUntil] = useState(initialData?.validUntil || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateQuote = (lineItems: LineItem[], subtotal: number): boolean => {
    const quoteErrors: Record<string, string> = {};

    if (!customerId) {
      quoteErrors.customer = 'Please select a customer';
    }

    if (lineItems.length === 0) {
      quoteErrors.lineItems = 'Add at least one line item to the quote';
    }

    if (taxRate < 0 || taxRate > 100) {
      quoteErrors.taxRate = 'Tax rate must be between 0 and 100';
    }

    if (discountAmount < 0) {
      quoteErrors.discountAmount = 'Discount cannot be negative';
    }

    if (discountAmount > subtotal) {
      quoteErrors.discountAmount = 'Discount cannot exceed subtotal';
    }

    setErrors(quoteErrors);
    return Object.keys(quoteErrors).length === 0;
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return {
    customerId,
    taxRate,
    discountAmount,
    validUntil,
    notes,
    setCustomerId,
    setTaxRate,
    setDiscountAmount,
    setValidUntil,
    setNotes,
    validateQuote,
    errors,
    clearError,
  };
}
