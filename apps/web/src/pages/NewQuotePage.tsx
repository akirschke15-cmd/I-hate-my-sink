import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button, Input, Select } from '../components/ui';

const LINE_ITEM_TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'other', label: 'Other' },
];

type LineItemType = 'product' | 'labor' | 'material' | 'other';

interface LineItem {
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

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export function NewQuotePage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [searchParams] = useSearchParams();
  const measurementId = searchParams.get('measurementId') || undefined;
  const sinkId = searchParams.get('sinkId') || undefined;

  const [customerId, setCustomerId] = useState('');
  const [taxRate, setTaxRate] = useState(8.25); // Default 8.25%
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);

  // New line item form state
  const [newItemType, setNewItemType] = useState<LineItemType>('product');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnitPrice, setNewItemUnitPrice] = useState(0);
  const [newItemDiscountPercent, setNewItemDiscountPercent] = useState(0);

  // Fetch customers
  const { data: customersData } = trpc.customer.list.useQuery({ limit: 100 });

  // Fetch sink if sinkId provided
  const { data: sink } = trpc.sink.getById.useQuery(
    { id: sinkId! },
    { enabled: !!sinkId }
  );

  // Fetch measurement if measurementId provided
  const { data: measurement } = trpc.measurement.get.useQuery(
    { id: measurementId! },
    { enabled: !!measurementId }
  );

  // Create quote mutation
  const createQuote = trpc.quote.create.useMutation({
    onSuccess: (quote: { id: string } | undefined) => {
      // Invalidate the quotes list so it refetches
      utils.quote.list.invalidate();
      if (quote) {
        navigate(`/quotes/${quote.id}`);
      }
    },
  });

  // Pre-populate with sink if provided
  useEffect(() => {
    if (sink && lineItems.length === 0) {
      const sinkLineItem: LineItem = {
        id: `temp-${Date.now()}`,
        sinkId: sink.id,
        type: 'product',
        name: sink.name,
        sku: sink.sku,
        quantity: 1,
        unitPrice: parseFloat(sink.basePrice),
        discountPercent: 0,
      };

      const laborCost = parseFloat(sink.laborCost);
      const items: LineItem[] = [sinkLineItem];

      if (laborCost > 0) {
        items.push({
          id: `temp-${Date.now() + 1}`,
          type: 'labor',
          name: 'Installation Labor',
          description: `Installation for ${sink.name}`,
          quantity: 1,
          unitPrice: laborCost,
          discountPercent: 0,
        });
      }

      setLineItems(items);
    }
  }, [sink, lineItems.length]);

  // Pre-select customer if measurement has one
  useEffect(() => {
    if (measurement && !customerId) {
      setCustomerId(measurement.customerId);
    }
  }, [measurement, customerId]);

  // Calculate totals
  const { subtotal, taxAmount, total } = useMemo(() => {
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

  const handleAddLineItem = () => {
    if (!newItemName || newItemUnitPrice <= 0) return;

    const newItem: LineItem = {
      id: `temp-${Date.now()}`,
      type: newItemType,
      name: newItemName,
      description: newItemDescription || undefined,
      sku: newItemSku || undefined,
      quantity: newItemQuantity,
      unitPrice: newItemUnitPrice,
      discountPercent: newItemDiscountPercent,
    };

    setLineItems([...lineItems, newItem]);
    setShowAddItem(false);
    resetNewItemForm();
  };

  const resetNewItemForm = () => {
    setNewItemType('product');
    setNewItemName('');
    setNewItemDescription('');
    setNewItemSku('');
    setNewItemQuantity(1);
    setNewItemUnitPrice(0);
    setNewItemDiscountPercent(0);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    if (!customerId || lineItems.length === 0) return;

    createQuote.mutate({
      customerId,
      measurementId,
      taxRate: taxRate / 100, // Convert to decimal
      discountAmount,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      notes: notes || undefined,
      lineItems: lineItems.map((item) => ({
        sinkId: item.sinkId,
        type: item.type,
        name: item.name,
        description: item.description,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
      })),
    });
  };

  const customerOptions = useMemo(() => {
    if (!customersData) return [];
    return customersData.map((c: Customer) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ''}`,
    }));
  }, [customersData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/quotes" className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">New Quote</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Customer Selection */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer</h2>
          <Select
            label="Select Customer"
            options={[{ value: '', label: 'Choose a customer...' }, ...customerOptions]}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
          {measurement && (
            <p className="mt-2 text-sm text-gray-500">
              Linked to measurement: {measurement.location || 'Measurement'} ({measurement.cabinetWidthInches}&quot; x {measurement.cabinetDepthInches}&quot;)
            </p>
          )}
        </div>

        {/* Line Items */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <Button size="sm" variant="secondary" onClick={() => setShowAddItem(true)}>
              Add Item
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No line items yet. Add products, labor, or materials.
            </p>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          item.type === 'product'
                            ? 'bg-blue-100 text-blue-800'
                            : item.type === 'labor'
                              ? 'bg-green-100 text-green-800'
                              : item.type === 'material'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.type}
                      </span>
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {item.sku && <span className="text-sm text-gray-500">({item.sku})</span>}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-600">
                      {item.quantity} x {formatPrice(item.unitPrice)}
                      {item.discountPercent > 0 && (
                        <span className="ml-2 text-green-600">(-{item.discountPercent}%)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900">
                      {formatPrice(
                        item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
                      )}
                    </span>
                    <button
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Item Form */}
          {showAddItem && (
            <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-4">
              <h3 className="mb-3 font-medium text-gray-900">Add Line Item</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Type"
                  options={LINE_ITEM_TYPES}
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as LineItemType)}
                />
                <Input
                  label="Name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Item name"
                />
                <Input
                  label="SKU (optional)"
                  value={newItemSku}
                  onChange={(e) => setNewItemSku(e.target.value)}
                  placeholder="SKU"
                />
                <Input
                  label="Description (optional)"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Description"
                />
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                />
                <Input
                  label="Unit Price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={newItemUnitPrice}
                  onChange={(e) => setNewItemUnitPrice(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Discount %"
                  type="number"
                  min={0}
                  max={100}
                  value={newItemDiscountPercent}
                  onChange={(e) => setNewItemDiscountPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={handleAddLineItem}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowAddItem(false);
                    resetNewItemForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quote Details */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quote Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tax Rate (%)"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Discount Amount ($)"
              type="number"
              min={0}
              step={0.01}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the customer..."
            />
          </div>
        </div>

        {/* Totals */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax ({taxRate}%)</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link to="/quotes">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button
            onClick={handleSubmit}
            isLoading={createQuote.isPending}
            disabled={!customerId || lineItems.length === 0}
          >
            Create Quote
          </Button>
        </div>

        {createQuote.error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {createQuote.error.message}
          </div>
        )}
      </main>
    </div>
  );
}
