import { Input } from '../ui';

interface QuoteDetailsProps {
  taxRate: number;
  discountAmount: number;
  validUntil: string;
  notes: string;
  errors: {
    taxRate?: string;
    discountAmount?: string;
  };
  onTaxRateChange: (rate: number) => void;
  onDiscountChange: (amount: number) => void;
  onValidUntilChange: (date: string) => void;
  onNotesChange: (notes: string) => void;
  onClearError: (field: string) => void;
}

export function QuoteDetails({
  taxRate,
  discountAmount,
  validUntil,
  notes,
  errors,
  onTaxRateChange,
  onDiscountChange,
  onValidUntilChange,
  onNotesChange,
  onClearError,
}: QuoteDetailsProps) {
  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTaxRateChange(parseFloat(e.target.value) || 0);
    if (errors.taxRate) {
      onClearError('taxRate');
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDiscountChange(parseFloat(e.target.value) || 0);
    if (errors.discountAmount) {
      onClearError('discountAmount');
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Quote Details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Tax Rate (%)"
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={taxRate}
          onChange={handleTaxRateChange}
          error={errors.taxRate}
        />
        <Input
          label="Discount Amount ($)"
          type="number"
          min={0}
          step={0.01}
          value={discountAmount}
          onChange={handleDiscountChange}
          error={errors.discountAmount}
        />
        <Input
          label="Valid Until"
          type="date"
          value={validUntil}
          onChange={(e) => onValidUntilChange(e.target.value)}
        />
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Additional notes for the customer..."
        />
      </div>
    </div>
  );
}
