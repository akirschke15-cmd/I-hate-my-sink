import { LineItem } from '../../hooks/useQuoteCalculations';

interface LineItemsTableProps {
  lineItems: LineItem[];
  error?: string;
  formatPrice: (price: number) => string;
  onRemoveItem: (id: string) => void;
  onAddClick: () => void;
  onClearError: () => void;
}

export function LineItemsTable({
  lineItems,
  error,
  formatPrice,
  onRemoveItem,
  onAddClick,
  onClearError,
}: LineItemsTableProps) {
  const handleAddClick = () => {
    onAddClick();
    if (error) {
      onClearError();
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-100 text-blue-800';
      case 'labor':
        return 'bg-green-100 text-green-800';
      case 'material':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
          {error && (
            <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
              <svg
                className="h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </p>
          )}
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Add Item
        </button>
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
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${getTypeStyle(item.type)}`}>
                    {item.type}
                  </span>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {item.sku && <span className="text-sm text-gray-500">({item.sku})</span>}
                </div>
                {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
                <p className="mt-1 text-sm text-gray-600">
                  {item.quantity} x {formatPrice(item.unitPrice)}
                  {item.discountPercent > 0 && (
                    <span className="ml-2 text-green-600">(-{item.discountPercent}%)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">
                  {formatPrice(item.quantity * item.unitPrice * (1 - item.discountPercent / 100))}
                </span>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label="Remove item"
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
    </div>
  );
}
