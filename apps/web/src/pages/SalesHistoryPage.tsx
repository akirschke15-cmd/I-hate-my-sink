import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';

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
type FilterTab = 'all' | 'accepted' | 'pending' | 'rejected';

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

export function SalesHistoryPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Fetch all quotes (API already filters by user role)
  const { data, isLoading, isError, error } = trpc.quote.list.useQuery({
    limit: 100,
  });

  // Filter quotes based on active tab
  const filteredQuotes = useMemo(() => {
    if (!data?.items) return [];

    switch (activeTab) {
      case 'accepted':
        return data.items.filter((q: QuoteListItem) => q.status === 'accepted');
      case 'pending':
        return data.items.filter((q: QuoteListItem) =>
          ['draft', 'sent', 'viewed'].includes(q.status)
        );
      case 'rejected':
        return data.items.filter((q: QuoteListItem) => q.status === 'rejected');
      default:
        return data.items;
    }
  }, [data?.items, activeTab]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!data?.items) {
      return {
        totalQuotes: 0,
        acceptedQuotes: 0,
        totalValue: 0,
        conversionRate: 0,
      };
    }

    const totalQuotes = data.items.length;
    const acceptedQuotes = data.items.filter((q: QuoteListItem) => q.status === 'accepted').length;
    const totalValue = data.items
      .filter((q: QuoteListItem) => q.status === 'accepted')
      .reduce((sum: number, q: QuoteListItem) => sum + parseFloat(q.total), 0);
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;

    return {
      totalQuotes,
      acceptedQuotes,
      totalValue,
      conversionRate,
    };
  }, [data?.items]);

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

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
  ];

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
                My Sales History
              </h1>
              <p className="text-sm text-gray-500">Track your quotes and performance</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Summary Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Quotes</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalQuotes}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Accepted</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.acceptedQuotes}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatPrice(stats.totalValue.toString())}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.conversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.id !== 'all' && (
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {tab.id === 'accepted'
                      ? stats.acceptedQuotes
                      : tab.id === 'pending'
                      ? data?.items.filter((q: QuoteListItem) => ['draft', 'sent', 'viewed'].includes(q.status)).length || 0
                      : data?.items.filter((q: QuoteListItem) => q.status === 'rejected').length || 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Failed to load quotes</p>
            <p className="text-sm">{error?.message || 'Please try again later'}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : filteredQuotes.length === 0 ? (
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
              {activeTab === 'all'
                ? 'Get started by creating your first quote.'
                : `No ${activeTab} quotes found.`}
            </p>
            <Link to="/quotes/new" className="mt-4 inline-block">
              <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                Create Quote
              </button>
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
                    Date
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredQuotes.map((quote: QuoteListItem) => (
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
      </main>
    </div>
  );
}
