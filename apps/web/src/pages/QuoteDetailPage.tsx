import { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { trpc } from '../lib/trpc';
import { Button, Input, Select } from '../components/ui';
import { SignatureCanvas } from '../components/SignatureCanvas';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
};

const LINE_ITEM_TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'other', label: 'Other' },
];

type LineItemType = 'product' | 'labor' | 'material' | 'other';
type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

interface LineItem {
  id: string;
  type: LineItemType;
  name: string;
  description: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  discountPercent: string;
  lineTotal: string;
  sortOrder: number;
  sinkId: string | null;
}

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [showAddItem, setShowAddItem] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [newItemType, setNewItemType] = useState<LineItemType>('product');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnitPrice, setNewItemUnitPrice] = useState(0);
  const [newItemDiscountPercent, setNewItemDiscountPercent] = useState(0);

  const { data: quote, isLoading, error } = trpc.quote.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const updateStatus = trpc.quote.updateStatus.useMutation({
    onSuccess: () => {
      utils.quote.get.invalidate({ id: id! });
    },
  });

  const saveSignature = trpc.quote.saveSignature.useMutation({
    onSuccess: () => {
      utils.quote.get.invalidate({ id: id! });
      setShowSignature(false);
    },
  });

  const addLineItem = trpc.quote.addLineItem.useMutation({
    onSuccess: () => {
      utils.quote.get.invalidate({ id: id! });
      setShowAddItem(false);
      resetNewItemForm();
    },
  });

  const deleteLineItem = trpc.quote.deleteLineItem.useMutation({
    onSuccess: () => {
      utils.quote.get.invalidate({ id: id! });
    },
  });

  const deleteQuote = trpc.quote.delete.useMutation({
    onSuccess: () => {
      // Invalidate the quotes list so it refetches
      utils.quote.list.invalidate();
      navigate('/quotes');
    },
  });

  const emailQuote = trpc.quote.emailQuote.useMutation({
    onSuccess: () => {
      utils.quote.get.invalidate({ id: id! });
      toast.success('Quote sent successfully!');
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  const createWorkizJob = trpc.quote.createWorkizJob.useMutation({
    onSuccess: (data: { success: boolean; jobId?: string; jobUrl?: string }) => {
      utils.quote.get.invalidate({ id: id! });
      if (data.jobUrl) {
        window.open(data.jobUrl, '_blank');
      }
      toast.success('Workiz job created successfully!');
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create Workiz job: ${error.message}`);
    },
  });

  const resetNewItemForm = () => {
    setNewItemType('product');
    setNewItemName('');
    setNewItemDescription('');
    setNewItemSku('');
    setNewItemQuantity(1);
    setNewItemUnitPrice(0);
    setNewItemDiscountPercent(0);
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAddLineItem = () => {
    if (!newItemName || newItemUnitPrice <= 0 || !id) return;

    addLineItem.mutate({
      quoteId: id,
      type: newItemType,
      name: newItemName,
      description: newItemDescription || undefined,
      sku: newItemSku || undefined,
      quantity: newItemQuantity,
      unitPrice: newItemUnitPrice,
      discountPercent: newItemDiscountPercent,
    });
  };

  const handleDeleteLineItem = (lineItemId: string) => {
    if (!id) return;
    deleteLineItem.mutate({ id: lineItemId, quoteId: id });
  };

  const handleStatusChange = (newStatus: QuoteStatus) => {
    if (!id) return;
    updateStatus.mutate({ id, status: newStatus });
  };

  const handleDelete = () => {
    if (!id) return;
    deleteQuote.mutate({ id });
  };

  const handleSaveSignature = (dataUrl: string) => {
    if (!id) return;
    saveSignature.mutate({ id, signatureDataUrl: dataUrl });
  };

  const handleEmailQuote = () => {
    if (!id) return;
    emailQuote.mutate({ id });
  };

  const handleCreateWorkizJob = () => {
    if (!id) return;
    createWorkizJob.mutate({ id });
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!id) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      toast.error('Please log in again to download the PDF.');
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3011'}/api/quotes/${id}/pdf`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quote-${quote?.quoteNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download failed:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [id, quote?.quoteNumber]);

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Invalid quote ID</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-500">Quote not found</p>
        <Link to="/quotes" className="mt-4">
          <Button>Back to Quotes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Signature Modal */}
      {showSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer Signature</h2>
            <p className="mb-4 text-sm text-gray-600">
              By signing below, the customer agrees to the quote terms and pricing.
            </p>
            <SignatureCanvas
              onSave={handleSaveSignature}
              onCancel={() => setShowSignature(false)}
            />
            {saveSignature.isPending && (
              <div className="mt-4 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                <span className="ml-2 text-sm text-gray-600">Saving signature...</span>
              </div>
            )}
          </div>
        </div>
      )}

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
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quote.quoteNumber}</h1>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[quote.status]}`}
              >
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
            >
              <svg
                className="-ml-1 mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </Button>
            {quote.customer?.email && quote.status === 'draft' && (
              <Button
                onClick={handleEmailQuote}
                isLoading={emailQuote.isPending}
              >
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email Quote
              </Button>
            )}
            {quote.status === 'draft' && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange('sent')}
                isLoading={updateStatus.isPending}
              >
                Mark as Sent
              </Button>
            )}
            {(quote.status === 'sent' || quote.status === 'viewed') && (
              <>
                <Button
                  onClick={() => setShowSignature(true)}
                >
                  Capture Signature
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('rejected')}
                  isLoading={updateStatus.isPending}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  Mark Rejected
                </Button>
              </>
            )}
            {quote.status === 'accepted' && !quote.workizJobId && (
              <Button
                variant="secondary"
                onClick={handleCreateWorkizJob}
                isLoading={createWorkizJob.isPending}
              >
                Create Workiz Job
              </Button>
            )}
            {quote.workizJobUrl && (
              <a
                href={quote.workizJobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View in Workiz
              </a>
            )}
            <Button
              variant="outline"
              onClick={handleDelete}
              isLoading={deleteQuote.isPending}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quote Info */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Quote Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Customer</dt>
                  <dd className="text-gray-900">
                    {quote.customer ? (
                      <Link
                        to={`/customers/${quote.customer.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        {quote.customer.firstName} {quote.customer.lastName}
                      </Link>
                    ) : (
                      'Unknown'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Created</dt>
                  <dd className="text-gray-900">{formatDate(quote.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Valid Until</dt>
                  <dd className="text-gray-900">{formatDate(quote.validUntil)}</dd>
                </div>
                {quote.signedAt && (
                  <div>
                    <dt className="text-sm text-gray-500">Signed</dt>
                    <dd className="text-gray-900">{formatDate(quote.signedAt)}</dd>
                  </div>
                )}
                {quote.emailedAt && (
                  <div>
                    <dt className="text-sm text-gray-500">Last Emailed</dt>
                    <dd className="text-gray-900">
                      {formatDate(quote.emailedAt)}
                      {quote.emailCount > 1 && ` (${quote.emailCount} times)`}
                    </dd>
                  </div>
                )}
                {quote.workizJobId && (
                  <div>
                    <dt className="text-sm text-gray-500">Workiz Job</dt>
                    <dd className="text-gray-900">
                      {quote.workizJobUrl ? (
                        <a
                          href={quote.workizJobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          {quote.workizJobId}
                        </a>
                      ) : (
                        quote.workizJobId
                      )}
                    </dd>
                  </div>
                )}
                {quote.measurement && (
                  <div>
                    <dt className="text-sm text-gray-500">Measurement</dt>
                    <dd className="text-gray-900">
                      <Link
                        to={`/measurements/${quote.measurement.id}/match`}
                        className="text-primary-600 hover:underline"
                      >
                        {quote.measurement.location || 'Measurement'} ({quote.measurement.cabinetWidthInches}&quot; x {quote.measurement.cabinetDepthInches}&quot;)
                      </Link>
                    </dd>
                  </div>
                )}
                {quote.notes && (
                  <div>
                    <dt className="text-sm text-gray-500">Notes</dt>
                    <dd className="whitespace-pre-wrap text-gray-900">{quote.notes}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Signature Card */}
            {quote.signatureUrl && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Customer Signature</h2>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <img
                    src={quote.signatureUrl}
                    alt="Customer signature"
                    className="h-auto w-full"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Signed on {formatDate(quote.signedAt)}
                </p>
              </div>
            )}

            {/* Totals Card */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-gray-200 pb-3 font-semibold text-gray-900">Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(quote.subtotal)}</span>
                </div>
                {parseFloat(quote.discountAmount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(quote.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({(parseFloat(quote.taxRate) * 100).toFixed(2)}%)</span>
                  <span>{formatPrice(quote.taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(quote.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h2 className="font-semibold text-gray-900">Line Items</h2>
                {quote.status === 'draft' && (
                  <Button size="sm" variant="secondary" onClick={() => setShowAddItem(true)}>
                    Add Item
                  </Button>
                )}
              </div>

              {quote.lineItems.length === 0 ? (
                <p className="py-8 text-center text-gray-500">No line items</p>
              ) : (
                <div className="space-y-3">
                  {quote.lineItems.map((item: LineItem) => (
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
                          {parseFloat(item.discountPercent) > 0 && (
                            <span className="ml-2 text-green-600">(-{item.discountPercent}%)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-900">{formatPrice(item.lineTotal)}</span>
                        {quote.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteLineItem(item.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
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
                    <Button size="sm" onClick={handleAddLineItem} isLoading={addLineItem.isPending}>
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
          </div>
        </div>
      </main>
    </div>
  );
}
