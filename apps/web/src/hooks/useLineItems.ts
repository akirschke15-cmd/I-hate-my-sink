import { useState } from 'react';

export type LineItemType = 'product' | 'labor' | 'material' | 'other';

export interface LineItem {
  id: string;
  sinkId?: string;
  type: LineItemType;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

interface LineItemFormData {
  type: LineItemType;
  name: string;
  description: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export function useLineItems(initialItems: LineItem[] = []) {
  const [lineItems, setLineItems] = useState<LineItem[]>(initialItems);
  const [showAddItem, setShowAddItem] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New line item form state
  const [formData, setFormData] = useState<LineItemFormData>({
    type: 'product',
    name: '',
    description: '',
    sku: '',
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
  });

  const validateLineItem = (): boolean => {
    const itemErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      itemErrors.name = 'Item name is required';
    }

    if (formData.quantity < 1) {
      itemErrors.quantity = 'Quantity must be at least 1';
    }

    if (formData.unitPrice < 0) {
      itemErrors.unitPrice = 'Price cannot be negative';
    }

    if (formData.unitPrice === 0) {
      itemErrors.unitPrice = 'Price must be greater than 0';
    }

    if (formData.discountPercent < 0 || formData.discountPercent > 100) {
      itemErrors.discountPercent = 'Discount must be between 0 and 100';
    }

    setErrors(itemErrors);
    return Object.keys(itemErrors).length === 0;
  };

  const addLineItem = (): boolean => {
    if (!validateLineItem()) return false;

    const newItem: LineItem = {
      id: `temp-${Date.now()}`,
      type: formData.type,
      name: formData.name,
      description: formData.description || undefined,
      sku: formData.sku || undefined,
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      discountPercent: formData.discountPercent,
    };

    setLineItems([...lineItems, newItem]);
    setShowAddItem(false);
    resetForm();
    return true;
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const resetForm = () => {
    setFormData({
      type: 'product',
      name: '',
      description: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
    });
    setErrors({});
  };

  const updateFormField = <K extends keyof LineItemFormData>(
    field: K,
    value: LineItemFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return {
    lineItems,
    setLineItems,
    showAddItem,
    setShowAddItem,
    formData,
    updateFormField,
    errors,
    addLineItem,
    removeLineItem,
    resetForm,
  };
}
