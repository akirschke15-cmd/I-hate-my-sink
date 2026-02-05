import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui';
import {
  CustomerSelection,
  LineItemsTable,
  AddLineItemForm,
  QuoteDetails,
  QuoteSummary,
} from '../components/quote';
import { useQuoteForm } from '../hooks/useQuoteForm';
import { useLineItems, LineItem as LineItemType } from '../hooks/useLineItems';
import { useQuoteCalculations } from '../hooks/useQuoteCalculations';

export function NewQuotePage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [searchParams] = useSearchParams();
  const measurementId = searchParams.get('measurementId') || undefined;
  const sinkId = searchParams.get('sinkId') || undefined;

  // Custom hooks for form management
  const quoteForm = useQuoteForm();
  const lineItemsManager = useLineItems();
  const calculations = useQuoteCalculations(
    lineItemsManager.lineItems,
    quoteForm.taxRate,
    quoteForm.discountAmount
  );

  // Fetch customers
  const { data: customersData } = trpc.customer.list.useQuery({ limit: 100 });

  // Fetch sink if sinkId provided
  const { data: sink } = trpc.sink.getById.useQuery({ id: sinkId! }, { enabled: !!sinkId });

  // Fetch measurement if measurementId provided
  const { data: measurement } = trpc.measurement.get.useQuery(
    { id: measurementId! },
    { enabled: !!measurementId }
  );

  // Create quote mutation
  const createQuote = trpc.quote.create.useMutation({
    onSuccess: (quote: { id: string } | undefined) => {
      utils.quote.list.invalidate();
      if (quote) {
        navigate(`/quotes/${quote.id}`);
      }
    },
  });

  // Pre-populate with sink if provided
  useEffect(() => {
    if (sink && lineItemsManager.lineItems.length === 0) {
      const sinkLineItem: LineItemType = {
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
      const items: LineItemType[] = [sinkLineItem];

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

      lineItemsManager.setLineItems(items);
    }
  }, [sink, lineItemsManager.lineItems.length]);

  // Pre-select customer if measurement has one
  useEffect(() => {
    if (measurement && !quoteForm.customerId) {
      quoteForm.setCustomerId(measurement.customerId);
    }
  }, [measurement, quoteForm.customerId]);

  const handleSubmit = () => {
    if (!quoteForm.validateQuote(lineItemsManager.lineItems, calculations.subtotal)) {
      return;
    }

    createQuote.mutate({
      customerId: quoteForm.customerId,
      measurementId,
      taxRate: quoteForm.taxRate / 100, // Convert to decimal
      discountAmount: quoteForm.discountAmount,
      validUntil: quoteForm.validUntil ? new Date(quoteForm.validUntil).toISOString() : undefined,
      notes: quoteForm.notes || undefined,
      lineItems: lineItemsManager.lineItems.map((item) => ({
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
        <div className="space-y-6">
          {/* Customer Selection */}
          <CustomerSelection
            customerId={quoteForm.customerId}
            customers={customersData}
            measurement={measurement}
            error={quoteForm.errors.customer}
            onChange={quoteForm.setCustomerId}
            onClearError={() => quoteForm.clearError('customer')}
          />

          {/* Line Items */}
          <LineItemsTable
            lineItems={lineItemsManager.lineItems}
            error={quoteForm.errors.lineItems}
            formatPrice={calculations.formatPrice}
            onRemoveItem={lineItemsManager.removeLineItem}
            onAddClick={() => lineItemsManager.setShowAddItem(true)}
            onClearError={() => quoteForm.clearError('lineItems')}
          />

          {/* Add Item Form */}
          {lineItemsManager.showAddItem && (
            <AddLineItemForm
              formData={lineItemsManager.formData}
              errors={lineItemsManager.errors}
              onFieldChange={lineItemsManager.updateFormField}
              onAdd={lineItemsManager.addLineItem}
              onCancel={() => {
                lineItemsManager.setShowAddItem(false);
                lineItemsManager.resetForm();
              }}
            />
          )}

          {/* Quote Details */}
          <QuoteDetails
            taxRate={quoteForm.taxRate}
            discountAmount={quoteForm.discountAmount}
            validUntil={quoteForm.validUntil}
            notes={quoteForm.notes}
            errors={{
              taxRate: quoteForm.errors.taxRate,
              discountAmount: quoteForm.errors.discountAmount,
            }}
            onTaxRateChange={quoteForm.setTaxRate}
            onDiscountChange={quoteForm.setDiscountAmount}
            onValidUntilChange={quoteForm.setValidUntil}
            onNotesChange={quoteForm.setNotes}
            onClearError={quoteForm.clearError}
          />

          {/* Summary */}
          <QuoteSummary
            subtotal={calculations.subtotal}
            discountAmount={quoteForm.discountAmount}
            taxRate={quoteForm.taxRate}
            taxAmount={calculations.taxAmount}
            total={calculations.total}
            formatPrice={calculations.formatPrice}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link to="/quotes">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              isLoading={createQuote.isPending}
              disabled={
                !quoteForm.customerId ||
                lineItemsManager.lineItems.length === 0 ||
                Object.keys(quoteForm.errors).length > 0
              }
            >
              Create Quote
            </Button>
          </div>

          {createQuote.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {createQuote.error.message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
