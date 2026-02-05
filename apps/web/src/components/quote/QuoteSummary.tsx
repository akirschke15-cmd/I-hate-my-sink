interface QuoteSummaryProps {
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  formatPrice: (price: number) => string;
}

export function QuoteSummary({
  subtotal,
  discountAmount,
  taxRate,
  taxAmount,
  total,
  formatPrice,
}: QuoteSummaryProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
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
  );
}
