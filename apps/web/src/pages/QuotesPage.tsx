import { useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button, Select } from '../components/ui';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  sent: 'bg-blue-100 text-blue-800 border-blue-300',
  viewed: 'bg-purple-100 text-purple-800 border-purple-300',
  accepted: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  expired: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const STATUS_DOT_STYLES: Record<string, string> = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  viewed: 'bg-purple-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-yellow-500',
};

type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

interface QuoteListItem {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  subtotal: string;
  total: string;
  validUntil: string | null;
  createdAt: string;
  customerFirstName: string;
  customerLastName: string;
}

export function QuotesPage() {
  const [status, setStatus] = useState<QuoteStatus | ''>('');

  const { data, isLoading, error } = trpc.quote.list.useQuery({
    status: status || undefined,
    limit: 50,
  });

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="border-b border-primary-100/50 bg-white/80 shadow-soft backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-primary-400 hover:text-primary-600 transition-colors">
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Quotes
              </h1>
              <p className="text-sm text-gray-500">Manage customer quotes and proposals</p>
            </div>
          </div>
          <Link to="/quotes/new">
            <Button>New Quote</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-48">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as QuoteStatus | '')}
              placeholder="Filter by status"
              className="shadow-soft"
            />
          </div>
          {data && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-soft">
              <svg className="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-700">
                Showing <span className="font-semibold text-primary-600">{data.items.length}</span> of{' '}
                <span className="font-semibold text-primary-600">{data.total}</span> quotes
              </p>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">Failed to load quotes. Please try again.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : data?.items.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No quotes yet</h3>
            <p className="mt-2 text-gray-500">
              {status
                ? 'No quotes match this filter. Try a different status.'
                : 'Get started by creating your first quote.'}
            </p>
            <Link to="/quotes/new" className="mt-4 inline-block">
              <Button>Create Quote</Button>
            </Link>
          </div>
        ) : (
          /* Quotes Table */
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Quote #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Valid Until
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data?.items.map((quote: QuoteListItem) => (
                  <tr key={quote.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="font-semibold text-primary-600 hover:text-primary-700"
                      >
                        {quote.quoteNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-semibold text-white shadow-soft">
                          {getInitials(quote.customerFirstName, quote.customerLastName)}
                        </div>
                        <span className="text-gray-900 font-medium">
                          {quote.customerFirstName} {quote.customerLastName}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${STATUS_STYLES[quote.status]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_STYLES[quote.status]}`} />
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {formatPrice(quote.total)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {quote.validUntil ? formatDate(quote.validUntil) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More */}
        {data?.hasMore && (
          <div className="mt-6 text-center">
            <Button variant="secondary">Load More</Button>
          </div>
        )}
      </main>
    </div>
  );
}
